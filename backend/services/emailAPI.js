const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth } = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com", // SES SMTP endpoint
  port: 587, // Use 587 for TLS
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/send_acknowledgement", async (req, res) => {
  try {
    const { email } = req.body;

    await transporter.sendMail({
      from: "noreply@callmaxsolutions.com",
      to: email,
      subject: "Resume Received - Callmax Solutions",
      html: `
        <p>Good day.</p>
        <p>Thank you for submitting your resume at <strong>Callmax Solutions</strong>. We appreciate the time and effort you've invested in your application.</p>
        <p>Due to the high volume of applicants, our team is carefully reviewing each submission, and as such, we may not be able to contact you immediately. If your qualifications match the requirements for the role, we will reach out to you directly for further steps.</p>
        <p>We truly appreciate your interest in joining Callmax Solutions and thank you for your patience during this process. If you don't hear from us in the coming weeks, please know that we value your application and will keep it on file for future opportunities.</p>
        <p><strong>Callmax Solutions International Recruitment</strong></p>
      `,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Failed to send acknowledgment email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/voice_recording_email", async (req, res) => {
  try {
    const { emailAddress, applicantID } = req.body;

    await transporter.sendMail({
      from: "noreply@callmaxsolutions.com",
      to: emailAddress,
      subject: "Voice Recording Instructions - Callmax Solutions",
      html: `
        <p>Dear Applicant,</p>

        <p>Thank you for your interest in joining <strong>Callmax Solutions</strong>.</p>

        <p>As part of our screening process, we kindly request you to complete a short voice recording task by following the instructions below:</p>

        <ol>
          <li>Go to our official voice recording portal: 
            <a href="https://cmx.voicerecording.com" target="_blank">https://cmx.voicerecording.com</a>
          </li>
          <li>Use your unique <strong>Applicant ID</strong> (provided below) when submitting your recording.</li>
          <li>Make a <strong>2-minute voice recording</strong> covering the following points:
            <ul>
              <li>Self-introduction: State your Full Name</li>
              <li>Discuss your job experiences:
                <ul>
                  <li>Most recent job</li>
                  <li>The job you stayed the longest</li>
                  <li>The job you stayed the shortest</li>
                </ul>
              </li>
              <li>Your key experience and competencies relevant to the job you are applying for</li>
              <li>How you will commute from your home to the office</li>
              <li>Your general attitude toward work</li>
            </ul>
          </li>
          <li><strong>Note:</strong> Please complete all of the above in a single recording.</li>
        </ol>

        <p><strong>Applicant ID:</strong> ${applicantID}</p>

        <p>We look forward to reviewing your recording. Thank you for your cooperation!</p>

        <p>Sincerely,<br/><strong>Callmax Solutions International Recruitment Team</strong></p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Voice recording email sent successfully.",
    });
  } catch (error) {
    console.error("❌ Error sending voice recording email:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while sending the voice recording email.",
      error: error.message,
    });
  }
});

router.post("/typing_test_email", async (req, res) => {
  try {
    const { emailAddress, applicantID } = req.body;

    await transporter.sendMail({
      from: "noreply@callmaxsolutions.com",
      to: emailAddress,
      subject: "Your Typing Test Instructions - Callmax Solutions",
      html: `
        <p>Dear Applicant,</p>
    
        <p>Thank you for your interest in becoming a part of <strong>Callmax Solutions</strong>.</p>
    
        <p>To proceed with your application, please complete the typing test by following the instructions below:</p>
    
        <ol>
          <li>Visit our official typing test portal: 
            <a href="https://cmx.typingtest.com" target="_blank">https://cmx.typingtest.com</a>
          </li>
          <li>Enter your unique <strong>Applicant ID</strong> (provided below) to begin the test.</li>
          <li>The test duration is <strong>2 minutes</strong>. Make sure to focus on both speed and accuracy.</li>
          <li><strong>Important:</strong> You are only allowed <strong>one attempt</strong>, so please do your best.</li>
        </ol>
    
        <p><strong>Applicant ID:</strong> ${applicantID}</p>
    
        <p>We appreciate your participation and look forward to reviewing your results.</p>
    
        <p>Sincerely,<br/><strong>Callmax Solutions International Recruitment Team</strong></p>
      `,
    });

    res
      .status(200)
      .json({ success: true, message: "Typing test email sent successfully." });
  } catch (error) {
    console.error("❌ Error sending typing test email:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while sending the typing test email.",
      error: error.message,
    });
  }
});

router.post("/eol_email", async (req, res) => {
  try {
    const { emailAddress, applicantID } = req.body;

    // Send EOL Assessment Email
    await transporter.sendMail({
      from: "noreply@callmaxsolutions.com",
      to: emailAddress,
      subject: "Online English Assessment Test",
      html: `
        <p>Dear Applicant,</p>

        <p>Thank you for your interest in joining <strong>Callmax Solutions</strong>. As part of your application process, you are required to take our <strong>online English assessment test</strong>.</p>

        <p>Please click the link below to access the assessment site:</p>

        <p><a href="https://eol.cmxph.com" target="_blank"><strong>Take the Assessment</strong></a></p>

        <p>Use the following <strong>Applicant ID</strong> to log in and complete the test:</p>

        <h2>${applicantID}</h2>

        <p>We wish you the best of luck on your assessment!</p>

        <p>If you have any questions or need assistance, feel free to reach out to us.</p>

        <hr>

        <p><strong>Confidentiality & Data Privacy</strong><br>
        This email and its attachments are confidential and intended for the specified recipient(s) only. Unauthorized review, use, disclosure, or distribution is prohibited. If you received this email in error, please notify the sender and delete the email and its attachments.<br>
        Opinions expressed are the sender's own and may not reflect those of Callmax Solutions International Inc. We accept no liability for damages resulting from this email. Your data privacy is important to us.</p>
      `,
    });

    res
      .status(200)
      .json({ success: true, message: "EOL Email sent successfully." });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "An error occurred while processing the request.",
      error: error.message,
    });
  }
});

module.exports = router;
