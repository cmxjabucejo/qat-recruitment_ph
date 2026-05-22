import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/constants";
import { apiFetch } from "../lib/apiFetch";

const AUTH_GENERIC_MESSAGE = "Invalid credentials or authentication request";
const AUTH_GENERIC_SUCCESS =
  "If the account is eligible, a verification code will be sent.";

const OtpVerification = () => {
  const otpRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [enteredOtp, setEnteredOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailAddress, setEmailAddress] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendDots, setResendDots] = useState("");

  /*
  ========================================
  FORMATTERS
  ========================================
  */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /*
  ========================================
  INIT OTP SESSION + TIMER
  ========================================
  */
  useEffect(() => {
    const email =
      location.state?.emailAddress || localStorage.getItem("pendingEmail");

    const challengeId = localStorage.getItem("pendingChallengeId");
    const expiry = localStorage.getItem("pendingExpiryAt");

    if (!email || !challengeId || !expiry) {
      setError(AUTH_GENERIC_MESSAGE);
      return;
    }

    setEmailAddress(email);
    localStorage.setItem("pendingEmail", email);

    setError("");
    setSuccess("");
    setIsExpired(false);

    const expiryTime = new Date(expiry).getTime();

    const interval = setInterval(() => {
      const diff = Math.floor((expiryTime - Date.now()) / 1000);

      if (diff <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    const cooldownStart = localStorage.getItem("otpCooldownStart");

    if (cooldownStart) {
      const elapsed = Math.floor((Date.now() - cooldownStart) / 1000);
      const remaining = 60 - elapsed;

      if (remaining > 0) {
        setResendCooldown(remaining);
      }
    }

    setTimeout(() => otpRef.current?.focus(), 100);

    return () => clearInterval(interval);
  }, [location.state]);

  /*
  ========================================
  VERIFY OTP
  ========================================
  */
  const handleVerifyOtp = async () => {
    setError("");
    setSuccess("");

    const challengeId = localStorage.getItem("pendingChallengeId");

    /*
    ========================================
    GENERIC VALIDATION RESPONSE
    ========================================
    Do not reveal whether the OTP expired,
    is malformed, missing, invalid, locked,
    or tied to a fake challenge.
    */
    if (isExpired || !challengeId || !enteredOtp || enteredOtp.length !== 6) {
      setError(AUTH_GENERIC_MESSAGE);
      return;
    }

    try {
      const res = await apiFetch(`${SERVER_URL}/auth/verify-otp-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId,
          otp: enteredOtp,
        }),
      });

      if (!res) {
        setError(AUTH_GENERIC_MESSAGE);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(AUTH_GENERIC_MESSAGE);
        return;
      }

      setSuccess("Verification completed successfully.");

      /*
      ========================================
      CLEANUP TEMPORARY OTP FLOW VALUES
      ========================================
      */
      localStorage.removeItem("pendingChallengeId");
      localStorage.removeItem("pendingEmail");
      localStorage.removeItem("pendingExpiryAt");
      localStorage.removeItem("otpCooldownStart");

      setTimeout(() => {
        navigate("/tracker", { replace: true });
      }, 400);
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(AUTH_GENERIC_MESSAGE);
    }
  };

  /*
  ========================================
  RESEND OTP
  ========================================
  */
  const handleResendOtp = async () => {
    if (isResending || resendCooldown > 0) return;

    setError("");
    setSuccess("");
    setIsResending(true);

    const email = localStorage.getItem("pendingEmail");

    if (!email) {
      setError(AUTH_GENERIC_MESSAGE);
      setIsResending(false);
      return;
    }

    try {
      const res = await apiFetch(`${SERVER_URL}/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailAddress: email }),
      });

      if (!res) {
        setError(AUTH_GENERIC_MESSAGE);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.challengeId || !data.expiresAt) {
        setError(AUTH_GENERIC_MESSAGE);
        return;
      }

      setEnteredOtp("");
      localStorage.setItem("pendingChallengeId", data.challengeId);
      localStorage.setItem("pendingExpiryAt", data.expiresAt);
      localStorage.setItem("otpCooldownStart", Date.now().toString());

      const expiryTime = new Date(data.expiresAt).getTime();
      setTimeLeft(Math.floor((expiryTime - Date.now()) / 1000));
      setIsExpired(false);

      setResendCooldown(60);
      setSuccess(AUTH_GENERIC_SUCCESS);

      setTimeout(() => otpRef.current?.focus(), 150);
    } catch (err) {
      console.error("OTP resend error:", err);
      setError(AUTH_GENERIC_MESSAGE);
    } finally {
      setIsResending(false);
    }
  };

  /*
  ========================================
  COOLDOWN TIMER
  ========================================
  */
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldown]);

  /*
  ========================================
  DOTS ANIMATION
  ========================================
  */
  useEffect(() => {
    if (!isResending) {
      setResendDots("");
      return;
    }

    const interval = setInterval(() => {
      setResendDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    return () => clearInterval(interval);
  }, [isResending]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-toolbar-gradient px-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Verify OTP</h2>

        <p className="text-sm mb-4 text-gray-600">
          If the account is eligible, a verification code will be sent. Enter
          the verification code below to proceed.
        </p>

        <input
          ref={otpRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={enteredOtp}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setEnteredOtp(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleVerifyOtp();
            }
          }}
          className="w-full border px-3 py-2 rounded text-center text-lg tracking-widest"
          placeholder="Enter 6-digit code"
        />

        <div className="text-center mt-3 text-sm">
          {isExpired ? (
            resendCooldown > 0 ? (
              <span className="text-gray-400">
                Request available in {formatTime(resendCooldown)}
              </span>
            ) : (
              <button
                onClick={handleResendOtp}
                disabled={isResending || resendCooldown > 0}
                className="disabled:opacity-50 disabled:cursor-not-allowed text-blue-700 hover:underline"
              >
                {isResending ? `Processing${resendDots}` : "Request new code"}
              </button>
            )
          ) : (
            <span className="text-yellow-500">
              Code expires in {formatTime(timeLeft)}
            </span>
          )}
        </div>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}

        <button
          onClick={handleVerifyOtp}
          className="w-full mt-4 bg-[#162950] hover:bg-[#1c365f] text-white py-2 rounded"
        >
          Verify OTP
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;