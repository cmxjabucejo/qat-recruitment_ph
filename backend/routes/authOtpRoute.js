// routes/authOtpRoute.js
const express = require("express");
const {
  checkEmail,
  sendOtp,
  verifyOtpLogin,
} = require("../controllers/authOtpController");

const router = express.Router();

router.post("/check-email", checkEmail);
router.post("/send-otp", sendOtp);
router.post("/verify-otp-login", verifyOtpLogin);

module.exports = router;
