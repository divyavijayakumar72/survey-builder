import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for surveys
let surveys = [];

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

// POST /api/surveys - Create a new survey
app.post('/api/surveys', (req, res) => {
  try {
    const surveyData = req.body;
    
    // Validate the survey data
    const validation = validateSurvey(surveyData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }
    
    // Create survey object with ID and timestamp
    const survey = {
      id: Date.now().toString(),
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
    
    // Store the survey
    surveys.push(survey);
    
    res.status(201).json({
      success: true,
      message: 'Survey created successfully',
      data: {
        id: survey.id,
        title: survey.title,
        questionCount: survey.questions.length
      }
    });
    
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating survey'
    });
  }
});

// POST /api/surveys/:id/submit - Mark survey as submitted
app.post('/api/surveys/:id/submit', (req, res) => {
  try {
    const surveyId = req.params.id;
    const surveyIndex = surveys.findIndex(s => s.id === surveyId);
    
    if (surveyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }
    
    // Mark survey as submitted
    surveys[surveyIndex].submitted = true;
    surveys[surveyIndex].submittedAt = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Survey marked as submitted successfully',
      data: {
        id: surveys[surveyIndex].id,
        submitted: true
      }
    });
    
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while submitting survey'
    });
  }
});

// GET /api/surveys - Get all surveys
app.get('/api/surveys', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Surveys retrieved successfully',
      data: {
        surveys: surveys.map(survey => ({
          id: survey.id,
          title: survey.title,
          questionCount: survey.questions.length,
          createdAt: survey.createdAt,
          updatedAt: survey.updatedAt || survey.createdAt,
          submitted: survey.submitted || false
        })),
        total: surveys.length
      }
    });
  } catch (error) {
    console.error('Error retrieving surveys:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving surveys'
    });
  }
});

// GET /api/surveys/:id - Get a specific survey
app.get('/api/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    const survey = surveys.find(s => s.id === surveyId);
    
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Survey retrieved successfully',
      data: survey
    });
  } catch (error) {
    console.error('Error retrieving survey:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving survey'
    });
  }
});

// PUT /api/surveys/:id - Update an existing survey
app.put('/api/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    const surveyData = req.body;
    
    // Find the existing survey
    const existingSurveyIndex = surveys.findIndex(s => s.id === surveyId);
    
    if (existingSurveyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }
    
    // Validate the survey data
    const validation = validateSurvey(surveyData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }
    
    // Update the survey
    const updatedSurvey = {
      ...surveys[existingSurveyIndex],
      title: surveyData.title.trim(),
      questions: surveyData.questions.map(q => ({
        questionText: q.questionText.trim(),
        type: q.type,
        options: q.type === 'free-text' ? [] : q.options.map(opt => opt.trim()),
        required: q.required
      })),
      updatedAt: new Date().toISOString(),
      submitted: surveys[existingSurveyIndex].submitted || false // Preserve submitted status
    };
    
    // Replace the survey in the array
    surveys[existingSurveyIndex] = updatedSurvey;
    
    res.json({
      success: true,
      message: 'Survey updated successfully',
      data: {
        id: updatedSurvey.id,
        title: updatedSurvey.title,
        questionCount: updatedSurvey.questions.length
      }
    });
    
  } catch (error) {
    console.error('Error updating survey:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating survey'
    });
  }
});

// DELETE /api/surveys/:id - Delete a survey
app.delete('/api/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    const surveyIndex = surveys.findIndex(s => s.id === surveyId);
    
    if (surveyIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }
    
    // Remove the survey from the array
    const deletedSurvey = surveys.splice(surveyIndex, 1)[0];
    
    res.json({
      success: true,
      message: 'Survey deleted successfully',
      data: {
        id: deletedSurvey.id,
        title: deletedSurvey.title
      }
    });
    
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting survey'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Survey API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Create survey: POST http://localhost:${PORT}/api/surveys`);
  console.log(`📋 Get surveys: GET http://localhost:${PORT}/api/surveys`);
});

export default app; 