import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SERVER_URL } from "../lib/constants";
import logo from "../../assets/cmxlogo-removebg-preview.png";
import UserService from "../service/UserService";

const OauthLogin = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

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

    setIsSending(true);

    try {
      const checkRes = await fetch(`${SERVER_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkRes.json();

      if (checkRes.status === 403) {
        setError(checkData.error || "Use Google login for this email.");
        return;
      }

      if (!checkRes.ok || !checkData.success) {
        setError(checkData.error || "Email is not registered.");
        return;
      }

      const { firstname, lastname, middlename } = checkData.user || {};
      UserService.setPendingApplicant({
        email,
        firstname: firstname || "",
        lastname: lastname || "",
        middlename: middlename || "",
        picture: "/default-avatar.png",
      });

      const requestedDateTime = new Date();
      const expiryDateTime = new Date(requestedDateTime.getTime() + 5 * 60000);

      const otpRes = await fetch(`${SERVER_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailAddress: email, // ✅ correct key
        }),
      });

      if (!otpRes.ok) {
        setError("Failed to send OTP. Please try again.");
        return;
      }

      const result = await otpRes.json();
      localStorage.setItem("pendingOtpHashed", result.otpHashed);
      localStorage.setItem(
        "pendingRequestedAt",
        requestedDateTime.toISOString(),
      );
      localStorage.setItem("pendingExpiryAt", expiryDateTime.toISOString());

      navigate(
        `/OtpVerification?redirect=${encodeURIComponent(redirectPath)}`,
        {
          state: {
            emailAddress: email,
            requestedDateTime,
            expiryDateTime,
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
