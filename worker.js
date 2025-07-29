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
 *
 * CREATE TABLE IF NOT EXISTS survey_responses (
 *   id TEXT PRIMARY KEY,
 *   surveyId TEXT NOT NULL,
 *   respondentName TEXT NOT NULL,
 *   responses TEXT NOT NULL, -- JSON string
 *   submittedAt TEXT NOT NULL,
 *   FOREIGN KEY (surveyId) REFERENCES surveys(id) ON DELETE CASCADE
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
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
        
        // Check if survey_responses table exists and has data
        let responseCount = 0;
        let surveyCount = 0;
        
        if (tableNames.includes('survey_responses')) {
          const responseResult = await DB.prepare("SELECT COUNT(*) as count FROM survey_responses").all();
          responseCount = responseResult.results[0].count;
        }
        
        if (tableNames.includes('surveys')) {
          const surveyResult = await DB.prepare("SELECT COUNT(*) as count FROM surveys").all();
          surveyCount = surveyResult.results[0].count;
        }
        
        return json({
          success: true,
          message: 'Database tables retrieved successfully',
          data: {
            tables: tableNames,
            count: tableNames.length,
            survey_responses_count: responseCount,
            surveys_count: surveyCount,
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

    // POST /test-add-responses - Add sample responses for testing
    if (method === 'POST' && pathname === '/test-add-responses') {
      try {
        // Get the first survey to add responses to
        const { results: surveys } = await DB.prepare('SELECT id, title FROM surveys LIMIT 1').all();
        
        if (!surveys.length) {
          return json({ success: false, message: 'No surveys found to add responses to' }, 404);
        }
        
        const surveyId = surveys[0].id;
        const surveyTitle = surveys[0].title;
        
        // Add 3 sample responses
        const sampleResponses = [
          {
            respondentName: 'John Doe',
            responses: [
              { questionId: 0, answer: 'Sample answer 1' },
              { questionId: 1, answer: 'Sample answer 2' }
            ]
          },
          {
            respondentName: 'Jane Smith',
            responses: [
              { questionId: 0, answer: 'Another answer 1' },
              { questionId: 1, answer: 'Another answer 2' }
            ]
          },
          {
            respondentName: 'Bob Johnson',
            responses: [
              { questionId: 0, answer: 'Third answer 1' },
              { questionId: 1, answer: 'Third answer 2' }
            ]
          }
        ];
        
        for (const response of sampleResponses) {
          const responseId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const now = new Date().toISOString();
          
          await DB.prepare(
            'INSERT INTO survey_responses (id, surveyId, respondentName, responses, submittedAt) VALUES (?, ?, ?, ?, ?)'
          ).bind(
            responseId,
            surveyId,
            response.respondentName,
            JSON.stringify(response.responses),
            now
          ).run();
        }
        
        return json({
          success: true,
          message: 'Sample responses added successfully',
          data: {
            surveyId,
            surveyTitle,
            responsesAdded: sampleResponses.length,
          },
        });
      } catch (error) {
        console.error('Error adding sample responses:', error);
        return json({ 
          success: false, 
          message: 'Internal server error while adding sample responses',
          error: error.message 
        }, 500);
      }
    }

    // GET /api/surveys
    if (method === 'GET' && pathname === '/api/surveys') {
      try {
        console.log('Fetching surveys with response counts...');
        
        const { results } = await DB.prepare(`
          SELECT 
            s.id, 
            s.title, 
            s.questions, 
            s.createdAt, 
            s.updatedAt, 
            s.submitted,
            COALESCE(r.responseCount, 0) as responseCount
          FROM surveys s
          LEFT JOIN (
            SELECT surveyId, COUNT(*) as responseCount
            FROM survey_responses
            GROUP BY surveyId
          ) r ON s.id = r.surveyId
        `).all();
        
        console.log('Survey results:', results.map(s => ({
          id: s.id,
          title: s.title,
          responseCount: s.responseCount
        })));
        
        return json({
          success: true,
          message: 'Surveys retrieved successfully',
          data: {
            surveys: results.map(s => ({
              id: s.id,
              title: s.title,
              questionCount: JSON.parse(s.questions).length,
              responseCount: s.responseCount,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt || s.createdAt,
              submitted: !!s.submitted,
            })),
            total: results.length,
          },
        });
      } catch (error) {
        console.error('Error fetching surveys:', error);
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

    // PATCH /api/surveys/:id/status - Update survey published status only
    const statusMatch = pathname.match(/^\/api\/surveys\/([^\/]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      const surveyId = statusMatch[1];
      try {
        const statusData = await parseBody(request);
        
        // Validate request body
        if (!statusData) {
          return json({ success: false, message: 'Request body is required' }, 400);
        }
        
        if (typeof statusData.published !== 'boolean') {
          return json({ success: false, message: 'published field must be a boolean value' }, 400);
        }
        
        // Check if survey exists
        const { results } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        
        // Update only the submitted field
        await DB.prepare(
          'UPDATE surveys SET submitted = ?, updatedAt = ? WHERE id = ?'
        ).bind(
          statusData.published ? 1 : 0,
          new Date().toISOString(),
          surveyId
        ).run();
        
        return json({
          success: true,
          message: `Survey ${statusData.published ? 'published' : 'unpublished'} successfully`,
          data: {
            id: surveyId,
            published: statusData.published
          },
        });
      } catch (error) {
        console.error('Error updating survey status:', error);
        return json({ success: false, message: 'Internal server error while updating survey status' }, 500);
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

    // POST /api/surveys/responses - Submit a survey response
    if (method === 'POST' && pathname === '/api/surveys/responses') {
      try {
        console.log('Received survey response submission request');
        
        const responseData = await parseBody(request);
        console.log('Parsed request body:', responseData);
        
        // Validate required fields
        if (!responseData) {
          console.error('No request body provided');
          return json({ success: false, message: 'Request body is required' }, 400);
        }
        
        if (!responseData.surveyId) {
          console.error('Missing surveyId');
          return json({ success: false, message: 'surveyId is required' }, 400);
        }
        
        if (!responseData.respondentName || responseData.respondentName.trim() === '') {
          console.error('Missing or empty respondentName');
          return json({ success: false, message: 'respondentName is required' }, 400);
        }
        
        if (!responseData.responses || !Array.isArray(responseData.responses)) {
          console.error('Missing or invalid responses array');
          return json({ success: false, message: 'responses array is required' }, 400);
        }
        
        // Verify survey exists
        console.log('Checking if survey exists:', responseData.surveyId);
        const { results: surveyResults } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(responseData.surveyId).all();
        
        if (!surveyResults.length) {
          console.error('Survey not found:', responseData.surveyId);
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        
        console.log('Survey found, creating response record');
        
        const responseId = Date.now().toString();
        const now = new Date().toISOString();
        
        const insertResult = await DB.prepare(
          'INSERT INTO survey_responses (id, surveyId, respondentName, responses, submittedAt) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          responseId,
          responseData.surveyId,
          responseData.respondentName.trim(),
          JSON.stringify(responseData.responses),
          now
        ).run();
        
        console.log('Response inserted successfully:', insertResult);
        
        return json({
          success: true,
          message: 'Survey response submitted successfully',
          data: {
            id: responseId,
            surveyId: responseData.surveyId,
            respondentName: responseData.respondentName,
            submittedAt: now,
          },
        }, 201);
      } catch (error) {
        console.error('Error submitting survey response:', error);
        return json({ 
          success: false, 
          message: 'Internal server error while submitting response',
          error: error.message 
        }, 500);
      }
    }

    // GET /api/surveys/:id/responses - Get responses for a survey
    const responsesMatch = pathname.match(/^\/api\/surveys\/([^\/]+)\/responses$/);
    if (method === 'GET' && responsesMatch) {
      const surveyId = responsesMatch[1];
      try {
        // Verify survey exists
        const { results: surveyResults } = await DB.prepare('SELECT * FROM surveys WHERE id = ?').bind(surveyId).all();
        if (!surveyResults.length) {
          return json({ success: false, message: 'Survey not found' }, 404);
        }
        
        const { results } = await DB.prepare('SELECT * FROM survey_responses WHERE surveyId = ? ORDER BY submittedAt DESC').bind(surveyId).all();
        
        const responses = results.map(r => ({
          id: r.id,
          surveyId: r.surveyId,
          respondentName: r.respondentName,
          responses: JSON.parse(r.responses),
          submittedAt: r.submittedAt,
        }));
        
        return json({
          success: true,
          message: 'Survey responses retrieved successfully',
          data: {
            surveyId,
            responses,
            total: responses.length,
          },
        });
      } catch (error) {
        return json({ success: false, message: 'Internal server error while retrieving responses' }, 500);
      }
    }

    // Not found
    return json({ success: false, message: 'Not found' }, 404);
  },
}; 