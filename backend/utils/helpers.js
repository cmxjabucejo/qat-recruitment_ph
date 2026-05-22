const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");

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
UPLOAD CONFIG
========================================
*/
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

/*
========================================
FILENAME / PATH SAFETY
========================================
*/
const safeFilename = (name) => {
  const ext = path.extname(String(name || "")).toLowerCase();
  const base = path
    .basename(String(name || "file"), ext)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 140);

  return `${base || "file"}${ext}`.slice(0, 180);
};

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"));
  }

  file.originalname = safeFilename(file.originalname);

  return cb(null, true);
};

/*
========================================
MULTER STORAGE
========================================
Used by applicantsAPI.js.
Disk storage is retained because your current route uploads to S3 using:
fs.createReadStream(req.file.path)
========================================
*/
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

/*
========================================
MEMORY UPLOAD MIDDLEWARE
Used by other routes if needed.
========================================
*/
const newuploadmiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter,
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
    if (Number.isNaN(d.getTime())) return null;
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

const safeLongText = (val, maxLen = 10000) => {
  if (val === null || val === undefined) return null;

  return String(val).trim().slice(0, maxLen);
};

const escapeHtml = (value) => {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const safeNote = safeLongText(rawNote) || "";

  return `---- ${safeFirst} ${safeLast} || ${timestamp} ----\n\n${safeNote}`;
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
  if (!Array.isArray(files)) return [];

  return files.filter(
    (file, index, self) =>
      file &&
      file.url &&
      index === self.findIndex((f) => f?.url === file.url),
  );
};

const isSafeS3Key = (key) => {
  if (!key || typeof key !== "string") return false;

  const cleaned = decodeURIComponent(key).trim();

  if (!cleaned) return false;
  if (cleaned.includes("..")) return false;
  if (cleaned.includes("\\")) return false;
  if (cleaned.startsWith("/")) return false;

  const allowedPrefixes = ["resumes/", "voicerecordings/", "media/"];

  if (!allowedPrefixes.some((prefix) => cleaned.startsWith(prefix))) {
    return false;
  }

  return /^[a-zA-Z0-9._\- ()/]+$/.test(cleaned);
};

module.exports = {
  s3,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  newuploadmiddleware,
  upload,
  dedupeAttachments,
  escapeHtml,
  formatNoteEntry,
  isSafeS3Key,
  normalizeDate,
  normalizeNumber,
  parseAttachments,
  safeFilename,
  safeLongText,
  safeString,
};