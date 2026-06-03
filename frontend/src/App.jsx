// src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";

import "./App.css";
import ProfilePage from "./components/common/ProfilePage";
import UserService from "./components/service/UserService";
import AccessDenied from "./components/common/AccessDenied";
import OauthLogin from "./components/authentication/OauthLogin";
import OtpVerification from "./components/authentication/OtpVerification";
import JobPosting from "./components/Routes/JobPosting";
import TypingTest from "./components/Routes/TypingTest";
import EOLAssessment from "./components/Routes/EOLAssessment";
import RecruitmentTracker from "./components/Routes/RecruitmentTracker";
import Dashboard from "./components/Routes/Dashboard";

import SessionExpiredModal from "./components/common/SessionExpiredModal";
import SessionWarningModal from "./components/common/SessionWarningModal";
import IdleWarningModal from "./components/common/IdleWarningModal";

import useUnifiedSessionTimer from "./components/lib/useUnifiedSessionTimer";

import { SERVER_URL } from "./components/lib/constants";
import { useCsrfStore } from "./components/store/csrfStore";
import { getCSRFToken } from "./components/service/CSRFService";

function RequireAuth({ isAuthed }) {
  const location = useLocation();

  if (isAuthed === false) {
    return (
      <Navigate to="/OauthLogin" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}

/*
========================================
🔐 ROLE GUARD
========================================
*/
function RequireAdminOrHigher({ user }) {
  const adminRoles = ["Admin", "Super Admin", "Recruiter"];
  const location = useLocation();

  if (!adminRoles.includes(user?.userLevel)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
/*
========================================
🔐 REDIRECT IF AUTHED
========================================
*/
function RedirectIfAuthenticated({ isAuthed, children }) {
  return isAuthed === true ? <Navigate to="/tracker" replace /> : children;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = UserService.isAuthenticated();
  const [isAuthed, setIsAuthed] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { csrfToken } = useCsrfStore();

  /*
  ========================================
  🔁 REDIRECT
  ========================================
  */
  const handleLoginRedirect = useCallback(() => {
    window.location.href = "/OauthLogin";
  }, []);

  /*
  ========================================
  🔒 EXPIRE
  ========================================
  */
  const handleExpire = useCallback(async () => {
    try {
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });
    } catch (e) {}

    setSessionExpired(true);
    setIsAuthed(false);
    setUser(null);
    setHasSession(false);

    window.__SESSION_EXPIRED__ = true;
  }, []);

  /*
  ========================================
  🔍 SESSION CHECK
  ========================================
  */
  useEffect(() => {
    const publicPaths = ["/", "/OauthLogin", "/OTP-SECURE", "/OtpVerification"];
    const isPublicPath = publicPaths.includes(location.pathname);

    const checkSession = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/auth/session`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { "X-CSRF-Token": csrfToken },
        });

        const contentType = res.headers.get("content-type") || "";

        // ✅ VALID SESSION
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();

          if (data.success && data.user) {
            setUser(data.user);
            setIsAuthed(true);
            setHasSession(true); // optional (can keep)
            const csrfToken = await getCSRFToken();
            useCsrfStore.getState().setCsrfToken(csrfToken);
            return;
          }
        }

        // ❌ INVALID / EXPIRED SESSION
        if (!isPublicPath) {
          handleExpire(); // 🔥 FORCE EXPIRE (single source of truth)
        } else {
          setUser(null);
          setIsAuthed(false);
        }
      } catch (err) {
        console.error("Session check failed:", err);

        // 🔥 ALWAYS EXPIRE on failure (safe default)
        if (!isPublicPath) {
          handleExpire();
        } else {
          setUser(null);
          setIsAuthed(false);
        }
      }
    };

    if (window.__SESSION_EXPIRED__) return;

    checkSession();
  }, [location.pathname, handleExpire]);

  /*
  ========================================
  🔔 GLOBAL SESSION EXPIRED
  ========================================
  */
  useEffect(() => {
    const onSessionExpired = () => handleExpire();

    window.addEventListener("session-expired", onSessionExpired);
    return () =>
      window.removeEventListener("session-expired", onSessionExpired);
  }, [handleExpire]);

  /*
  ========================================
  ⏳ TIMERS
  ========================================
  */
  const { showWarning, formattedTime, resetSession } =
    useUnifiedSessionTimer(handleExpire);

  /*
  ========================================
  ⏳ LOADING
  ========================================
  */
  if (isAuthed === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="flex-grow">
        <Routes>
          <Route
            path="/"
            element={
              <RedirectIfAuthenticated isAuthed={isAuthed}>
                <OauthLogin />
              </RedirectIfAuthenticated>
            }
          />

          <Route
            path="/OauthLogin"
            element={
              <RedirectIfAuthenticated isAuthed={isAuthed}>
                <OauthLogin />
              </RedirectIfAuthenticated>
            }
          />

          <Route path="/OtpVerification" element={<OtpVerification />} />

          {/* Authenticated Routes */}
          <Route element={<RequireAuth isAuthed={isAuthed} />}>
            <Route element={<RequireAdminOrHigher user={user} />}>
              <Route path="/home" element={<Dashboard user={user} />} />
              <Route
                path="/tracker"
                element={<RecruitmentTracker user={user} />}
              />
              <Route
                path="/EOLAssessment"
                element={<EOLAssessment user={user} />}
              />
              <Route path="/typingtest" element={<TypingTest user={user} />} />
              <Route path="/jobposting" element={<JobPosting user={user} />} />
            </Route>
          </Route>
        </Routes>

        <SessionExpiredModal
          show={sessionExpired}
          onLogin={handleLoginRedirect}
        />

        <SessionWarningModal
          show={showWarning && !sessionExpired}
          timeLeft={formattedTime}
          onStayActive={resetSession}
        />
      </div>
    </div>
  );
}

export default App;
