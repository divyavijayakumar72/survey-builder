import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import surveyService from '../services/surveyService';
import './TakeSurvey.css';

const TakeSurvey = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('name'); // 'name' or 'survey'
  const [respondentName, setRespondentName] = useState('');
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
      setError('Survey not found or no longer available.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (respondentName.trim()) {
      setStep('survey');
    }
  };

  const handleResponseChange = (questionIndex, value) => {
    setResponses(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const handleSubmitSurvey = async (e) => {
    e.preventDefault();
    
    // Validate required questions
    const requiredQuestions = survey.questions.filter((q, index) => q.required);
    const missingRequired = requiredQuestions.some((q, index) => {
      const questionIndex = survey.questions.indexOf(q);
      const response = responses[questionIndex];
      return !response || (Array.isArray(response) && response.length === 0) || (typeof response === 'string' && response.trim() === '');
    });

    if (missingRequired) {
      toast.error('Please answer all required questions.');
      return;
    }

    setSubmitting(true);

    try {
      const surveyResponse = {
        surveyId: survey.id,
        respondentName: respondentName.trim(),
        responses: survey.questions.map((question, index) => ({
          questionText: question.questionText,
          questionType: question.type,
          answer: responses[index] || ''
        })),
        submittedAt: new Date().toISOString()
      };

      console.log('Submitting survey response:', surveyResponse);
      
      const result = await surveyService.submitSurveyResponse(surveyResponse);
      console.log('Survey submission successful:', result);
      setStep('thankyou');
    } catch (error) {
      console.error('Error submitting survey:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
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

  const renderQuestion = (question, index) => {
    const currentResponse = responses[index] || '';

    switch (question.type) {
      case 'multiple-choice':
        return (
          <div className="question-options">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className="option-label">
                <input
                  type="checkbox"
                  checked={Array.isArray(currentResponse) && currentResponse.includes(option)}
                  onChange={(e) => {
                    const newResponse = Array.isArray(currentResponse) ? [...currentResponse] : [];
                    if (e.target.checked) {
                      newResponse.push(option);
                    } else {
                      const optionIndex = newResponse.indexOf(option);
                      if (optionIndex > -1) {
                        newResponse.splice(optionIndex, 1);
                      }
                    }
                    handleResponseChange(index, newResponse);
                  }}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'single-select':
        return (
          <div className="question-options">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className="option-label">
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option}
                  checked={currentResponse === option}
                  onChange={(e) => handleResponseChange(index, e.target.value)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'free-text':
        return (
          <textarea
            value={currentResponse}
            onChange={(e) => handleResponseChange(index, e.target.value)}
            placeholder="Enter your answer here..."
            className="text-input"
            rows={4}
          />
        );

      default:
        return null;
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
          <p>Your survey response has been submitted successfully.</p>
          <p>We appreciate your time and feedback.</p>
        </div>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="take-survey-container">
        <div className="name-form">
          <h2>{survey?.title}</h2>
          <p>Please enter your name to begin the survey.</p>
          <form onSubmit={handleNameSubmit}>
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
    );
  }

  return (
    <div className="take-survey-container">
      <div className="survey-form">
        <h2>{survey?.title}</h2>
        <p className="respondent-name">Respondent: {respondentName}</p>
        
        <form onSubmit={handleSubmitSurvey}>
          {survey?.questions.map((question, index) => (
            <div key={index} className="question-container">
              <h3 className="question-text">
                {index + 1}. {question.questionText}
                {question.required && <span className="required"> *</span>}
              </h3>
              {renderQuestion(question, index)}
            </div>
          ))}
          
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TakeSurvey; 