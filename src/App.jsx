import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SurveyDashboard from './components/SurveyDashboard';
import CreateSurvey from './components/CreateSurvey';
import SurveyPreview from './components/SurveyPreview';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<SurveyDashboard />} />
          <Route path="/create" element={<CreateSurvey />} />
          <Route path="/survey/:surveyId" element={<SurveyPreview />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
