import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import surveyService from '../services/surveyService';
import './RecipientDetails.css';

const RecipientDetails = () => {
  const { recipientName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [survey, setSurvey] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.state?.response) {
      // We have the response data from navigation
      setResponse(location.state.response);
      fetchSurveyDetails(location.state.response.surveyId);
    } else {
      // We need to fetch the response data
      fetchRecipientData();
    }
  }, [recipientName, location.state]);

  const fetchRecipientData = async () => {
    try {
      setLoading(true);
      
      // Get all surveys first
      const surveysResult = await surveyService.getAllSurveys();
      const surveys = surveysResult.data.surveys;
      
      // Find the response for this recipient
      let foundResponse = null;
      let foundSurvey = null;
      
      for (const survey of surveys) {
        try {
          const responsesResult = await surveyService.getSurveyResponses(survey.id);
          const responses = responsesResult.data.responses || [];
          
          const matchingResponse = responses.find(r => 
            r.respondentName === decodeURIComponent(recipientName)
          );
          
          if (matchingResponse) {
            foundResponse = {
              ...matchingResponse,
              surveyId: survey.id,
              surveyTitle: survey.title
            };
            foundSurvey = survey;
            break;
          }
        } catch (err) {
          console.error(`Error fetching responses for survey ${survey.id}:`, err);
        }
      }
      
      if (foundResponse && foundSurvey) {
        setResponse(foundResponse);
        setSurvey(foundSurvey);
      } else {
        setError('Recipient not found');
      }
    } catch (error) {
      console.error('Error fetching recipient data:', error);
      setError('Failed to load recipient details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveyDetails = async (surveyId) => {
    try {
      const surveyResult = await surveyService.getSurveyById(surveyId);
      setSurvey(surveyResult.data);
    } catch (error) {
      console.error('Error fetching survey details:', error);
      setError('Failed to load survey details');
    } finally {
      setLoading(false);
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
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };



  const getStatusBadge = (response) => {
    return {
      text: 'Completed',
      className: 'status-completed'
    };
  };

  const formatAnswer = (answer, questionType, questionIndex) => {
    if (!answer) return 'No answer provided';
    
    switch (questionType) {
      case 'single-select':
        return answer;
      
      case 'multiple-choice':
        if (Array.isArray(answer)) {
          return answer.join(', ');
        }
        return answer;
      
      case 'free-text':
        return answer;
      
      default:
        return answer;
    }
  };

  const renderAnswerWithChoices = (answer, questionType, questionIndex) => {
    // For free-text questions, just return the formatted answer
    if (questionType === 'free-text') {
      return (
        <div className="answer-box">
          {formatAnswer(answer.answer, questionType)}
        </div>
      );
    }

    // For single-select and multiple-choice, show all choices
    const surveyQuestion = survey.questions[questionIndex];
    if (!surveyQuestion || !surveyQuestion.options) {
      return (
        <div className="answer-box">
          {formatAnswer(answer.answer, questionType)}
        </div>
      );
    }

    const selectedAnswers = Array.isArray(answer.answer) ? answer.answer : [answer.answer];

    return (
      <div className="answer-box">
        <div className="choices-list">
          {surveyQuestion.options.map((option, optionIndex) => {
            const isSelected = selectedAnswers.includes(option);
            return (
              <div key={optionIndex} className={`choice-item ${isSelected ? 'selected' : 'not-selected'}`}>
                <span className="choice-indicator">
                  {isSelected ? '✓' : '○'}
                </span>
                <span className="choice-text">{option}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleBackToResponses = () => {
    // Navigate to survey-specific responses if we have a surveyId
    if (response?.surveyId) {
      navigate(`/responses/survey/${response.surveyId}`);
    } else {
      // Fallback to all responses if no surveyId is available
      navigate('/responses');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="recipient-details-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading recipient details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recipient-details-container">
        <div className="error-state">
          <h2>Error Loading Details</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchRecipientData} className="btn btn-primary">
              Try Again
            </button>
            <button onClick={handleBackToResponses} className="btn btn-secondary">
              Back to Responses
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!response || !survey) {
    return (
      <div className="recipient-details-container">
        <div className="error-state">
          <h2>Recipient Not Found</h2>
          <p>The recipient you're looking for doesn't exist.</p>
          <button onClick={handleBackToResponses} className="btn btn-primary">
            Back to Responses
          </button>
        </div>
      </div>
    );
  }

  const status = getStatusBadge(response);

  return (
    <div className="recipient-details-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={handleBackToDashboard} className="breadcrumb-item">
          Surveys
        </button>
        <span className="breadcrumb-separator">›</span>
        <button onClick={handleBackToResponses} className="breadcrumb-item">
          {response.surveyTitle} Responses
        </button>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-current">{response.respondentName}</span>
      </div>

      {/* Header Section */}
      <div className="recipient-header">
        <div className="header-content">
          <div className="recipient-info">
            <h1>{response.respondentName}</h1>
            <div className="recipient-meta">
              <div className="meta-item">
                <span className="meta-label">Survey:</span>
                <span className="meta-value">{response.surveyTitle}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Submitted:</span>
                <span className="meta-value">{formatDate(response.submittedAt)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Status:</span>
                <span className={`status-badge ${status.className}`}>
                  {status.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Response Summary */}
      <div className="response-summary">
        <div className="summary-header">
          <h2>Response Summary</h2>
          <p>All questions and answers from this response</p>
        </div>

        <div className="questions-list">
          {response.responses.map((answer, index) => {
            const questionNumber = index + 1;
            const questionText = answer.questionText || `Question ${questionNumber}`;
            const questionType = answer.questionType || 'unknown';
            
            return (
              <div key={index} className="question-item">
                <div className="question-header">
                  <span className="question-number">Question {questionNumber}</span>
                  <span className="question-type">({questionType})</span>
                </div>
                <div className="question-text">
                  {questionText}
                </div>
                {renderAnswerWithChoices(answer, questionType, index)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={handleBackToResponses} className="btn btn-secondary">
          ← Back to {response.surveyTitle} Responses
        </button>
        <button onClick={handleBackToDashboard} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default RecipientDetails; 