import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/constants";
import { apiFetch } from "../lib/apiFetch";

const OtpVerification = () => {
  const otpRef = useRef(null);
  const location = useLocation();

  const [enteredOtp, setEnteredOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailAddress, setEmailAddress] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendDots, setResendDots] = useState("");

  const navigate = useNavigate();

  /*
  ========================================
  ⏱ FORMATTERS
  ========================================
  */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /*
  ========================================
  🔁 INIT (OTP SESSION + TIMER)
  ========================================
  */
  useEffect(() => {
    const email =
      location.state?.emailAddress || localStorage.getItem("pendingEmail");

    const challengeId = localStorage.getItem("pendingChallengeId");
    const expiry = localStorage.getItem("pendingExpiryAt");

    if (!email || !challengeId || !expiry) {
      setError("Session expired. Please request a new OTP.");
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

    // 🔥 INIT RESEND COOLDOWN
    const cooldownStart = localStorage.getItem("otpCooldownStart");

    if (cooldownStart) {
      const elapsed = Math.floor((Date.now() - cooldownStart) / 1000);
      const remaining = 60 - elapsed;

      if (remaining > 0) {
        setResendCooldown(remaining);
      }
    }

    // 🔥 AUTO-FOCUS
    setTimeout(() => otpRef.current?.focus(), 100);

    return () => clearInterval(interval);
  }, [location.state]);

  /*
  ========================================
  🔐 VERIFY OTP
  ========================================
  */
  const handleVerifyOtp = async () => {
    setError("");
    setSuccess("");

    if (isExpired) {
      setError("OTP has expired. Please request a new one.");
      return;
    }

    const challengeId = localStorage.getItem("pendingChallengeId");

    if (!challengeId) {
      setError("Session expired. Please request a new OTP.");
      return;
    }

    if (!enteredOtp || enteredOtp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
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

      if (!res) return;

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Invalid OTP");
        return;
      }

      setSuccess("OTP verified successfully!");

      // 🔥 CLEANUP
      localStorage.removeItem("pendingChallengeId");
      localStorage.removeItem("pendingEmail");
      localStorage.removeItem("pendingExpiryAt");
      localStorage.removeItem("otpCooldownStart");

      // 🔥 HARD REDIRECT → triggers session check

      setTimeout(() => {
        navigate("/tracker", { replace: true });
        // window.location.href = "/tracker";
      }, 400);
    } catch (err) {
      console.error(err);
      setError("Could not verify OTP. Please try again.");
    }
  };

  /*
  ========================================
  🔁 RESEND OTP
  ========================================
  */
  const handleResendOtp = async () => {
    // 🚫 HARD BLOCK (THIS WAS MISSING)
    if (isResending || resendCooldown > 0) return;

    setError("");
    setSuccess("");
    setIsResending(true);

    const email = localStorage.getItem("pendingEmail");

    if (!email) {
      setError("Session expired. Please restart login.");
      setIsResending(false);
      return;
    }

    try {
      console.log("🔥 RESEND OTP CALLED"); // DEBUG

      const res = await apiFetch(`${SERVER_URL}/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailAddress: email }),
      });

      if (!res) return;

      if (res.status === 429) {
        const data = await res.json();
        setError(data.message || "Too many requests. Please wait.");
        setResendCooldown(60);
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to resend OTP.");
        return;
      }

      // ✅ SUCCESS FLOW
      setEnteredOtp("");
      localStorage.setItem("pendingChallengeId", data.challengeId);
      localStorage.setItem("pendingExpiryAt", data.expiresAt);
      localStorage.setItem("otpCooldownStart", Date.now());

      const expiryTime = new Date(data.expiresAt).getTime();
      setTimeLeft(Math.floor((expiryTime - Date.now()) / 1000));
      setIsExpired(false);

      setResendCooldown(60);
      setSuccess("A new OTP has been sent.");

      setTimeout(() => otpRef.current?.focus(), 150);
    } catch (err) {
      console.error(err);
      setError("Could not resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  /*
  ========================================
  ⏳ COOLDOWN TIMER
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
  ✨ DOTS ANIMATION
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
          An OTP has been sent to <strong>{emailAddress}</strong>. Please enter
          it below to proceed.
        </p>

        <input
          type="text"
          maxLength={6}
          value={enteredOtp}
          onChange={(e) => setEnteredOtp(e.target.value)}
          className="w-full border px-3 py-2 rounded text-center text-lg tracking-widest"
          placeholder="Enter 6-digit OTP"
        />

        <div className="text-center mt-3 text-sm">
          {isExpired ? (
            resendCooldown > 0 ? (
              <span className="text-gray-400">
                Resend in {formatTime(resendCooldown)}
              </span>
            ) : (
              <button
                onClick={handleResendOtp}
                disabled={isResending || resendCooldown > 0}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? `Resending${resendDots}` : "Request new OTP"}
              </button>
            )
          ) : (
            <span className="text-yellow-300">
              Expires in {formatTime(timeLeft)}
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
