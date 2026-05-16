import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./components/About.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import ChangePassword from "./components/ChangePassword.jsx";
import Confirmation from "./components/Confirmation.jsx";
import CreateHackathon from "./components/CreateHackathon.jsx";
import EvaluationSubmitted from "./components/EvaluationSubmitted.jsx";
import Evaluation from "./components/Evaluation.jsx";
import HackathonCreated from "./components/HackathonCreated.jsx";
import HackathonDetails from "./components/HackathonDetails.jsx";
import Hackathons from "./components/Hackathons.jsx";
import History from "./components/History.jsx";
import Home from "./components/Home.jsx";
import JudgeDashboard from "./components/JudgeDashboard.jsx";
import Login from "./components/Login.jsx";
import ManageHackathons from "./components/ManageHackathons.jsx";
import ManageUsers from "./components/ManageUsers.jsx";
import MentorDashboard from "./components/MentorDashboard.jsx";
import OrganizerDashboard from "./components/OrganizerDashboard.jsx";
import ParticipantDashboard from "./components/ParticipantDashboard.jsx";
import RecoverPassword from "./components/RecoverPassword.jsx";
import Register from "./components/Register.jsx";
import Settings from "./components/Settings.jsx";
import SubmitProject from "./components/SubmitProject.jsx";
import VerifyCode from "./components/VerifyCode.jsx";
import ViewSubmissions from "./components/ViewSubmissions.jsx";
import ScoringConfig from "./components/ScoringConfig.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/about" element={<About />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/create-hackathon" element={<CreateHackathon />} />
        <Route path="/evaluation-submitted" element={<EvaluationSubmitted />} />
        <Route path="/evaluation" element={<Evaluation />} />
        <Route path="/hackathon-created" element={<HackathonCreated />} />
        <Route path="/hackathon-details/:id" element={<HackathonDetails />} />
        <Route path="/hackathons" element={<Hackathons />} />
        <Route path="/history" element={<History />} />
        <Route path="/" element={<Home />} />
        <Route path="/judge-dashboard" element={<JudgeDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/manage-hackathons" element={<ManageHackathons />} />
        <Route path="/manage-users" element={<ManageUsers />} />
        <Route path="/mentor-dashboard" element={<MentorDashboard />} />
        <Route path="/organizer-dashboard" element={<OrganizerDashboard />} />
        <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
        <Route path="/recover-password" element={<RecoverPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/submit-project" element={<SubmitProject />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/view-submissions" element={<ViewSubmissions />} />
        <Route path="/scoring-config" element={<ScoringConfig />} />
      </Routes>
    </BrowserRouter>
  );
}
