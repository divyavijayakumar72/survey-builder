import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SurveyCreator, SurveyCreatorComponent } from 'survey-creator-react';
import 'survey-creator-core/survey-creator-core.min.css';
import surveyService from '../services/surveyService';
import './SurveyCreator.css';

const SurveyCreatorWrapper = () => {
  console.log("SurveyCreatorWrapper mounted");
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creatorReady, setCreatorReady] = useState(false);
  const [surveyJson, setSurveyJson] = useState({
    title: "New Survey",
    description: "Survey description",
    elements: []
  });
  const creatorRef = useRef(null);

  useEffect(() => {
    // Create the SurveyCreator instance
    const creator = new SurveyCreator({
      showLogicTab: false,
      isAutoSave: false,
      showTranslationTab: false,
      showJSONEditorTab: true,
      showEmbededSurveyTab: true,
      showTestSurveyTab: true,
      showSidebar: true,
      showToolbox: true,
      showPageNavigator: true
    });

    // Set up save function
    creator.saveSurveyFunc = async (saveNo, options = {}) => {
      try {
        setLoading(true);
        const currentSurveyJson = creator.JSON;
        console.log('Saving survey:', currentSurveyJson);
        
        // Convert SurveyJS JSON to your format
        const convertedSurvey = convertFromSurveyJSFormat(currentSurveyJson);
        
        if (surveyId) {
          await surveyService.updateSurvey(surveyId, convertedSurvey);
          // Navigate to dashboard after updating
          navigate('/');
        } else {
          const response = await surveyService.createSurvey(convertedSurvey);
          console.log('Create survey response:', response);
          if (response.data && response.data.id) {
            // Navigate to the dashboard instead of edit page
            navigate('/');
          } else {
            throw new Error('Failed to get survey ID from response');
          }
        }
        
        // Only call callback if it exists
        if (typeof options.callback === 'function') {
          options.callback(saveNo, true);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error saving survey:', err);
        setError('Failed to save survey. Please try again.');
        // Only call callback if it exists
        if (typeof options.callback === 'function') {
          options.callback(saveNo, false);
        }
        setLoading(false);
      }
    };

    // Store the creator reference
    creatorRef.current = creator;

    // Load existing survey if editing
    if (surveyId) {
      loadExistingSurvey(creator);
    } else {
      // Set the default survey
      creator.JSON = surveyJson;
    }

    // Mark creator as ready to trigger re-render
    setCreatorReady(true);

    // Cleanup function
    return () => {
      if (creatorRef.current) {
        creatorRef.current.dispose();
      }
      setCreatorReady(false);
    };
  }, [surveyId, navigate]);

  const loadExistingSurvey = async (creator) => {
    try {
      setLoading(true);
      const response = await surveyService.getSurveyById(surveyId);
      console.log('Loading existing survey:', response);
      
      if (!response.data) {
        throw new Error('Invalid survey data received from server');
      }

      // Convert your format to SurveyJS JSON
      const surveyJSJson = convertToSurveyJSFormat(response.data);
      creator.JSON = surveyJSJson;
      setSurveyJson(surveyJSJson);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading survey:', err);
      setError('Failed to load survey. Please try again.');
      setLoading(false);
    }
  };

  // Convert your survey format to SurveyJS JSON format
  const convertToSurveyJSFormat = (surveyData) => {
    const surveyJSJson = {
      title: surveyData.title,
      description: surveyData.description || '',
      pages: [
        {
          name: "page1",
          elements: surveyData.questions.map((question, index) => {
            const element = {
              name: `question_${index}`,
              title: question.questionText, // Always use questionText
              isRequired: question.required || false
            };

            switch (question.type) {
              case 'multiple-choice':
                element.type = 'checkbox';
                element.choices = question.options;
                break;
              case 'single-select':
                element.type = 'radiogroup';
                element.choices = question.options;
                break;
              case 'free-text':
                element.type = 'comment';
                break;
              default:
                element.type = 'text';
            }

            return element;
          })
        }
      ]
    };

    return surveyJSJson;
  };

  // Convert SurveyJS JSON format to your format
  const convertFromSurveyJSFormat = (surveyJSJson) => {
    const survey = {
      title: surveyJSJson.title || 'Untitled Survey',
      description: surveyJSJson.description || '',
      questions: []
    };

    // Extract questions from pages[].elements
    if (surveyJSJson.pages && Array.isArray(surveyJSJson.pages)) {
      surveyJSJson.pages.forEach((page, pageIndex) => {
        if (page.elements && Array.isArray(page.elements)) {
          page.elements.forEach((element, elementIndex) => {
            const question = {
              id: survey.questions.length + 1, // Use sequential IDs across all pages
              questionText: (element.title || element.name || `Question ${survey.questions.length + 1}`).trim(), // Changed from 'text' to 'questionText' and added trim()
              type: 'free-text', // Default type that will be overridden below
              required: element.isRequired || false,
              options: (element.choices || []).map(choice => {
                // Handle both string and object choices
                if (typeof choice === 'string') {
                  return choice.trim();
                } else if (choice && typeof choice === 'object' && choice.text) {
                  return choice.text.trim();
                }
                return String(choice).trim(); // Fallback for other types
              })
            };

            // Map SurveyJS types to backend types
            switch (element.type) {
              case 'checkbox':
                question.type = 'multiple-choice'; // Changed from multiple_choice to match backend
                break;
              case 'radiogroup':
                question.type = 'single-select'; // Changed from single_select to match backend
                break;
              case 'rating':
                question.type = 'single-select'; // Handle rating as single-select
                // Generate numeric options for rating
                const scale = element.rateMax || 5;
                question.options = Array.from({length: scale}, (_, i) => `${i + 1}`);
                break;
              case 'comment':
              case 'text':
              default:
                question.type = 'free-text'; // Changed from free_text to match backend
            }

            // Only add the question if it has valid questionText
            if (question.questionText.trim()) {
              survey.questions.push(question);
            }
          });
        }
      });
    }

    console.log('Converted Survey:', survey);
    return survey;
  };

  const handleSave = async () => {
    if (creatorRef.current) {
      creatorRef.current.saveSurvey();
    }
  };

  if (loading) {
    return (
      <div className="survey-creator-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading survey creator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-creator-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log('creatorRef.current:', creatorRef.current);
  console.log('surveyJson:', surveyJson);
  console.log('creatorReady:', creatorReady);
  
  return (
    <div className="survey-creator-container">
      <div className="creator-header">
        <div className="header-content">
          <h1>{surveyId ? 'Edit Survey' : 'Create New Survey'}</h1>
          <p>Use the drag-and-drop interface to build your survey</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-secondary"
            style={{ marginRight: '10px' }}
          >
            Back to Dashboard
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Survey'}
          </button>
        </div>
      </div>
      
      <div className="creator-content">
        {creatorReady && creatorRef.current && (
          <SurveyCreatorComponent creator={creatorRef.current} />
        )}
      </div>
    </div>
  );
};

export default SurveyCreatorWrapper; 