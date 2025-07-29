import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SurveyDashboard from './components/SurveyDashboard';
import CreateSurvey from './components/CreateSurvey';
import SurveyPreview from './components/SurveyPreview';
import TakeSurvey from './components/TakeSurvey';
import ResponsesDashboard from './components/ResponsesDashboard';
import RecipientDetails from './components/RecipientDetails';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<SurveyDashboard />} />
          <Route path="/create" element={<CreateSurvey />} />
          <Route path="/survey/:surveyId" element={<SurveyPreview />} />
          <Route path="/take/:surveyId" element={<TakeSurvey />} />
          <Route path="/responses" element={<ResponsesDashboard />} />
          <Route path="/responses/survey/:surveyId" element={<ResponsesDashboard />} />
          <Route path="/responses/recipient/:recipientName" element={<RecipientDetails />} />
        </Routes>
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
