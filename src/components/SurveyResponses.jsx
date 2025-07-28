import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import surveyService from '../services/surveyService';
import './SurveyResponses.css';

const SurveyResponses = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSurveyAndResponses();
  }, [surveyId]);

  const fetchSurveyAndResponses = async () => {
    try {
      setLoading(true);
      
      // Fetch survey details and responses in parallel
      const [surveyResult, responsesResult] = await Promise.all([
        surveyService.getSurveyById(surveyId),
        surveyService.getSurveyResponses(surveyId)
      ]);

      setSurvey(surveyResult.data);
      setResponses(responsesResult.data.responses || []);
    } catch (error) {
      console.error('Error fetching survey responses:', error);
      setError('Failed to load survey responses. Please try again.');
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
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getDateRange = () => {
    if (responses.length === 0) return 'No responses yet';
    
    const dates = responses.map(r => new Date(r.submittedAt)).sort((a, b) => a - b);
    const firstDate = formatDate(dates[0]);
    const lastDate = formatDate(dates[dates.length - 1]);
    
    if (firstDate === lastDate) {
      return firstDate;
    }
    
    return `${firstDate} - ${lastDate}`;
  };

  const formatAnswer = (answer, questionType) => {
    if (!answer) return 'No answer';
    
    switch (questionType) {
      case 'single-select':
        return answer;
      
      case 'multiple-choice':
        if (Array.isArray(answer)) {
          return answer.join(', ');
        }
        return answer;
      
      case 'free-text':
        if (typeof answer === 'string' && answer.length > 50) {
          return (
            <span title={answer}>
              {answer.substring(0, 50)}...
            </span>
          );
        }
        return answer;
      
      default:
        return answer;
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="survey-responses-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading survey responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-responses-container">
        <div className="error-state">
          <h2>Error Loading Responses</h2>
          <p>{error}</p>
          <button onClick={fetchSurveyAndResponses} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="survey-responses-container">
        <div className="error-state">
          <h2>Survey Not Found</h2>
          <p>The survey you're looking for doesn't exist.</p>
          <button onClick={handleBack} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-responses-container">
      {/* Header Section */}
      <div className="responses-header">
        <div className="header-content">
          <button onClick={handleBack} className="btn btn-secondary back-button">
            ← Back to Dashboard
          </button>
          
          <div className="survey-info">
            <h1>{survey.title}</h1>
            <div className="survey-stats">
              <div className="stat">
                <span className="stat-label">Total Responses:</span>
                <span className="stat-value">{responses.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Date Range:</span>
                <span className="stat-value">{getDateRange()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responses Table */}
      <div className="responses-content">
        {responses.length === 0 ? (
          <div className="empty-state">
            <h2>No Responses Yet</h2>
            <p>This survey hasn't received any responses yet.</p>
            <p>Share the survey link to start collecting responses!</p>
          </div>
        ) : (
          <div className="responses-table-container">
            <h2>Survey Responses ({responses.length})</h2>
            <div className="table-wrapper">
              <table className="responses-table">
                <thead>
                  <tr>
                    <th>Respondent</th>
                    <th>Submitted</th>
                    {survey.questions.map((question, index) => (
                      <th key={index} className="question-column">
                        <div className="question-header">
                          <span className="question-number">{index + 1}</span>
                          <span className="question-text">{question.questionText}</span>
                          <span className="question-type">({question.type})</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response, responseIndex) => (
                    <tr key={response.id} className="response-row">
                      <td className="respondent-name">
                        <strong>{response.respondentName}</strong>
                      </td>
                      <td className="submission-date">
                        {formatDate(response.submittedAt)}
                      </td>
                      {survey.questions.map((question, questionIndex) => {
                        const responseData = response.responses.find(
                          r => r.questionText === question.questionText
                        );
                        const answer = responseData ? responseData.answer : 'No answer';
                        
                        return (
                          <td key={questionIndex} className="answer-cell">
                            <div className="answer-content">
                              {formatAnswer(answer, question.type)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyResponses; 