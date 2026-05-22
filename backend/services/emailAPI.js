const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/*
========================================
ACCESS CONTROL
========================================
*/
const EMAIL_ACCESS_ROLES = ["Admin", "Super Admin", "Recruiter"];

/*
========================================
EMAIL CONFIG
========================================
*/
const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  "Callmax Solutions <noreply@callmaxsolutions.com>";

/*
========================================
HELPERS
========================================
*/
function safeString(value, maxLength = 255) {
  if (value === undefined || value === null) return null;

  const cleaned = String(value).trim();

  if (!cleaned) return null;

  return cleaned.slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmail(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);

  if (!email) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEmailRecipient(req, res, next) {
  const email = req.body.email || req.body.emailAddress;

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email request.",
    });
  }

  next();
}

function validateApplicantId(req, res, next) {
  const applicantID = safeString(req.body.applicantID, 100);

  if (!applicantID) {
    return res.status(400).json({
      success: false,
      message: "Invalid applicant request.",
    });
  }

  next();
}

function getRecipient(req) {
  return normalizeEmail(req.body.email || req.body.emailAddress);
}

function getApplicantId(req) {
  return escapeHtml(safeString(req.body.applicantID, 100));
}

/*
========================================
SEND ACKNOWLEDGEMENT EMAIL
========================================
Protected to prevent unauthenticated SES/email abuse.

If your public applicant submission flow currently calls this directly from the
frontend, move that email send into the applicant submission backend route later.
Do not expose this email route publicly.
*/
router.post(
  "/send_acknowledgement",
  requireAuth,
  requireRole(...EMAIL_ACCESS_ROLES),
  validateEmailRecipient,
  async (req, res) => {
    try {
      const email = getRecipient(req);

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: "Resume Received - Callmax Solutions",
        html: `
          <p>Good day.</p>
          <p>Thank you for submitting your resume at <strong>Callmax Solutions</strong>. We appreciate the time and effort you have invested in your application.</p>
          <p>Due to the high volume of applicants, our team is carefully reviewing each submission, and as such, we may not be able to contact you immediately. If your qualifications match the requirements for the role, we will reach out to you directly for further steps.</p>
          <p>We truly appreciate your interest in joining Callmax Solutions and thank you for your patience during this process. If you do not hear from us in the coming weeks, please know that we value your application and will keep it on file for future opportunities.</p>
          <p><strong>Callmax Solutions International Recruitment</strong></p>
        `,
      });

      return res.status(200).json({
        success: true,
        message: "Acknowledgement email sent successfully.",
      });
    } catch (error) {
      console.error("❌ Failed to send acknowledgement email:", error);

      return res.status(500).json({
        success: false,
        message: "Email request could not be completed.",
      });
    }
  },
);

/*
========================================
VOICE RECORDING EMAIL
========================================
*/
router.post(
  "/voice_recording_email",
  requireAuth,
  requireRole(...EMAIL_ACCESS_ROLES),
  validateEmailRecipient,
  validateApplicantId,
  async (req, res) => {
    try {
      const emailAddress = getRecipient(req);
      const applicantID = getApplicantId(req);

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: emailAddress,
        subject: "Voice Recording Instructions - Callmax Solutions",
        html: `
          <p>Dear Applicant,</p>

          <p>Thank you for your interest in joining <strong>Callmax Solutions</strong>.</p>

          <p>As part of our screening process, we kindly request you to complete a short voice recording task by following the instructions below:</p>

          <ol>
            <li>Go to our official voice recording portal:
              <a href="https://cmx.voicerecording.com" target="_blank" rel="noopener noreferrer">https://cmx.voicerecording.com</a>
            </li>
            <li>Use your unique <strong>Applicant ID</strong> provided below when submitting your recording.</li>
            <li>Make a <strong>2-minute voice recording</strong> covering the following points:
              <ul>
                <li>Self-introduction: State your full name.</li>
                <li>Discuss your job experiences:
                  <ul>
                    <li>Most recent job</li>
                    <li>The job you stayed the longest</li>
                    <li>The job you stayed the shortest</li>
                  </ul>
                </li>
                <li>Your key experience and competencies relevant to the job you are applying for.</li>
                <li>How you will commute from your home to the office.</li>
                <li>Your general attitude toward work.</li>
              </ul>
            </li>
            <li><strong>Note:</strong> Please complete all of the above in a single recording.</li>
          </ol>

          <p><strong>Applicant ID:</strong> ${applicantID}</p>

          <p>We look forward to reviewing your recording. Thank you for your cooperation.</p>

          <p>Sincerely,<br/><strong>Callmax Solutions International Recruitment Team</strong></p>
        `,
      });

      return res.status(200).json({
        success: true,
        message: "Voice recording email sent successfully.",
      });
    } catch (error) {
      console.error("❌ Error sending voice recording email:", error);

      return res.status(500).json({
        success: false,
        message: "Email request could not be completed.",
      });
    }
  },
);

/*
========================================
TYPING TEST EMAIL
========================================
*/
router.post(
  "/typing_test_email",
  requireAuth,
  requireRole(...EMAIL_ACCESS_ROLES),
  validateEmailRecipient,
  validateApplicantId,
  async (req, res) => {
    try {
      const emailAddress = getRecipient(req);
      const applicantID = getApplicantId(req);

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: emailAddress,
        subject: "Your Typing Test Instructions - Callmax Solutions",
        html: `
          <p>Dear Applicant,</p>

          <p>Thank you for your interest in becoming a part of <strong>Callmax Solutions</strong>.</p>

          <p>To proceed with your application, please complete the typing test by following the instructions below:</p>

          <ol>
            <li>Visit our official typing test portal:
              <a href="https://cmx.typingtest.com" target="_blank" rel="noopener noreferrer">https://cmx.typingtest.com</a>
            </li>
            <li>Enter your unique <strong>Applicant ID</strong> provided below to begin the test.</li>
            <li>The test duration is <strong>2 minutes</strong>. Make sure to focus on both speed and accuracy.</li>
            <li><strong>Important:</strong> You are only allowed <strong>one attempt</strong>, so please do your best.</li>
          </ol>

          <p><strong>Applicant ID:</strong> ${applicantID}</p>

          <p>We appreciate your participation and look forward to reviewing your results.</p>

          <p>Sincerely,<br/><strong>Callmax Solutions International Recruitment Team</strong></p>
        `,
      });

      return res.status(200).json({
        success: true,
        message: "Typing test email sent successfully.",
      });
    } catch (error) {
      console.error("❌ Error sending typing test email:", error);

      return res.status(500).json({
        success: false,
        message: "Email request could not be completed.",
      });
    }
  },
);

/*
========================================
EOL ASSESSMENT EMAIL
========================================
*/
router.post(
  "/eol_email",
  requireAuth,
  requireRole(...EMAIL_ACCESS_ROLES),
  validateEmailRecipient,
  validateApplicantId,
  async (req, res) => {
    try {
      const emailAddress = getRecipient(req);
      const applicantID = getApplicantId(req);

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: emailAddress,
        subject: "Online English Assessment Test",
        html: `
          <p>Dear Applicant,</p>

          <p>Thank you for your interest in joining <strong>Callmax Solutions</strong>. As part of your application process, you are required to take our <strong>online English assessment test</strong>.</p>

          <p>Please click the link below to access the assessment site:</p>

          <p>
            <a href="https://eol.cmxph.com" target="_blank" rel="noopener noreferrer">
              <strong>Take the Assessment</strong>
            </a>
          </p>

          <p>Use the following <strong>Applicant ID</strong> to log in and complete the test:</p>

          <h2>${applicantID}</h2>

          <p>We wish you the best of luck on your assessment.</p>

          <p>If you have any questions or need assistance, feel free to reach out to us.</p>

          <hr>

          <p><strong>Confidentiality & Data Privacy</strong><br>
          This email and its attachments are confidential and intended for the specified recipient(s) only. Unauthorized review, use, disclosure, or distribution is prohibited. If you received this email in error, please notify the sender and delete the email and its attachments.<br>
          Opinions expressed are the sender's own and may not reflect those of Callmax Solutions International Inc. We accept no liability for damages resulting from this email. Your data privacy is important to us.</p>
        `,
      });

      return res.status(200).json({
        success: true,
        message: "EOL email sent successfully.",
      });
    } catch (error) {
      console.error("❌ Error sending EOL email:", error);

      return res.status(500).json({
        success: false,
        message: "Email request could not be completed.",
      });
    }
  },
);

module.exports = router;