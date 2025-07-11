// Survey API Cloudflare Worker
// Handles all survey operations using Cloudflare KV storage

// Validation helper function
const validateSurvey = (survey) => {
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
      
      // Check if all options have text
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
};

// Helper function to create JSON response
const createResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

// Helper function to create error response
const createErrorResponse = (message, status = 400) => {
  return createResponse({
    success: false,
    message
  }, status);
};

// Helper function to create success response
const createSuccessResponse = (message, data = null, status = 200) => {
  const response = {
    success: true,
    message
  };
  if (data) {
    response.data = data;
  }
  return createResponse(response, status);
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    try {
      // Health check endpoint
      if (path === '/api/health' && method === 'GET') {
        return createSuccessResponse('Server is running', {
          timestamp: new Date().toISOString()
        });
      }

      // POST /api/surveys - Create a new survey
      if (path === '/api/surveys' && method === 'POST') {
        const surveyData = await request.json();
        
        // Validate the survey data
        const validation = validateSurvey(surveyData);
        if (!validation.valid) {
          return createErrorResponse(validation.message, 400);
        }
        
        // Create survey object with ID and timestamp
        const surveyId = Date.now().toString();
        const survey = {
          id: surveyId,
          title: surveyData.title.trim(),
          questions: surveyData.questions.map(q => ({
            questionText: q.questionText.trim(),
            type: q.type,
            options: q.type === 'free-text' ? [] : q.options.map(opt => opt.trim()),
            required: q.required
          })),
          createdAt: new Date().toISOString(),
          submitted: false // Default to unpublished
        };
        
        // Store the survey in KV
        await env.SURVEYS.put(surveyId, JSON.stringify(survey));
        
        return createSuccessResponse('Survey created successfully', {
          id: survey.id,
          title: survey.title,
          questionCount: survey.questions.length
        }, 201);
      }

      // GET /api/surveys - Get all surveys
      if (path === '/api/surveys' && method === 'GET') {
        const surveysList = await env.SURVEYS.list();
        const surveys = [];
        
        // Fetch all survey data
        for (const key of surveysList.keys) {
          const surveyData = await env.SURVEYS.get(key.name);
          if (surveyData) {
            const survey = JSON.parse(surveyData);
            surveys.push({
              id: survey.id,
              title: survey.title,
              questionCount: survey.questions.length,
              createdAt: survey.createdAt,
              updatedAt: survey.updatedAt || survey.createdAt,
              submitted: survey.submitted || false
            });
          }
        }
        
        // Sort surveys by lastModified date in descending order
        surveys.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt);
          const dateB = new Date(b.updatedAt || b.createdAt);
          return dateB - dateA;
        });
        
        return createSuccessResponse('Surveys retrieved successfully', {
          surveys,
          total: surveys.length
        });
      }

      // GET /api/surveys/:id - Get a specific survey
      if (path.match(/^\/api\/surveys\/[^\/]+$/) && method === 'GET') {
        const surveyId = path.split('/').pop();
        const surveyData = await env.SURVEYS.get(surveyId);
        
        if (!surveyData) {
          return createErrorResponse('Survey not found', 404);
        }
        
        const survey = JSON.parse(surveyData);
        return createSuccessResponse('Survey retrieved successfully', survey);
      }

      // PUT /api/surveys/:id - Update an existing survey
      if (path.match(/^\/api\/surveys\/[^\/]+$/) && method === 'PUT') {
        const surveyId = path.split('/').pop();
        const surveyData = await request.json();
        
        // Check if survey exists
        const existingSurveyData = await env.SURVEYS.get(surveyId);
        if (!existingSurveyData) {
          return createErrorResponse('Survey not found', 404);
        }
        
        const existingSurvey = JSON.parse(existingSurveyData);
        
        // Validate the survey data
        const validation = validateSurvey(surveyData);
        if (!validation.valid) {
          return createErrorResponse(validation.message, 400);
        }
        
        // Update the survey
        const updatedSurvey = {
          ...existingSurvey,
          title: surveyData.title.trim(),
          questions: surveyData.questions.map(q => ({
            questionText: q.questionText.trim(),
            type: q.type,
            options: q.type === 'free-text' ? [] : q.options.map(opt => opt.trim()),
            required: q.required
          })),
          updatedAt: new Date().toISOString(),
          submitted: existingSurvey.submitted || false // Preserve submitted status
        };
        
        // Store the updated survey in KV
        await env.SURVEYS.put(surveyId, JSON.stringify(updatedSurvey));
        
        return createSuccessResponse('Survey updated successfully', {
          id: updatedSurvey.id,
          title: updatedSurvey.title,
          questionCount: updatedSurvey.questions.length
        });
      }

      // POST /api/surveys/:id/submit - Mark survey as submitted
      if (path.match(/^\/api\/surveys\/[^\/]+\/submit$/) && method === 'POST') {
        const surveyId = path.split('/')[3]; // Get ID from /api/surveys/:id/submit
        const surveyData = await env.SURVEYS.get(surveyId);
        
        if (!surveyData) {
          return createErrorResponse('Survey not found', 404);
        }
        
        const survey = JSON.parse(surveyData);
        
        // Mark survey as submitted
        survey.submitted = true;
        survey.submittedAt = new Date().toISOString();
        
        // Store the updated survey in KV
        await env.SURVEYS.put(surveyId, JSON.stringify(survey));
        
        return createSuccessResponse('Survey marked as submitted successfully', {
          id: survey.id,
          submitted: true
        });
      }

      // DELETE /api/surveys/:id - Delete a survey
      if (path.match(/^\/api\/surveys\/[^\/]+$/) && method === 'DELETE') {
        const surveyId = path.split('/').pop();
        const surveyData = await env.SURVEYS.get(surveyId);
        
        if (!surveyData) {
          return createErrorResponse('Survey not found', 404);
        }
        
        const survey = JSON.parse(surveyData);
        
        // Delete the survey from KV
        await env.SURVEYS.delete(surveyId);
        
        return createSuccessResponse('Survey deleted successfully', {
          id: survey.id,
          title: survey.title
        });
      }

      // Handle unknown routes
      return createErrorResponse('Not Found', 404);

    } catch (error) {
      console.error('Worker error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  },
}; 