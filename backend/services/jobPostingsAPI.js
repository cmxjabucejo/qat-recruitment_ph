const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const ADMIN_ROLES = ["Admin", "Super Admin"];

function safeString(value, maxLength = 255) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function safeLongText(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return cleaned;
}

function normalizeStatus(value) {
  const allowedStatuses = ["Open", "Closed", "Paused", "Draft"];
  const cleaned = safeString(value, 50);

  if (!cleaned) return "Open";
  if (!allowedStatuses.includes(cleaned)) return "Open";

  return cleaned;
}

function validateJobPostingPayload(req, res, next) {
  const {
    job_code,
    position_title,
    department,
    job_description,
    job_requirements,
  } = req.body;

  if (!safeString(job_code, 100)) {
    return res.status(400).json({
      success: false,
      message: "Job code is required.",
    });
  }

  if (!safeString(position_title, 255)) {
    return res.status(400).json({
      success: false,
      message: "Position title is required.",
    });
  }

  if (!safeString(department, 255)) {
    return res.status(400).json({
      success: false,
      message: "Department is required.",
    });
  }

  if (!safeLongText(job_description)) {
    return res.status(400).json({
      success: false,
      message: "Job description is required.",
    });
  }

  if (!safeLongText(job_requirements)) {
    return res.status(400).json({
      success: false,
      message: "Job requirements are required.",
    });
  }

  next();
}

/*
|--------------------------------------------------------------------------
| GET JOB POSTINGS
|--------------------------------------------------------------------------
| Protected because this is part of the internal recruitment backend.
| If you later need a public careers page, create a separate read-only public route.
*/

router.get("/job_postings", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        id,
        job_code,
        position_title,
        department,
        account,
        job_description,
        job_requirements,
        status,
        workSetup,
        created_datetime
      FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings
      ORDER BY created_datetime DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("❌ Failed to fetch job postings:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET MAX JOB POSTING ID
|--------------------------------------------------------------------------
| Admin-only because this supports job posting management.
*/

router.get(
  "/job_postings/max-id",
  requireAuth,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT MAX(id) AS maxId
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings
      `);

      const maxId = rows?.[0]?.maxId || 0;

      return res.status(200).json({
        success: true,
        maxId,
      });
    } catch (err) {
      console.error("❌ Failed to fetch max job posting ID:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| CREATE JOB POSTING
|--------------------------------------------------------------------------
| Critical fix:
| This route was previously unauthenticated.
| Only Admin / Super Admin can create job postings.
*/

router.post(
  "/job_postings",
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validateJobPostingPayload,
  async (req, res) => {
    const now = new Date();

    const job_code = safeString(req.body.job_code, 100);
    const position_title = safeString(req.body.position_title, 255);
    const department = safeString(req.body.department, 255);
    const account = safeString(req.body.account, 255);
    const job_description = safeLongText(req.body.job_description);
    const job_requirements = safeLongText(req.body.job_requirements);
    const status = normalizeStatus(req.body.status);
    const workSetup = safeString(req.body.workSetup, 100);

    try {
      const [result] = await db.execute(
        `
        INSERT INTO 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings (
          job_code,
          position_title,
          department,
          account,
          job_description,
          job_requirements,
          status,
          workSetup,
          created_datetime
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          job_code,
          position_title,
          department,
          account,
          job_description,
          job_requirements,
          status,
          workSetup,
          now,
        ],
      );

      return res.status(201).json({
        success: true,
        message: "Job posting created successfully.",
        id: result.insertId,
      });
    } catch (err) {
      console.error("❌ Failed to create job posting:", err);
      return res.status(500).json({
        success: false,
        message: "Insert failed",
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| UPDATE JOB POSTING
|--------------------------------------------------------------------------
| Critical fix:
| This route was previously unauthenticated.
| Only Admin / Super Admin can update job postings.
*/

router.put(
  "/job_postings/:id",
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validateJobPostingPayload,
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid job posting ID.",
      });
    }

    const job_code = safeString(req.body.job_code, 100);
    const position_title = safeString(req.body.position_title, 255);
    const department = safeString(req.body.department, 255);
    const account = safeString(req.body.account, 255);
    const job_description = safeLongText(req.body.job_description);
    const job_requirements = safeLongText(req.body.job_requirements);
    const status = normalizeStatus(req.body.status);
    const workSetup = safeString(req.body.workSetup, 100);

    try {
      const [result] = await db.execute(
        `
        UPDATE 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings
        SET
          job_code = ?,
          position_title = ?,
          department = ?,
          account = ?,
          job_description = ?,
          job_requirements = ?,
          status = ?,
          workSetup = ?
        WHERE id = ?
        `,
        [
          job_code,
          position_title,
          department,
          account,
          job_description,
          job_requirements,
          status,
          workSetup,
          id,
        ],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Job posting not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Job posting updated successfully.",
      });
    } catch (err) {
      console.error(`❌ Failed to update job posting ID ${id}:`, err);
      return res.status(500).json({
        success: false,
        message: "Update failed",
      });
    }
  },
);

module.exports = router;