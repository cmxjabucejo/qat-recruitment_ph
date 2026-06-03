import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import cmxLogo from "../../assets/cmxlogo-removebg-preview.png";
import { SERVER_URL } from "../lib/constants.js";
import "./Header.css";
import { useCsrfStore } from "../store/csrfStore.js";

/*
========================================
LOGOUT CONFIRMATION MODAL
========================================
*/
const LogoutModal = ({ isVisible, isLoggingOut, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
      onClick={isLoggingOut ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
            />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-slate-800">Confirm Logout</h2>

        <p className="mt-2 text-sm text-slate-600">
          Are you sure you want to log out?
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoggingOut}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
};

/*
========================================
HEADER
========================================
This header gets the logged-in user from Redis-backed session through /auth/me.

Backend required:
router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.session.user,
  });
});
========================================
*/
const Header = ({
  userName = "",
  userid = "",
  userLevel = "",
  pageTitle = "",
}) => {
  const navigate = useNavigate();

  const [sessionUser, setSessionUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { csrfToken } = useCsrfStore;

  useEffect(() => {
    let mounted = true;

    const fetchCurrentUser = async () => {
      setIsUserLoading(true);

      try {
        const res = await fetch(`${SERVER_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            navigate("/OauthLogin", { replace: true });
          }

          return;
        }

        const data = await res.json();

        if (mounted && data?.success && data?.user) {
          setSessionUser(data.user);
        }
      } catch (err) {
        console.error("Failed to load current user:", err);
      } finally {
        if (mounted) {
          setIsUserLoading(false);
        }
      }
    };

    fetchCurrentUser();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const displayName =
    sessionUser?.fullName ||
    sessionUser?.user_full_name ||
    sessionUser?.name ||
    userName ||
    "User";

  const displayUserId =
    sessionUser?.userid ||
    sessionUser?.userEmail ||
    sessionUser?.user_email ||
    sessionUser?.email ||
    userid ||
    "";

  const displayUserLevel =
    sessionUser?.userLevel ||
    sessionUser?.user_access_level ||
    sessionUser?.role ||
    userLevel ||
    "";

  const getInitials = (name) => {
    if (!name) return "U";

    const parts = String(name).trim().split(" ").filter(Boolean);

    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
      });
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      localStorage.removeItem("name");
      localStorage.removeItem("fullName");
      localStorage.removeItem("userid");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userLevel");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      sessionStorage.clear();

      setSessionUser(null);
      setIsLogoutModalVisible(false);
      setIsLoggingOut(false);

      navigate("/OauthLogin", { replace: true });
    }
  };

  return (
    <>
      <header className="w-full border-b border-white/60 bg-gradient-to-r from-[#e8f0fe] via-white to-[#e8f0fe] shadow-sm backdrop-blur">
        <div className="flex w-full items-center justify-between px-4 py-2">
          {/* LEFT: Logo + App Title */}
          <div className="flex items-center gap-3">
            <img src={cmxLogo} alt="CMX Logo" className="h-8 object-contain" />

            <div>
              <h1 className="text-lg font-semibold tracking-wide text-slate-800">
                Recruitment Management Hub
              </h1>
            </div>
          </div>

          {/* RIGHT: User Display + Logout Trigger */}
          <button
            type="button"
            onClick={() => setIsLogoutModalVisible(true)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/80 hover:shadow-sm"
            title="Click to logout"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
              {isUserLoading ? "..." : getInitials(displayName)}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-[220px] truncate text-sm font-semibold text-slate-800">
                {isUserLoading ? "Loading user..." : displayName}
              </p>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="hidden h-4 w-4 text-slate-500 sm:block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </header>

      <LogoutModal
        isVisible={isLogoutModalVisible}
        isLoggingOut={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalVisible(false)}
      />
    </>
  );
};

export default Header;
