const AWS = require("aws-sdk");
const multer = require("multer");

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

/*
========================================
UPLOAD CONFIG (HARDENED)
========================================
*/
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

const newuploadmiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }
    cb(null, true);
  },
});

/*
========================================
HELPERS
========================================
*/
const normalizeDate = (val) => {
  if (!val) return null;

  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

const normalizeNumber = (val) => {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
};

const safeString = (val, maxLen = 255) => {
  if (val === null || val === undefined) return null;
  return String(val).trim().slice(0, maxLen);
};

const safeLongText = (val) => {
  if (val === null || val === undefined) return null;
  return String(val).trim();
};

const safeFilename = (name) => {
  return String(name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
};

const formatNoteEntry = (first, last, rawNote) => {
  const now = new Date();

  const options = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  const timestamp = now.toLocaleString("en-US", options).replace(",", "");
  const safeFirst = safeString(first, 100) || "Unknown";
  const safeLast = safeString(last, 100) || "User";

  return `---- ${safeFirst} ${safeLast} || ${timestamp} ----\n\n${safeLongText(rawNote) || ""}`;
};

const parseAttachments = (value) => {
  try {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return value;
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const dedupeAttachments = (files) => {
  return files.filter(
    (file, index, self) => index === self.findIndex((f) => f.url === file.url),
  );
};

const isSafeS3Key = (key) => {
  if (!key || typeof key !== "string") return false;
  if (key.includes("..")) return false;
  if (key.includes("\\")) return false;
  return true;
};

module.exports = {
  s3,
  ALLOWED_FILE_TYPES,
  newuploadmiddleware,
  upload,
  dedupeAttachments,
  formatNoteEntry,
  isSafeS3Key,
  normalizeDate,
  normalizeNumber,
  parseAttachments,
  safeFilename,
  safeLongText,
  safeString,
};
