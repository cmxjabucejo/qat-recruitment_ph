const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth } = require("../middleware/authMiddleware");
const AWS = require("aws-sdk");
/*
========================================
AWS / S3
========================================
*/
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.BUCKET_NAME; // Replace with your S3 bucket name

router.get("/media/:s3Key", async (req, res) => {
  const { s3Key } = req.params;

  if (!s3Key) {
    return res.status(400).json({ error: "Missing S3 key" });
  }

  const s3Params = {
    Bucket: BUCKET_NAME,
    Key: decodeURIComponent(s3Key), // handle URL-encoded keys
    Expires: 300, // 5 minutes
  };

  try {
    const signedUrl = await s3.getSignedUrlPromise("getObject", s3Params);
    res.json({ url: signedUrl });
  } catch (err) {
    console.error("❌ Failed to generate signed URL:", err);
    res.status(500).json({ error: "Could not generate media access link." });
  }
});

router.get("/voice/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;

    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: `voicerecordings/${fileName}`, // same as what you used in upload
      Expires: 60, // URL expiration time in seconds
    };

    const downloadURL = await s3.getSignedUrlPromise("getObject", s3Params);

    res.redirect(downloadURL);
  } catch (error) {
    console.error("❌ Error generating voice download URL:", error);
    res.status(500).json({ error: "Failed to generate voice download URL" });
  }
});

router.get("/resume/:filename", async (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(400).json({ error: "Filename is required" });
  }

  const s3Params = {
    Bucket: BUCKET_NAME,
    Key: `resumes/${filename}`,
    Expires: 3600, // URL valid for 1 hour
  };

  try {
    const signedUrl = await s3.getSignedUrlPromise("getObject", s3Params);
    res.json({ url: signedUrl }); // ✅ Return JSON response
  } catch (err) {
    console.error("Error generating signed URL:", err);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

module.exports = router;
