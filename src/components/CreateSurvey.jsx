import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import surveyService from '../services/surveyService';
import './CreateSurvey.css';

const CreateSurvey = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [questions, setQuestions] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [surveyTitle, setSurveyTitle] = useState('My Survey');
  const [isEditMode, setIsEditMode] = useState(false);
  const [surveyId, setSurveyId] = useState(null);
  const [originalSurveyData, setOriginalSurveyData] = useState(null);
  const [hasResponses, setHasResponses] = useState(false);
  const [lockedQuestionIds, setLockedQuestionIds] = useState(new Set());
  const [newQuestion, setNewQuestion] = useState({
    type: 'multiple-choice',
    label: '',
    options: ['', ''],
    required: false
  });
  
  const questionLabelRef = useRef(null);

  const questionTypes = [
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'single-select', label: 'Single Select' },
    { value: 'free-text', label: 'Free Text' }
  ];

  // Check for edit mode and pre-populate data
  useEffect(() => {
    if (location.state?.editMode && location.state?.surveyData) {
      const surveyData = location.state.surveyData;
      setIsEditMode(true);
      setSurveyId(surveyData.id);
      setSurveyTitle(surveyData.title);
      setOriginalSurveyData(surveyData);
      
      // Convert API format to component format
      const convertedQuestions = surveyData.questions.map(q => ({
        id: Date.now() + Math.random(), // Generate unique ID
        type: q.type,
        label: q.questionText,
        options: q.type === 'free-text' ? [] : q.options,
        required: q.required
      }));
      
      setQuestions(convertedQuestions);
      
      // Check if survey has responses and set up locked questions
      checkSurveyResponses(surveyData.id);
    }
  }, [location.state]);

  // Auto-focus question label when form appears
  useEffect(() => {
    if (showAddForm && questionLabelRef.current) {
      questionLabelRef.current.focus();
    }
  }, [showAddForm]);

  const resetNewQuestion = () => {
    setNewQuestion({
      type: 'multiple-choice',
      label: '',
      options: ['', ''],
      required: false
    });
  };

  const showAddQuestionForm = () => {
    setShowAddForm(true);
    resetNewQuestion();
  };

  const cancelAddQuestion = () => {
    setShowAddForm(false);
    resetNewQuestion();
  };

  const updateNewQuestion = (field, value) => {
    setNewQuestion(prev => ({ ...prev, [field]: value }));
  };

  const addOptionToNew = () => {
    setNewQuestion(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOptionInNew = (index, value) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options.map((opt, idx) => idx === index ? value : opt)
    }));
  };

  const removeOptionFromNew = (index) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== index)
    }));
  };

  const isFormValid = () => {
    const isChoiceType = newQuestion.type === 'multiple-choice' || newQuestion.type === 'single-select';
    const hasValidLabel = newQuestion.label.trim().length > 0;
    
    if (isChoiceType) {
      const validOptions = newQuestion.options.filter(opt => opt.trim().length > 0);
      return hasValidLabel && validOptions.length >= 2;
    }
    
    return hasValidLabel;
  };

  const saveNewQuestion = () => {
    if (!isFormValid()) return;

    const questionToAdd = {
      id: Date.now(),
      type: newQuestion.type,
      label: newQuestion.label.trim(),
      required: newQuestion.required,
      options: newQuestion.type === 'free-text' ? [] : newQuestion.options.filter(opt => opt.trim().length > 0)
    };

    setQuestions([...questions, questionToAdd]);
    setShowAddForm(false);
    resetNewQuestion();
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (editingQuestion === id) {
      setEditingQuestion(null);
    }
  };

  const addOption = (questionId) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...q.options, ''] }
        : q
    ));
  };

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.map((opt, idx) => 
              idx === optionIndex ? value : opt
            )
          }
        : q
    ));
  };

  const removeOption = (questionId, optionIndex) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.filter((_, idx) => idx !== optionIndex)
          }
        : q
    ));
  };

  const toggleEdit = (questionId) => {
    setEditingQuestion(editingQuestion === questionId ? null : questionId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (questions.length === 0) {
      alert('Please add at least one question to your survey before submitting.');
      return;
    }

    // Prepare survey data for API - explicitly set as draft/unpublished
    const surveyData = {
      title: surveyTitle,
      questions: questions.map(q => ({
        questionText: q.label,
        type: q.type,
        options: q.type === 'free-text' ? [] : q.options,
        required: q.required
      })),
      submitted: false // Explicitly ensure survey remains unpublished
    };

    try {
      let result;
      if (isEditMode) {
        result = await surveyService.updateSurvey(surveyId, surveyData);
      } else {
        result = await surveyService.createSurvey(surveyData);
      }

      const message = isEditMode ? 'Survey updated successfully!' : 'Survey saved successfully!';
      console.log(message);
      alert(message);
      
      // Navigate back to dashboard after successful save/update
      navigate('/');
    } catch (error) {
      console.error('Error saving survey:', error);
      alert(`Error saving survey: ${error.message}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (questions.length === 0) {
      alert('Please add at least one question to your survey before saving.');
      return;
    }

    // Prepare survey data for API - explicitly set as draft/unpublished
    const surveyData = {
      title: surveyTitle,
      questions: questions.map(q => ({
        questionText: q.label,
        type: q.type,
        options: q.type === 'free-text' ? [] : q.options,
        required: q.required
      })),
      submitted: false // Explicitly ensure survey remains unpublished
    };

    // If editing a published survey, ensure it's marked as draft
    if (isEditMode && originalSurveyData?.submitted) {
      surveyData.submitted = false;
    }

    try {
      let result;
      if (isEditMode) {
        result = await surveyService.updateSurvey(surveyId, surveyData);
      } else {
        result = await surveyService.createSurvey(surveyData);
      }

      const message = isEditMode ? 'Survey updated successfully!' : 'Survey saved as draft successfully!';
      console.log(message);
      alert(message);
      
      // Navigate back to dashboard after successful save/update
      navigate('/');
    } catch (error) {
      console.error('Error saving survey:', error);
      alert(`Error saving survey: ${error.message}`);
    }
  };

  const handleSubmitSurvey = async (e) => {
    e.preventDefault();
    
    if (questions.length === 0) {
      alert('Please add at least one question to your survey before submitting.');
      return;
    }

    // Prepare survey data for API - explicitly set as draft before submitting
    const surveyData = {
      title: surveyTitle,
      questions: questions.map(q => ({
        questionText: q.label,
        type: q.type,
        options: q.type === 'free-text' ? [] : q.options,
        required: q.required
      })),
      submitted: false // Explicitly ensure survey is unpublished before submitting
    };

    try {
      // First save the survey
      let saveResult;
      if (isEditMode) {
        saveResult = await surveyService.updateSurvey(surveyId, surveyData);
      } else {
        saveResult = await surveyService.createSurvey(surveyData);
      }

      const surveyIdToSubmit = isEditMode ? surveyId : saveResult.data.id;

      // Then mark as submitted
      await surveyService.submitSurvey(surveyIdToSubmit);

      alert('Survey submitted successfully!');
      // Navigate back to dashboard after successful submission
      navigate('/');
    } catch (error) {
      console.error('Network error:', error);
      alert(`Error submitting survey: ${error.message}`);
    }
  };

  const checkSurveyResponses = async (surveyId) => {
    try {
      const responsesResult = await surveyService.getSurveyResponses(surveyId);
      const responses = responsesResult.data.responses || [];
      
      if (responses.length > 0) {
        setHasResponses(true);
        // Lock all existing questions (original questions from the survey)
        const originalQuestionIds = new Set();
        originalSurveyData?.questions.forEach((_, index) => {
          originalQuestionIds.add(index);
        });
        setLockedQuestionIds(originalQuestionIds);
      }
    } catch (error) {
      console.error('Error checking survey responses:', error);
      // If we can't check responses, assume no responses for safety
      setHasResponses(false);
    }
  };

  const isQuestionLocked = (questionIndex) => {
    return hasResponses && lockedQuestionIds.has(questionIndex);
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const renderAddQuestionForm = () => {
    const isChoiceType = newQuestion.type === 'multiple-choice' || newQuestion.type === 'single-select';

    return (
      <div className="add-question-form">
        <div className="form-header">
          <h3>Add New Question</h3>
          <div className="form-actions">
            <button
              onClick={saveNewQuestion}
              disabled={!isFormValid()}
              className="btn btn-primary"
            >
              Save Question
            </button>
            <button
              onClick={cancelAddQuestion}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="form-content">
          <div className="form-group">
            <label>Question Type:</label>
            <select
              value={newQuestion.type}
              onChange={(e) => updateNewQuestion('type', e.target.value)}
              className="form-control"
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Question Label:</label>
            <input
              ref={questionLabelRef}
              type="text"
              value={newQuestion.label}
              onChange={(e) => updateNewQuestion('label', e.target.value)}
              placeholder="e.g. What is your favorite color?"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={newQuestion.required}
                onChange={(e) => updateNewQuestion('required', e.target.checked)}
              />
              Required
            </label>
          </div>

          {isChoiceType && (
            <div className="options-section">
              <label>Options:</label>
              {newQuestion.options.map((option, index) => (
                <div key={index} className="option-row">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOptionInNew(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="form-control"
                  />
                  {newQuestion.options.length > 1 && (
                    <button
                      onClick={() => removeOptionFromNew(index)}
                      className="btn btn-danger btn-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addOptionToNew}
                className="btn btn-success"
              >
                Add Option
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuestionEditor = (question) => {
    const isEditing = editingQuestion === question.id;
    const isChoiceType = question.type === 'multiple-choice' || question.type === 'single-select';
    const questionIndex = questions.indexOf(question);
    const isLocked = isQuestionLocked(questionIndex);

    return (
      <div key={question.id} className={`question-card ${isLocked ? 'locked' : ''}`}>
        <div className="question-header">
          <h3>
            Question {questionIndex + 1}
            {isLocked && <span className="lock-icon">🔒</span>}
          </h3>
          <div className="question-actions">
            {!isLocked && (
              <button 
                onClick={() => toggleEdit(question.id)}
                className="btn btn-warning"
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
            )}
            {!isLocked && (
              <button 
                onClick={() => deleteQuestion(question.id)}
                className="btn btn-danger"
              >
                Delete
              </button>
            )}
            {isLocked && (
              <span className="locked-message">Locked (has responses)</span>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="question-editor">
            <div className="form-group">
              <label>Question Type:</label>
              <select
                value={question.type}
                onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                className={`form-control ${isLocked ? 'disabled' : ''}`}
                disabled={isLocked}
              >
                {questionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Question Label:</label>
              <input
                type="text"
                value={question.label}
                onChange={(e) => updateQuestion(question.id, 'label', e.target.value)}
                placeholder="Enter your question here..."
                className={`form-control ${isLocked ? 'disabled' : ''}`}
                disabled={isLocked}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => updateQuestion(question.id, 'required', e.target.checked)}
                  disabled={isLocked}
                />
                Required
              </label>
            </div>

            {isChoiceType && (
              <div className="options-section">
                <label>Options:</label>
                {question.options.map((option, index) => (
                  <div key={index} className="option-row">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(question.id, index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className={`form-control ${isLocked ? 'disabled' : ''}`}
                      disabled={isLocked}
                    />
                    {question.options.length > 1 && !isLocked && (
                      <button
                        onClick={() => removeOption(question.id, index)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {!isLocked && (
                  <button
                    onClick={() => addOption(question.id)}
                    className="btn btn-success"
                  >
                    Add Option
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="question-display">
            <p><strong>Type:</strong> {questionTypes.find(t => t.value === question.type)?.label}</p>
            <p><strong>Question:</strong> {question.label || 'No question text'}</p>
            <p><strong>Required:</strong> {question.required ? 'Yes' : 'No'}</p>
            {isChoiceType && question.options.length > 0 && (
              <div>
                <strong>Options:</strong>
                <ul>
                  {question.options.map((option, index) => (
                    <li key={index}>{option || `Option ${index + 1}`}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    return (
      <div className="preview-container">
        <h2>Survey Preview</h2>
        {questions.length === 0 ? (
          <p>No questions added yet. Add some questions to see the preview.</p>
        ) : (
          <form className="survey-form" onSubmit={handleSubmit}>
            <div className="survey-title-section">
              <h3>{surveyTitle}</h3>
            </div>
            {questions.map((question, index) => (
              <div key={question.id} className="preview-question">
                <label className="question-label">
                  {index + 1}. {question.label || 'Question text'}
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
                        <input type="radio" name={`question-${question.id}`} />
                        {option || `Option ${optIndex + 1}`}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="checkbox-group">
                    {question.options.map((option, optIndex) => (
                      <label key={optIndex} className="checkbox-option">
                        <input type="checkbox" name={`question-${question.id}`} />
                        {option || `Option ${optIndex + 1}`}
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
              <button type="button" onClick={handleSubmitSurvey} className="btn btn-primary">
                Submit Survey
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="create-survey">
      <div className="survey-header">
        <h1>{isEditMode ? 'Edit Survey' : 'Create Survey'}</h1>
        <div className="header-actions">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="btn btn-primary"
          >
            {previewMode ? 'Edit Survey' : 'Preview Survey'}
          </button>
          <button
            onClick={handleBackToDashboard}
            className="btn btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {previewMode ? (
        renderPreview()
      ) : (
        <div className="survey-builder">
          <div className="survey-title-input">
            <div className="form-group">
              <label>Survey Title:</label>
              <input
                type="text"
                value={surveyTitle}
                onChange={(e) => setSurveyTitle(e.target.value)}
                placeholder="Enter survey title..."
                className="form-control"
              />
            </div>
          </div>
          
          <div className="builder-actions">
            <button 
              onClick={showAddQuestionForm} 
              className="btn btn-primary"
              disabled={showAddForm}
            >
              Add Question
            </button>
          </div>

          <div className="questions-container">
            {showAddForm && renderAddQuestionForm()}
            
            {questions.length === 0 && !showAddForm ? (
              <div className="empty-state">
                <p>No questions added yet. Click "Add Question" to get started!</p>
              </div>
            ) : (
              questions.map(renderQuestionEditor)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSurvey; 