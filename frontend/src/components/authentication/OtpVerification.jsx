import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SERVER_URL } from "../lib/constants";
import bcrypt from "bcryptjs";
import UserService from "../service/UserService";

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const queryRedirect = searchParams.get("redirect");

  const emailAddress =
    location.state?.emailAddress || localStorage.getItem("pendingEmail");

  const requestedDateTime =
    location.state?.requestedDateTime ||
    localStorage.getItem("pendingRequestedAt");

  const expiryDateTime =
    location.state?.expiryDateTime || localStorage.getItem("pendingExpiryAt");

  // ✅ Persist fallback data if present in state
  if (location.state?.emailAddress) {
    localStorage.setItem("pendingEmail", location.state.emailAddress);
  }

  if (location.state?.redirectPath) {
    localStorage.setItem("pendingRedirectPath", location.state.redirectPath);
  }

  // ✅ Robust redirect logic
  // const redirectPath =
  //   location.state?.redirectPath ||
  //   queryRedirect ||
  //   localStorage.getItem("pendingRedirectPath") ||
  //   "/home";

  const redirectPath =
    location.state?.redirectPath ||
    queryRedirect ||
    localStorage.getItem("pendingRedirectPath") ||
    "/home";

  const flow =
    location.state?.flow || localStorage.getItem("pendingFlow") || "login";

  const [enteredOtp, setEnteredOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerifyOtp = async () => {
    setError("");
    setSuccess("");

    if (!emailAddress) {
      setError("Missing email. Please restart the process.");
      return;
    }

    if (!enteredOtp) {
      setError("Please enter the OTP.");
      return;
    }

    const now = new Date();
    const expiry = new Date(expiryDateTime);

    if (!expiryDateTime || isNaN(expiry.getTime())) {
      setError("Invalid or expired OTP session. Please request a new one.");
      return;
    }

    if (now > expiry) {
      setError("OTP has expired. Please request a new one.");
      return;
    }

    const hashedOtp = localStorage.getItem("pendingOtpHashed");
    if (!hashedOtp) {
      setError("No OTP found. Please try again.");
      return;
    }

    const isMatch = await bcrypt.compare(enteredOtp, hashedOtp);
    if (!isMatch) {
      setError("Incorrect OTP. Please try again.");
      return;
    }

    try {
      // ✅ REGISTER FLOW
      const storedUserDataRaw = localStorage.getItem("pendingUserData");

      if (flow === "register" && storedUserDataRaw) {
        const userData = JSON.parse(storedUserDataRaw);
        const { firstname, lastname, phone_num, middlename = "" } = userData;

        if (!firstname || !lastname || !phone_num) {
          setError("Registration data missing. Please restart registration.");
          return;
        }

        const res = await fetch(
          `${SERVER_URL}/api/verify-and-complete-registration`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstname,
              lastname,
              email: emailAddress,
              phone_num,
              middlename,
            }),
          },
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Failed to complete registration.");
          return;
        }

        if (!data.token) {
          setError("Token not received from server.");
          return;
        }

        // ✅ Simulate login for newly registered user
        UserService.loginApplicant({
          email: emailAddress,
          firstname,
          lastname,
          middlename,
          picture: "/default-avatar.png",
          role: "user",
          token: data.token, // 🔑 use token from backend response
        });

        setSuccess("Registration & OTP verification successful!");
      } else {
        // ✅ LOGIN FLOW
        const res = await fetch(`${SERVER_URL}/auth/verify-otp-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailAddress }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Failed to log in.");
          return;
        }

        const { token, user } = data;

        UserService.loginApplicant({
          email: emailAddress,
          firstname: user.firstname,
          lastname: user.lastname,
          middlename: user.middlename || "",
          picture: "/default-avatar.png",
          method: "manual",
          providerId: emailAddress,
          role: user.USER_ROLE || "Agent",
          token,
        });

        localStorage.setItem("USER_ROLE", user.USER_ROLE || "Agent");
        localStorage.setItem("EMPLOYEEID", user.EMPLOYEEID || "");
        localStorage.setItem("name", user.NAME || "");

        setSuccess("OTP verified successfully!");
      }

      // ✅ Cleanup
      localStorage.removeItem("pendingOtpHashed");
      localStorage.removeItem("pendingEmail");
      localStorage.removeItem("pendingRequestedAt");
      localStorage.removeItem("pendingExpiryAt");
      localStorage.removeItem("pendingFlow");
      localStorage.removeItem("pendingUserData");
      localStorage.removeItem("pendingRedirectPath");

      // navigate(redirectPath, {
      //   state: { appId: `manual_${emailAddress}` },
      //   replace: true,
      // });

      // ✅ Replace navigate() with window.location.href to force token sync
      window.location.href = redirectPath;
    } catch (err) {
      console.error("❌ OTP Verification Error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

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
