// src/App.jsx
import React, { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./App.css";
import ProfilePage from "./components/common/ProfilePage";
import UserService from "./components/service/UserService";
import AccessDenied from "./components/common/AccessDenied";
import Admin from "./components/Routes/Admin";
import OauthLogin from "./components/authentication/OauthLogin";
import Register from "./components/authentication/Register";
import OtpVerification from "./components/authentication/OtpVerification";
import JobPosting from "./components/Routes/JobPosting";
import TypingTest from "./components/Routes/TypingTest";
import EOLAssessment from "./components/Routes/EOLAssessment";
import RecruitmentTracker from "./components/Routes/RecruitmentTracker";
import Dashboard from "./components/Routes/Dashboard";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = UserService.isAuthenticated();

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<OauthLogin />} />
          <Route path="/OauthLogin" element={<OauthLogin />} />
          <Route path="/Register" element={<Register />} />
          <Route path="/OtpVerification" element={<OtpVerification />} />

          {/* Authenticated Routes */}
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <ProfilePage />
              ) : (
                <Navigate to="/OauthLogin" replace />
              )
            }
          />

          <Route
            path="/home"
            element={
              isAuthenticated && UserService.hasRole(["Admin"]) ? (
                <Dashboard />
              ) : (
                <AccessDenied />
              )
            }
          />

          <Route
            path="/tracker"
            element={
              isAuthenticated && UserService.hasRole(["Admin"]) ? (
                <RecruitmentTracker />
              ) : (
                <AccessDenied />
              )
            }
          />

          <Route
            path="/EOLAssessment"
            element={
              isAuthenticated && UserService.hasRole(["Admin"]) ? (
                <EOLAssessment />
              ) : (
                <AccessDenied />
              )
            }
          />

          <Route
            path="/typingtest"
            element={
              isAuthenticated && UserService.hasRole(["Admin"]) ? (
                <TypingTest />
              ) : (
                <AccessDenied />
              )
            }
          />

          <Route
            path="/jobposting"
            element={
              isAuthenticated && UserService.hasRole(["Admin"]) ? (
                <JobPosting />
              ) : (
                <AccessDenied />
              )
            }
          />

          <Route
            path="/admin"
            element={
              isAuthenticated && UserService.hasRole(["Admin"]) ? (
                <Admin />
              ) : (
                <AccessDenied />
              )
            }
          />

          {/* <Route
            path="/training"
            element={
              isAuthenticated && UserService.hasRole(["Admin", "Manager"]) ? (
                <TrainingPage />
              ) : (
                <AccessDenied />
              )
            }
          /> */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
