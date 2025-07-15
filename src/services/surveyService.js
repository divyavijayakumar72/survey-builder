// Survey API Service
// Uses VITE_API_URL from environment variables

// Use environment variable or throw error if not set
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.error('❌ VITE_API_URL is not set! Please check your .env file.');
  console.error('Expected: VITE_API_URL=https://survey-builder-worker.divya-vijayakumar.workers.dev');
  throw new Error('VITE_API_URL environment variable is not set. Please check your .env file.');
}

// Helper function to handle API responses
const handleResponse = async (response) => {
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || `HTTP error! status: ${response.status}`);
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

  const response = await fetch(url, config);
  return handleResponse(response);
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

  // Health check
  async healthCheck() {
    return apiRequest('/api/health');
  },
};

export default surveyService; 