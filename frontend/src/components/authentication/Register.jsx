import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/cmxlogo-removebg-preview.png";
import { SERVER_URL } from "../lib/constants";
import UserService from "../service/UserService";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    const trimmedFirst = firstname.trim();
    const trimmedLast = lastname.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedEmail || !trimmedPhone) {
      setError("All fields are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const registerRes = await fetch(`${SERVER_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          phone_num: trimmedPhone,
          firstname: trimmedFirst,
          lastname: trimmedLast,
        }),
      });

      const data = await registerRes.json();

      if (registerRes.status === 409) {
        setError(data.message || "This email is already registered.");
        return;
      }

      if (!registerRes.ok || !data.success) {
        setError(data.message || "Registration failed.");
        return;
      }

      if (registerRes.status === 202) {
        // ✅ Manual registration — send OTP and proceed

        // Save form data in localStorage for use after OTP
        localStorage.setItem(
          "pendingUserData",
          JSON.stringify({
            firstname: trimmedFirst,
            lastname: trimmedLast,
            email: trimmedEmail,
            phone_num: trimmedPhone,
            middlename: "", // Optional — will be included in final DB insert
          })
        );

        const requestedDateTime = new Date();
        const expiryDateTime = new Date(
          requestedDateTime.getTime() + 5 * 60000
        );

        // ✅ Request OTP correctly
        const otpRes = await fetch(
          `${SERVER_URL}/auth/send-otp`, // <-- FIX THIS ROUTE too!!
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emailAddress: trimmedEmail,
            }),
          }
        );

        if (!otpRes.ok) {
          const errorText = await otpRes.text();
          console.error("❌ OTP send failed:", otpRes.status, errorText);
          setError("Failed to send OTP. Please try again.");
          return;
        }

        const otpResult = await otpRes.json();
        localStorage.setItem("pendingOtpHashed", otpResult.otpHashed);
        localStorage.setItem("pendingFlow", "register"); // 👈 ADD THIS LINE

        navigate("/OtpVerification", {
          state: {
            emailAddress: trimmedEmail,
            requestedDateTime,
            expiryDateTime,
            flow: "register", // 👈 add this
          },
        });
        return;
      }

      setError("Unexpected registration flow. Please try again.");
    } catch (err) {
      console.error("Registration error:", err);
      setError("An error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-linear-gradient px-4">
      <div className="bg-white p-8 md:p-10 rounded-lg shadow-xl w-full max-w-lg text-center">
        <img
          src={logo}
          alt="Callmax Logo"
          className="w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44 mx-auto mb-6 max-w-full h-auto"
        />
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Create Account
        </h2>

        <div className="space-y-3 text-left">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="First Name"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Last Name"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border rounded px-3 py-2 w-full bg-white">
              {/* 🇩🇴 Dominican Republic Flag */}
              <img
                src="https://flagcdn.com/w40/do.png"
                alt="DO Flag"
                className="w-5 h-5 mr-2"
              />

              {/* Static +1 prefix */}
              <span className="mr-2 text-gray-700 text-sm">+1</span>

              {/* Input for 809/829/849 + 7 digits */}
              <input
                type="tel"
                placeholder="8091234567"
                value={phoneNumber}
                onChange={(e) => {
                  const input = e.target.value.replace(/\D/g, ""); // Remove non-digits
                  if (input.length <= 10) setPhoneNumber(input); // Limit to 10 digits
                }}
                className="flex-1 outline-none text-sm"
                pattern="(809|829|849)[0-9]{7}"
                required
              />
            </div>
          </div>
        </div>

        <div className="text-sm text-center mt-4">
          <button
            onClick={handleRegister}
            disabled={isSubmitting}
            className={`bg-[#162950] hover:bg-[#1c365f] text-white w-full py-2 rounded mt-1 mb-2 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Registering..." : "Register"}
          </button>
          Already have an account?{" "}
          <span
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => navigate("/OauthLogin")}
          >
            Login here
          </span>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-3">{success}</p>}
      </div>
    </div>
  );
};

export default Register;
