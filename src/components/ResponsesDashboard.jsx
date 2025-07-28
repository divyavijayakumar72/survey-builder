import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import surveyService from '../services/surveyService';
import './ResponsesDashboard.css';

const ResponsesDashboard = () => {
  const { surveyId } = useParams();
  const [surveys, setSurveys] = useState([]);
  const [allResponses, setAllResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllResponses();
  }, [surveyId]);

  const fetchAllResponses = async () => {
    try {
      setLoading(true);
      
      if (surveyId) {
        // Fetch responses for a specific survey
        const surveyResult = await surveyService.getSurveyById(surveyId);
        const survey = surveyResult.data;
        setCurrentSurvey(survey);
        setSurveys([survey]);

        const responsesResult = await surveyService.getSurveyResponses(surveyId);
        const responses = responsesResult.data.responses || [];
        
        // Add survey info to each response
        const responsesWithSurveyInfo = responses.map(response => ({
          ...response,
          surveyId: survey.id,
          surveyTitle: survey.title
        }));

        setAllResponses(responsesWithSurveyInfo);
      } else {
        // Fetch responses for all surveys (original behavior)
        const surveysResult = await surveyService.getAllSurveys();
        const surveysData = surveysResult.data.surveys;
        setSurveys(surveysData);

        // Then, fetch responses for each survey
        const responsesPromises = surveysData.map(survey => 
          surveyService.getSurveyResponses(survey.id)
            .then(result => ({
              surveyId: survey.id,
              surveyTitle: survey.title,
              responses: result.data.responses || []
            }))
            .catch(err => ({
              surveyId: survey.id,
              surveyTitle: survey.title,
              responses: []
            }))
        );

        const responsesResults = await Promise.all(responsesPromises);
        
        // Flatten all responses and add survey info
        const flattenedResponses = responsesResults.flatMap(result => 
          result.responses.map(response => ({
            ...response,
            surveyId: result.surveyId,
            surveyTitle: result.surveyTitle
          }))
        );

        setAllResponses(flattenedResponses);
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      setError('Failed to load responses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (response) => {
    // For now, we'll consider all responses as completed
    // You can add logic here to determine if a response is in progress or abandoned
    return {
      text: 'Completed',
      className: 'status-completed'
    };
  };



  const handleRowClick = (response) => {
    navigate(`/responses/recipient/${encodeURIComponent(response.respondentName)}`, {
      state: { response, surveyTitle: response.surveyTitle }
    });
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="responses-dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading all responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="responses-dashboard-container">
        <div className="error-state">
          <h2>Error Loading Responses</h2>
          <p>{error}</p>
          <button onClick={fetchAllResponses} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="responses-dashboard-container">
      {/* Header Section */}
      <div className="responses-header">
        <div className="header-content">
          <button onClick={handleBackToDashboard} className="btn btn-secondary back-button">
            ← Back to Dashboard
          </button>
          
          <div className="page-info">
            <h1>{surveyId ? `${currentSurvey?.title} - Responses` : 'All Responses'}</h1>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Responses:</span>
                <span className="stat-value">{allResponses.length}</span>
              </div>
              {!surveyId && (
                <div className="stat">
                  <span className="stat-label">Surveys:</span>
                  <span className="stat-value">{surveys.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Responses Table */}
      <div className="responses-content">
        {allResponses.length === 0 ? (
          <div className="empty-state">
            <h2>No Responses Yet</h2>
            <p>{surveyId ? `No responses have been collected for this survey yet.` : 'No survey responses have been collected yet.'}</p>
            <p>Share your surveys to start collecting responses!</p>
          </div>
        ) : (
          <div className="responses-table-container">
            <h2>{surveyId ? `Survey Responses (${allResponses.length})` : `All Survey Responses (${allResponses.length})`}</h2>
            <div className="table-wrapper">
              <table className="responses-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    {!surveyId && <th>Survey</th>}
                    <th>Submitted Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allResponses.map((response, index) => {
                    const status = getStatusBadge(response);
                    
                    return (
                      <tr 
                        key={`${response.id}-${index}`} 
                        className="response-row"
                        onClick={() => handleRowClick(response)}
                      >
                        <td className="recipient-name">
                          <strong>{response.respondentName}</strong>
                        </td>
                        {!surveyId && (
                          <td className="survey-title">
                            {response.surveyTitle}
                          </td>
                        )}
                        <td className="submission-date">
                          {formatDate(response.submittedAt)}
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${status.className}`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsesDashboard; 