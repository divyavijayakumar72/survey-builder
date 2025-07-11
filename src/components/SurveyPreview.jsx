import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import surveyService from '../services/surveyService';
import './SurveyPreview.css';

const SurveyPreview = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      const result = await surveyService.getSurveyById(surveyId);
      setSurvey(result.data);
    } catch (error) {
      console.error('Error fetching survey:', error);
      setError(error.message || 'Network error: Unable to fetch survey. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSurvey = () => {
    navigate('/create', { 
      state: { 
        editMode: true, 
        surveyData: survey 
      } 
    });
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Prepare survey data for API
    const surveyData = {
      title: survey.title,
      questions: survey.questions.map(q => ({
        questionText: q.questionText,
        type: q.type,
        options: q.type === 'free-text' ? [] : q.options,
        required: q.required
      }))
    };

    try {
      await surveyService.updateSurvey(surveyId, surveyData);
      alert('Survey saved as draft successfully!');
      // Navigate back to dashboard to see updated status
      navigate('/');
    } catch (error) {
      console.error('Network error:', error);
      alert(`Error saving survey: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // First save the survey
    const surveyData = {
      title: survey.title,
      questions: survey.questions.map(q => ({
        questionText: q.questionText,
        type: q.type,
        options: q.type === 'free-text' ? [] : q.options,
        required: q.required
      }))
    };

    try {
      // Save the survey first
      await surveyService.updateSurvey(surveyId, surveyData);

      // Then mark as submitted
      await surveyService.submitSurvey(surveyId);

      alert('Survey submitted successfully!');
      // Navigate back to dashboard to see updated status
      navigate('/');
    } catch (error) {
      console.error('Network error:', error);
      alert(`Error submitting survey: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getQuestionTypeLabel = (type) => {
    const typeMap = {
      'multiple-choice': 'Multiple Choice',
      'single-select': 'Single Select',
      'free-text': 'Free Text'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="preview-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-container">
        <div className="error-state">
          <h2>Error Loading Survey</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchSurvey} className="btn btn-primary">
              Try Again
            </button>
            <button onClick={handleBackToDashboard} className="btn btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="preview-container">
        <div className="error-state">
          <h2>Survey Not Found</h2>
          <p>The survey you're looking for doesn't exist.</p>
          <button onClick={handleBackToDashboard} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <div className="preview-header">
        <button onClick={handleBackToDashboard} className="btn btn-secondary">
          Back to Dashboard
        </button>
        <button onClick={handleEditSurvey} className="btn btn-warning">
          Edit Survey
        </button>
      </div>

      <div className="preview-content">
        <div className="survey-title-section">
          <h1>{survey.title}</h1>
        </div>

        {survey.questions.length === 0 ? (
          <div className="empty-questions">
            <p>No questions found in this survey.</p>
          </div>
        ) : (
          <form className="survey-form" onSubmit={handleSubmit}>
            {survey.questions.map((question, index) => (
              <div key={index} className="preview-question">
                <label className="question-label">
                  {index + 1}. {question.questionText}
                  {question.required && <span className="required">*</span>}
                </label>
                
                {question.type === 'free-text' ? (
                  <textarea
                    placeholder="Enter your answer here..."
                    className="form-control"
                    rows="3"
                  />
                ) : question.type === 'single-select' ? (
                  <div className="radio-group">
                    {question.options.map((option, optIndex) => (
                      <label key={optIndex} className="radio-option">
                        <input type="radio" name={`question-${index}`} />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="checkbox-group">
                    {question.options.map((option, optIndex) => (
                      <label key={optIndex} className="checkbox-option">
                        <input type="checkbox" name={`question-${index}`} />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="form-actions">
              <button type="button" onClick={handleSave} className="btn btn-secondary">
                Save as Draft
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Survey
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SurveyPreview; 