import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SERVER_URL } from "../lib/constants";
import logo from "../../assets/cmxlogo-removebg-preview.png";
import { apiFetch } from "../lib/apiFetch";

const AUTH_GENERIC_MESSAGE = "Invalid credentials or authentication request";

const OauthLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [dots, setDots] = useState("");

  const params = new URLSearchParams(location.search);

  const redirectPath =
    location.state?.from?.pathname || params.get("redirect") || "/tracker";

  const isCallmaxEmail = (value) => {
    const trimmed = (value || "").trim().toLowerCase();
    return trimmed.endsWith("@callmaxsolutions.com");
  };

  const handleManualOtpLogin = async () => {
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isCallmaxEmail(normalizedEmail)) {
      setError("Please use your Callmax email address.");
      return;
    }

    setIsSending(true);

    try {
      /*
      ========================================
      1. CHECK EMAIL
      ========================================
      Security hardening:
      The backend now returns a generic response and does NOT return user data.
      Do not check checkData.user, userStatus, or userLevel here.
      */
      const checkRes = await apiFetch(`${SERVER_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const checkData = await checkRes.json().catch(() => ({}));

      if (!checkRes.ok || !checkData.success) {
        setError(checkData.message || AUTH_GENERIC_MESSAGE);
        return;
      }

      /*
      ========================================
      2. SEND OTP
      ========================================
      For invalid/inactive users, backend returns the same generic shape.
      The frontend should not reveal whether the email exists.
      */
      const otpRes = await apiFetch(`${SERVER_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress: normalizedEmail }),
      });

      if (!otpRes) return;

      const otpData = await otpRes.json().catch(() => ({}));

      if (otpRes.status === 429) {
        setError(otpData.message || "Too many requests. Please wait.");
        return;
      }

      if (!otpRes.ok || !otpData.success || !otpData.challengeId) {
        setError(otpData.message || AUTH_GENERIC_MESSAGE);
        return;
      }

      /*
      ========================================
      3. STORE OTP SESSION
      ========================================
      */
      localStorage.setItem("pendingChallengeId", otpData.challengeId);
      localStorage.setItem("pendingEmail", normalizedEmail);
      localStorage.setItem("pendingExpiryAt", otpData.expiresAt);
      localStorage.setItem("otpCooldownStart", Date.now().toString());

      /*
      ========================================
      4. GO TO OTP PAGE
      ========================================
      */
      navigate(`/OtpVerification?redirect=${encodeURIComponent(redirectPath)}`, {
        state: {
          emailAddress: normalizedEmail,
          flow: "login",
          redirectPath,
        },
      });
    } catch (err) {
      console.error("OTP login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!isSending) {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isSending]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-toolbar-gradient px-4">
      <div className="bg-white p-8 md:p-10 rounded-lg shadow-xl w-full max-w-lg text-center">
        <img src={logo} alt="Callmax Logo" className="w-32 mx-auto mb-6" />

        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          RECRUITMENT PORTAL
        </h2>

        <span className="text-m text-gray-700">v10.10.7</span>

        <div className="mb-6 text-left mt-4">
          <label className="text-sm text-gray-700 mb-1 block">Email</label>

          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!isSending) handleManualOtpLogin();
              }
            }}
            disabled={isSending}
            className="w-full border rounded px-3 py-2 mb-3 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleManualOtpLogin}
            disabled={isSending}
            className="w-full bg-[#162950] hover:bg-[#1c365f] text-white py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSending ? `Sending OTP${dots}` : "Login with OTP"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default OauthLogin;