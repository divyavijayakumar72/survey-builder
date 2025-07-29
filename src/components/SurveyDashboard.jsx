import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import surveyService from '../services/surveyService';
import './SurveyDashboard.css';

const SurveyDashboard = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [refreshingCounts, setRefreshingCounts] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    fetchSurveys();
  }, []);

  // Refresh response counts when the component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && surveys.length > 0) {
        // Refresh all response counts when the page becomes visible
        surveys.forEach(survey => {
          refreshResponseCount(survey.id);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [surveys]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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

      // Fetch response counts for each survey
      const surveysWithResponseCounts = await Promise.all(
        sortedSurveys.map(async (survey) => {
          try {
            const responsesResult = await surveyService.getSurveyResponses(survey.id);
            const responseCount = responsesResult.data.responses?.length || 0;
            return {
              ...survey,
              responseCount
            };
          } catch (error) {
            console.warn(`Failed to fetch response count for survey ${survey.id}:`, error);
            return {
              ...survey,
              responseCount: 0
            };
          }
        })
      );

      setSurveys(surveysWithResponseCounts);
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
    navigate(`/survey/${surveyId}`);
  };

  const handleCreateNew = () => {
    navigate('/create');
  };

  const handleMenuClick = (e, surveyId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === surveyId ? null : surveyId);
  };

  const shouldShowDropdownAbove = (surveyId) => {
    if (openMenuId !== surveyId) return false;
    
    // Check if this is one of the last few rows
    const surveyIndex = surveys.findIndex(survey => survey.id === surveyId);
    const totalSurveys = surveys.length;
    
    // Show above if it's in the last 2 rows
    return surveyIndex >= totalSurveys - 2;
  };

  const handleDeleteClick = (e, survey) => {
    e.stopPropagation();
    setSurveyToDelete(survey);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleCopyLink = async (e, survey) => {
    e.stopPropagation();
    const surveyLink = `${window.location.origin}/take/${survey.id}`;
    
    try {
      await navigator.clipboard.writeText(surveyLink);
      toast.success('Survey link copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = surveyLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Survey link copied to clipboard!');
    }
    
    setOpenMenuId(null);
  };

  const handleViewResponses = (e, survey) => {
    e.stopPropagation();
    navigate(`/responses/survey/${survey.id}`);
    setOpenMenuId(null);
  };

  const handlePublishToggle = async (e, survey) => {
    e.stopPropagation();
    
    try {
      const newPublishedStatus = !survey.submitted;
      
      // Call the new PATCH endpoint
      await surveyService.updateSurveyStatus(survey.id, newPublishedStatus);
      
      // Update the local state
      setSurveys(prevSurveys => 
        prevSurveys.map(s => 
          s.id === survey.id 
            ? { ...s, submitted: newPublishedStatus }
            : s
        )
      );
      
      // Show success toast
      const message = newPublishedStatus ? 'Survey published successfully' : 'Survey unpublished successfully';
      toast.success(message);
      
    } catch (error) {
      console.error('Error updating survey status:', error);
      toast.error('Error updating survey status. Please try again.');
    }
    
    setOpenMenuId(null);
  };

  // Function to refresh response counts for a specific survey
  const refreshResponseCount = async (surveyId) => {
    try {
      setRefreshingCounts(prev => new Set(prev).add(surveyId));
      
      const responsesResult = await surveyService.getSurveyResponses(surveyId);
      const responseCount = responsesResult.data.responses?.length || 0;
      
      setSurveys(prevSurveys => 
        prevSurveys.map(survey => 
          survey.id === surveyId 
            ? { ...survey, responseCount }
            : survey
        )
      );
    } catch (error) {
      console.warn(`Failed to refresh response count for survey ${surveyId}:`, error);
    } finally {
      setRefreshingCounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(surveyId);
        return newSet;
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      // Add your delete API call here
      // await surveyService.deleteSurvey(surveyToDelete.id);
      console.log('Deleting survey:', surveyToDelete.title);
      
      // Update the surveys list
      setSurveys(surveys.filter(survey => survey.id !== surveyToDelete.id));
      
      setShowDeleteModal(false);
      setSurveyToDelete(null);
    } catch (error) {
      console.error('Error deleting survey:', error);
      // Handle error appropriately
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSurveyToDelete(null);
  };

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
        <div className="header-actions">
          <button onClick={handleCreateNew} className="btn btn-primary">
            Create New Survey
          </button>
        </div>
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
                    <th>Responses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((survey) => (
                    <tr
                      key={survey.id}
                      onClick={(event) => handleRowClick(survey.id, event)}
                      className={`survey-row ${openMenuId === survey.id ? 'menu-open' : ''}`}
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
                        <span className="questions-count">
                          {survey.questionCount} question{survey.questionCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="survey-responses">
                        <span className="responses-count">
                          {refreshingCounts.has(survey.id) ? (
                            <span className="loading-indicator">...</span>
                          ) : (
                            `${survey.responseCount || 0} response${(survey.responseCount || 0) !== 1 ? 's' : ''}`
                          )}
                        </span>
                      </td>
                      <td className="survey-actions">
                        <button
                          onClick={(e) => handleMenuClick(e, survey.id)}
                          className="menu-button"
                        >
                          ⋯
                        </button>
                        
                                                 {/* Dropdown Menu */}
                         {openMenuId === survey.id && (
                           <div className={`dropdown-menu ${shouldShowDropdownAbove(survey.id) ? 'dropdown-menu-above' : ''}`}>
                             <button
                               onClick={(e) => handlePublishToggle(e, survey)}
                               className="dropdown-item publish-item"
                             >
                               {survey.submitted ? 'Unpublish' : 'Publish'}
                             </button>
                             <button
                               onClick={(e) => handleCopyLink(e, survey)}
                               className={`dropdown-item copy-item ${!survey.submitted ? 'disabled' : ''}`}
                               disabled={!survey.submitted}
                             >
                               Copy Link
                             </button>
                             <button
                               onClick={(e) => handleViewResponses(e, survey)}
                               className={`dropdown-item view-item ${(survey.responseCount || 0) === 0 ? 'disabled' : ''}`}
                               disabled={(survey.responseCount || 0) === 0}
                             >
                               View Responses
                             </button>
                             <button
                               onClick={(e) => handleDeleteClick(e, survey)}
                               className="dropdown-item delete-item"
                             >
                               Delete
                             </button>
                           </div>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Survey</h3>
            <p>
              Are you sure you want to delete "{surveyToDelete?.title}"? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={handleDeleteCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyDashboard;