// Survey API Service
// Uses VITE_API_URL from environment variables

// Use environment variable or fallback to default URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://survey-builder-worker.divya-vijayakumar.workers.dev';

if (!import.meta.env.VITE_API_URL) {
  console.warn('⚠️ VITE_API_URL is not set! Using default URL.');
  console.warn('To set a custom URL, create a .env file with: VITE_API_URL=https://your-worker-url.workers.dev');
}

// Helper function to handle API responses
const handleResponse = async (response) => {
  const result = await response.json();
  
  if (!response.ok) {
    const error = new Error(result.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.response = result;
    throw error;
  }
  
  return result;
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  console.log('Making API request:', {
    url,
    method: config.method || 'GET',
    headers: config.headers,
    body: config.body ? JSON.parse(config.body) : undefined
  });

  try {
    const response = await fetch(url, config);
    console.log('API response status:', response.status);
    return handleResponse(response);
  } catch (error) {
    console.error('API request failed:', {
      url,
      error: error.message,
      config
    });
    throw error;
  }
};

// Survey API methods
export const surveyService = {
  // Get all surveys
  async getAllSurveys() {
    return apiRequest('/api/surveys');
  },

  // Get a specific survey by ID
  async getSurveyById(surveyId) {
    return apiRequest(`/api/surveys/${surveyId}`);
  },

  // Create a new survey
  async createSurvey(surveyData) {
    return apiRequest('/api/surveys', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  },

  // Update an existing survey
  async updateSurvey(surveyId, surveyData) {
    return apiRequest(`/api/surveys/${surveyId}`, {
      method: 'PUT',
      body: JSON.stringify(surveyData),
    });
  },

  // Delete a survey
  async deleteSurvey(surveyId) {
    return apiRequest(`/api/surveys/${surveyId}`, {
      method: 'DELETE',
    });
  },

  // Submit a survey (mark as published)
  async submitSurvey(surveyId) {
    return apiRequest(`/api/surveys/${surveyId}/submit`, {
      method: 'POST',
    });
  },

  // Update survey published status
  async updateSurveyStatus(surveyId, published) {
    return apiRequest(`/api/surveys/${surveyId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ published }),
    });
  },

  // Health check
  async healthCheck() {
    return apiRequest('/api/health');
  },

  // Submit survey response
  async submitSurveyResponse(responseData) {
    return apiRequest('/api/surveys/responses', {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  },

  // Get survey responses
  async getSurveyResponses(surveyId) {
    return apiRequest(`/api/surveys/${surveyId}/responses`);
  },
};

export default surveyService; 