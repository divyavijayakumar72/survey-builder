// Cloudflare Worker for Survey API using D1
// Bind D1 as 'DB' in wrangler.toml

/**
 * D1 Schema (run this in your migration):
 *
 * CREATE TABLE IF NOT EXISTS surveys (
 *   id TEXT PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   questions TEXT NOT NULL, -- JSON string
 *   createdAt TEXT NOT NULL,
 *   updatedAt TEXT,
 *   submitted INTEGER DEFAULT 0,
 *   submittedAt TEXT
 * );
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();
    const DB = env.DB;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Helper: parse request body
    async function parseBody(req) {
      try {
        return await req.json();
      } catch {
        return null;
      }
    }

    // Validation logic (ported from server.js)
    function validateSurvey(survey) {
      if (!survey.title || typeof survey.title !== 'string' || survey.title.trim() === '') {
        return { valid: false, message: 'Survey title is required and must be a non-empty string' };
      }
      if (!survey.questions || !Array.isArray(survey.questions)) {
        return { valid: false, message: 'Questions must be an array' };
      }
      if (survey.questions.length === 0) {
        return { valid: false, message: 'Survey must have at least one question' };
      }
      for (let i = 0; i < survey.questions.length; i++) {
        const question = survey.questions[i];
        if (!question.questionText || typeof question.questionText !== 'string' || question.questionText.trim() === '') {
          return { valid: false, message: `Question ${i + 1} must have a non-empty questionText` };
        }
        if (!question.type || !['multiple-choice', 'single-select', 'free-text'].includes(question.type)) {
          return { valid: false, message: `Question ${i + 1} must have a valid type (multiple-choice, single-select, or free-text)` };
        }
        if (question.type !== 'free-text') {
          if (!question.options || !Array.isArray(question.options)) {
            return { valid: false, message: `Question ${i + 1} must have an options array for choice-based questions` };
          }
          if (question.options.length < 2) {
            return { valid: false, message: `Question ${i + 1} must have at least 2 options for choice-based questions` };
          }
          for (let j = 0; j < question.options.length; j++) {
            if (!question.options[j] || typeof question.options[j] !== 'string' || question.options[j].trim() === '') {
              return { valid: false, message: `Question ${i + 1}, Option ${j + 1} must have non-empty text` };
            }
          }
        }
        if (typeof question.required !== 'boolean') {
          return { valid: false, message: `Question ${i + 1} must have a boolean required field` };
        }
      }
      return { valid: true };
    }

    // Helper: send JSON response with CORS headers
    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Routing
    // Health check
    if (method === 'GET' && pathname === '/api/health') {
      return json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
      });
    }

    // GET /test-db - List all tables in the database
    if (method === 'GET' && pathname === '/test-db') {
      try {
        const { results } = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = results.map(row => row.name);
        return json({
          success: true,
          message: 'Database tables retrieved successfully',
          data: {
            tables: tableNames,
            count: tableNames.length,
          },
        });
      } catch (error) {
        return json({ 
          success: false, 
          message: 'Internal server error while retrieving database tables',
          error: error.message 
        }, 500);
      }
    }

    // GET /api/surveys
    if (method === 'GET' && pathname === '/api/surveys') {
      try {
        const { results } = await DB.prepare('SELECT id, title, questions, createdAt, updatedAt, submitted FROM surveys').all();
        return json({
          success: true,
          message: 'Surveys retrieved successfully',
          data: {
            surveys: results.map(s => ({
              id: s.id,
              title: s.title,
              questionCount: JSON.parse(s.questions).length,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt || s.createdAt,
              submitted: !!s.submitted,
            })),
            total: results.length,
          },
        });
      } catch (error) {
        return json({ success: false, message: 'Internal server error while retrieving surveys' }, 500);
      }
    }

    // GET /api/surveys/:id
    const surveyIdMatch = pathname.match(/^\/api\/surveys\/([^\/]+)$/);
    if (method === 'GET' && surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      try {
        const { results } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        const survey = results[0];
        survey.questions = JSON.parse(survey.questions);
        survey.submitted = !!survey.submitted;
        return json({
          success: true,
          message: 'Survey retrieved successfully',
          data: survey,
        });
      } catch (error) {
        return json({ success: false, message: 'Internal server error while retrieving survey' }, 500);
      }
    }

    // POST /api/surveys
    if (method === 'POST' && pathname === '/api/surveys') {
      try {
        const surveyData = await parseBody(request);
        const validation = validateSurvey(surveyData);
        if (!validation.valid) {
          return json({ success: false, message: validation.message }, 400);
        }
        const id = Date.now().toString();
        const now = new Date().toISOString();
        const questions = surveyData.questions.map(q => ({
          questionText: q.questionText.trim(),
          type: q.type,
          options: q.type === 'free-text' ? [] : q.options.map(opt => opt.trim()),
          required: q.required,
        }));
        await DB.prepare(
          'INSERT INTO surveys (id, title, questions, createdAt, submitted) VALUES (?, ?, ?, ?, 0)'
        ).bind(id, surveyData.title.trim(), JSON.stringify(questions), now).run();
        return json({
          success: true,
          message: 'Survey created successfully',
          data: {
            id,
            title: surveyData.title.trim(),
            questionCount: questions.length,
          },
        }, 201);
      } catch (error) {
        return json({ success: false, message: 'Internal server error while creating survey' }, 500);
      }
    }

    // POST /api/surveys/:id/submit
    const submitMatch = pathname.match(/^\/api\/surveys\/([^\/]+)\/submit$/);
    if (method === 'POST' && submitMatch) {
      const surveyId = submitMatch[1];
      try {
        const { results } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        await DB.prepare('UPDATE surveys SET submitted = 1, submittedAt = ? WHERE id = ?')
          .bind(new Date().toISOString(), surveyId)
          .run();
        return json({
          success: true,
          message: 'Survey marked as submitted successfully',
          data: { id: surveyId, submitted: true },
        });
      } catch (error) {
        return json({ success: false, message: 'Internal server error while submitting survey' }, 500);
      }
    }

    // PUT /api/surveys/:id
    if (method === 'PUT' && surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      try {
        const surveyData = await parseBody(request);
        const { results } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        const validation = validateSurvey(surveyData);
        if (!validation.valid) {
          return json({ success: false, message: validation.message }, 400);
        }
        const questions = surveyData.questions.map(q => ({
          questionText: q.questionText.trim(),
          type: q.type,
          options: q.type === 'free-text' ? [] : q.options.map(opt => opt.trim()),
          required: q.required,
        }));
        await DB.prepare(
          'UPDATE surveys SET title = ?, questions = ?, updatedAt = ?, submitted = submitted WHERE id = ?'
        ).bind(
          surveyData.title.trim(),
          JSON.stringify(questions),
          new Date().toISOString(),
          surveyId
        ).run();
        return json({
          success: true,
          message: 'Survey updated successfully',
          data: {
            id: surveyId,
            title: surveyData.title.trim(),
            questionCount: questions.length,
          },
        });
      } catch (error) {
        return json({ success: false, message: 'Internal server error while updating survey' }, 500);
      }
    }

    // DELETE /api/surveys/:id
    if (method === 'DELETE' && surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      try {
        const { results } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        await DB.prepare('DELETE FROM surveys WHERE id = ?').bind(surveyId).run();
        return json({
          success: true,
          message: 'Survey deleted successfully',
          data: {
            id: surveyId,
            title: results[0].title,
          },
        });
      } catch (error) {
        return json({ success: false, message: 'Internal server error while deleting survey' }, 500);
      }
    }

    // DELETE /api/surveys/:id
    if (method === 'DELETE' && surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      try {
        const { results } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        await DB.prepare('DELETE FROM surveys WHERE id = ?').bind(surveyId).run();
        return json({
          success: true,
          message: 'Survey deleted successfully',
          data: {
            id: surveyId,
            title: results[0].title,
          },
        });
      } catch (error) {
        return json({ success: false, message: 'Internal server error while deleting survey' }, 500);
      }
    }

    // Not found
    return json({ success: false, message: 'Not found' }, 404);
  },
}; 