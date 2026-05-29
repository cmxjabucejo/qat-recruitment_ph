const express = require("express");
const router = express.Router();
const { s3, BUCKET_NAME } = require("../utils/helpers");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/*
========================================
ACCESS CONTROL
========================================
*/
const FILE_ACCESS_ROLES = ["Admin", "Super Admin", "Recruiter"];

/*
========================================
HELPERS
========================================
*/
function isSafeFileName(value) {
  if (!value) return false;

  const decoded = decodeURIComponent(String(value)).trim();

  // Block path traversal and folder escaping
  if (
    decoded.includes("..") ||
    decoded.includes("/") ||
    decoded.includes("\\")
  ) {
    return false;
  }

  // Allow common safe filename characters only
  return /^[a-zA-Z0-9._\- ()]+$/.test(decoded);
}

function isSafeS3Key(value) {
  if (!value) return false;

  const decoded = decodeURIComponent(String(value)).trim();

  // Block traversal and suspicious keys
  if (
    decoded.includes("..") ||
    decoded.startsWith("/") ||
    decoded.startsWith("\\") ||
    decoded.includes("\\")
  ) {
    return false;
  }

  // Restrict to expected app folders only
  const allowedPrefixes = ["resumes/", "voicerecordings/", "media/"];

  if (!allowedPrefixes.some((prefix) => decoded.startsWith(prefix))) {
    return false;
  }

  // Allow folder/key style S3 keys, but keep safe characters
  return /^[a-zA-Z0-9._\- ()/]+$/.test(decoded);
}

function getDecodedValue(value) {
  return decodeURIComponent(String(value || "")).trim();
}

async function createSignedGetUrl({ key, expires = 300 }) {
  if (!BUCKET_NAME) {
    throw new Error("BUCKET_NAME is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: expires });
}

/*
========================================
GET GENERIC MEDIA SIGNED URL
========================================
Example:
GET /api/mediafiles/media/resumes/sample.pdf
GET /api/mediafiles/media/voicerecordings/sample.webm

Note:
This route requires the key to begin with one of:
- resumes/
- voicerecordings/
- media/
*/
router.get(
  "/media/:s3Key(*)",
  requireAuth,
  requireRole(...FILE_ACCESS_ROLES),
  async (req, res) => {
    const rawKey = req.params.s3Key;
    const s3Key = getDecodedValue(rawKey);

    if (!isSafeS3Key(s3Key)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file request.",
      });
    }

    try {
      const signedUrl = await createSignedGetUrl({
        key: s3Key,
        expires: 300,
      });

      return res.status(200).json({
        success: true,
        url: signedUrl,
      });
    } catch (err) {
      console.error("❌ Failed to generate media signed URL:", err);

      return res.status(500).json({
        success: false,
        error: "Could not generate media access link.",
      });
    }
  },
);

/*
========================================
GET VOICE RECORDING SIGNED URL
========================================
*/
router.get(
  "/voice/:fileName",
  requireAuth,
  requireRole(...FILE_ACCESS_ROLES),
  async (req, res) => {
    const fileName = getDecodedValue(req.params.fileName);

    if (!isSafeFileName(fileName)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file request.",
      });
    }

    try {
      const signedUrl = await createSignedGetUrl({
        key: `voicerecordings/${fileName}`,
        expires: 300,
      });

      return res.status(200).json({
        success: true,
        url: signedUrl,
      });
    } catch (error) {
      console.error("❌ Error generating voice signed URL:", error);

      return res.status(500).json({
        success: false,
        error: "Could not generate media access link.",
      });
    }
  },
);

/*
========================================
GET RESUME SIGNED URL
========================================
*/
router.get(
  "/resume/:filename",
  requireAuth,
  requireRole(...FILE_ACCESS_ROLES),
  async (req, res) => {
    const filename = getDecodedValue(req.params.filename);

    if (!isSafeFileName(filename)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file request.",
      });
    }

    try {
      const signedUrl = await createSignedGetUrl({
        key: `resumes/${filename}`,
        expires: 300,
      });

      return res.status(200).json({
        success: true,
        url: signedUrl,
      });
    } catch (err) {
      console.error("❌ Error generating resume signed URL:", err);

      return res.status(500).json({
        success: false,
        error: "Could not generate media access link.",
      });
    }
  },
);

module.exports = router;
