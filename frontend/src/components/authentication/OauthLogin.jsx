import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SERVER_URL } from "../lib/constants";
import logo from "../../assets/cmxlogo-removebg-preview.png";
import UserService from "../service/UserService";
import { apiFetch } from "../lib/apiFetch";

const OauthLogin = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [dots, setDots] = useState("");

  const isCallmaxEmail = (value) => {
    const trimmed = (value || "").trim().toLowerCase();
    return trimmed.endsWith("@callmaxsolutions.com");
  };

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  // const redirectPath = params.get("redirect") || "/home";

  const redirectPath =
    location.state?.from?.pathname || params.get("redirect") || "/tracker";

  const handleManualOtpLogin = async () => {
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!isCallmaxEmail(email)) {
      setError("Please use your Callmax email address.");
      return;
    }

    setIsSending(true);

    try {
      // ===============================
      // 1️⃣ CHECK EMAIL
      // ===============================
      const checkRes = await apiFetch(`${SERVER_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok || !checkData.success) {
        setError(checkData.error || "Email is not authorized.");
        return;
      }

      const user = checkData.user;

      if (user.userStatus?.toLowerCase() !== "active") {
        setError("This account is not active.");
        return;
      }

      // optional (UI only)
      UserService.setPendingUser(user);

      // ===============================
      // 2️⃣ SEND OTP (SECURE)
      // ===============================
      const otpRes = await apiFetch(`${SERVER_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress: email }),
      });

      if (!otpRes) return;

      // 🔥 HANDLE RATE LIMIT FIRST
      if (otpRes.status === 429) {
        const result = await otpRes.json();
        setError(result.message || "Too many requests. Please wait.");
        return;
      }

      const result = await otpRes.json();

      if (!otpRes.ok || !result.success) {
        setError(result.message || "Failed to send OTP.");
        return;
      }

      // ===============================
      // ✅ STORE SECURE DATA
      // ===============================
      localStorage.setItem("pendingChallengeId", result.challengeId);
      localStorage.setItem("pendingEmail", email);
      localStorage.setItem("pendingExpiryAt", result.expiresAt);
      localStorage.setItem("otpCooldownStart", Date.now());

      // ===============================
      // 3️⃣ GO TO OTP PAGE
      // ===============================
      navigate(
        `/OtpVerification?redirect=${encodeURIComponent(redirectPath)}`,
        {
          state: {
            emailAddress: email,
            flow: "login",
            redirectPath,
          },
        },
      );
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
    <div className="flex justify-center items-center min-h-screen bg-toolbar-gradient  px-4">
      <div className="bg-white p-8 md:p-10 rounded-lg shadow-xl w-full max-w-lg text-center">
        <img src={logo} alt="Callmax Logo" className="w-32 mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          RECRUITMENT PORTAL
        </h2>
        <span className="text-m text-gray-700">v10.10.7</span>

        <div className="mb-6 text-left">
          <label className="text-sm text-gray-700 mb-1 block">Email</label>
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // prevents accidental form submit / refresh
                handleManualOtpLogin();
              }
            }}
            className="w-full border rounded px-3 py-2 mb-3"
          />

          <button
            onClick={handleManualOtpLogin}
            disabled={isSending}
            className="w-full bg-[#162950] hover:bg-[#1c365f] text-white py-2 rounded"
          >
            {isSending ? "Sending OTP..." : "Login with OTP"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default OauthLogin;
