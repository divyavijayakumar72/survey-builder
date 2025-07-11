import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import surveyService from '../services/surveyService';
import './SurveyDashboard.css';

const SurveyDashboard = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const result = await surveyService.getAllSurveys();

      // Sort surveys by lastModified date in descending order
      const sortedSurveys = result.data.surveys.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt);
        const dateB = new Date(b.updatedAt || b.createdAt);
        return dateB - dateA;
      });
      setSurveys(sortedSurveys);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      setError(error.message || 'Network error: Unable to fetch surveys. Please check if the server is running.');
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

  const handleRowClick = (surveyId, event) => {
    // Don't navigate if clicking on the dropdown
    if (event.target.closest('.dropdown-container')) {
      return;
    }
    navigate(`/survey/${surveyId}`);
  };

  const handleCreateNew = () => {
    navigate('/create');
  };

  const toggleDropdown = (surveyId, event) => {
    event.stopPropagation();
    setOpenDropdown(openDropdown === surveyId ? null : surveyId);
  };

  const handleDeleteSurvey = async (surveyId, surveyTitle) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${surveyTitle}"? This action cannot be undone.`);
    
    if (!confirmed) {
      return;
    }

    try {
      await surveyService.deleteSurvey(surveyId);
      
      // Remove the survey from the local state
      setSurveys(prevSurveys => prevSurveys.filter(survey => survey.id !== surveyId));
      setOpenDropdown(null);
      alert('Survey deleted successfully!');
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert(`Error deleting survey: ${error.message}`);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading surveys...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-state">
          <h2>Error Loading Surveys</h2>
          <p>{error}</p>
          <button onClick={fetchSurveys} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Survey Dashboard</h1>
        <button onClick={handleCreateNew} className="btn btn-primary">
          Create New Survey
        </button>
      </div>

      <div className="dashboard-content">
        {surveys.length === 0 ? (
          <div className="empty-state">
            <h2>No Surveys Found</h2>
            <p>You haven't created any surveys yet. Start by creating your first survey!</p>
            <button onClick={handleCreateNew} className="btn btn-primary">
              Create Your First Survey
            </button>
          </div>
        ) : (
          <div className="surveys-table-container">
            <h2>Your Surveys ({surveys.length})</h2>
            <div className="table-wrapper">
              <table className="surveys-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date Modified</th>
                    <th>Status</th>
                    <th>Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((survey) => (
                    <tr 
                      key={survey.id} 
                      onClick={(event) => handleRowClick(survey.id, event)}
                      className="survey-row"
                    >
                      <td className="survey-title">
                        <strong>{survey.title}</strong>
                      </td>
                      <td className="survey-date">
                        {formatDate(survey.updatedAt || survey.createdAt)}
                      </td>
                      <td className="survey-status">
                        <span className={`status-badge ${survey.submitted ? 'published' : 'unpublished'}`}>
                          {survey.submitted ? 'Published' : 'Unpublished'}
                        </span>
                      </td>
                      <td className="survey-questions">
                        <div className="questions-actions-container">
                          <span className="questions-count">
                            {survey.questionCount} question{survey.questionCount !== 1 ? 's' : ''}
                          </span>
                          <div className="dropdown-container">
                            <button
                              className="dropdown-toggle"
                              onClick={(event) => toggleDropdown(survey.id, event)}
                              aria-label="More options"
                            >
                              ⋮
                            </button>
                            {openDropdown === survey.id && (
                              <div className="dropdown-menu">
                                <button
                                  className="dropdown-item delete-item"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteSurvey(survey.id, survey.title);
                                  }}
                                >
                                  Delete Survey
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
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

export default SurveyDashboard; 