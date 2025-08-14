import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Survey } from 'survey-react-ui';
import { Model } from 'survey-core';
import surveyService from '../services/surveyService';
import './TakeSurveyJS.css';

// Import SurveyJS styles
import 'survey-core/survey-core.min.css';

const TakeSurveyJS = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('name'); // 'name' or 'survey'
  const [respondentName, setRespondentName] = useState('');
  const [surveyModel, setSurveyModel] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      setLoading(true);
      const result = await surveyService.getSurveyById(surveyId);
      setSurvey(result.data);
      
      // Convert your current survey format to SurveyJS format
      const surveyJSJson = convertToSurveyJSFormat(result.data);
      const model = new Model(surveyJSJson);
      
      // Configure SurveyJS model
      model.showQuestionNumbers = "on";
      model.showProgressBar = "bottom";
      model.allowCompleteSurveyAutomatic = false;
      model.width = "100%";
      model.maxWidth = "700px";
      model.fitToContainer = true;
      model.showPageNumbers = false;
      model.showPageTitles = false;
      
      setSurveyModel(model);
    } catch (error) {
      console.error('Error fetching survey:', error);
      setError('Survey not found or no longer available.');
    } finally {
      setLoading(false);
    }
  };

  // Convert your current survey format to SurveyJS JSON format
  const convertToSurveyJSFormat = (surveyData) => {
    const surveyJSJson = {
      // Remove title to avoid duplicate - we already show it in the header
      description: surveyData.description || '',
      elements: surveyData.questions.map((question, index) => {
        const baseElement = {
          name: `question${index}`,
          title: question.questionText,
          isRequired: question.required
        };

        switch (question.type) {
          case 'multiple-choice':
            return {
              ...baseElement,
              type: 'checkbox',
              choices: question.options
            };
          
          case 'single-select':
            return {
              ...baseElement,
              type: 'radiogroup',
              choices: question.options
            };
          
          case 'free-text':
            return {
              ...baseElement,
              type: 'comment',
              rows: 4
            };
          
          default:
            return {
              ...baseElement,
              type: 'text'
            };
        }
      })
    };

    return surveyJSJson;
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (respondentName.trim()) {
      setStep('survey');
    }
  };

  const handleSurveyComplete = async (sender) => {
    setSubmitting(true);

    try {
      const surveyResponse = {
        surveyId: survey.id,
        respondentName: respondentName.trim(),
        responses: Object.keys(sender.data).map(key => {
          const questionIndex = parseInt(key.replace('question', ''));
          const question = survey.questions[questionIndex];
          return {
            questionText: question.questionText,
            questionType: question.type,
            answer: sender.data[key]
          };
        }),
        submittedAt: new Date().toISOString()
      };

      console.log('Submitting survey response:', surveyResponse);
      
      const result = await surveyService.submitSurveyResponse(surveyResponse);
      console.log('Survey submission successful:', result);
      setStep('thankyou');
    } catch (error) {
      console.error('Error submitting survey:', error);
      
      let errorMessage = 'Error submitting survey. Please try again.';
      
      if (error.message) {
        if (error.message.includes('404')) {
          errorMessage = 'Survey not found. Please check the survey link.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid survey data. Please check your answers.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="take-survey-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="take-survey-container">
        <div className="error-state">
          <h2>Survey Not Found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (step === 'thankyou') {
    return (
      <div className="take-survey-container">
        <div className="thank-you-state">
          <h2>Thank You!</h2>
          <p>Your response has been submitted successfully.</p>
          <button 
            onClick={() => {
              setRespondentName('');
              setStep('name');
            }} 
            className="btn btn-primary"
          >
            Take Survey Again
          </button>
        </div>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="take-survey-container">
        <div className="survey-card">
          <div className="name-entry">
            <h2>{survey?.title}</h2>
            <p>Please enter your name to begin the survey.</p>
            <form onSubmit={handleNameSubmit} className="name-form">
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="Enter your name"
                className="name-input"
                required
              />
              <button type="submit" className="btn btn-primary">
                Start Survey
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="take-survey-container">
      <div className="survey-card">
        <div className="survey-header">
          <h2>{survey?.title}</h2>
          <p>Respondent: {respondentName}</p>
        </div>
        
        <div className="survey-content">
          {surveyModel && (
            <div className="surveyjs-wrapper">
              <Survey
                model={surveyModel}
                onComplete={handleSurveyComplete}
              />
            </div>
          )}
        </div>
      </div>
      
      {submitting && (
        <div className="submitting-overlay">
          <div className="spinner"></div>
          <p>Submitting your response...</p>
        </div>
      )}
    </div>
  );
};

export default TakeSurveyJS; 