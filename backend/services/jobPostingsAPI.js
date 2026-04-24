const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("job_postings", async (req, res) => {
  // console.log("📡 [GET] /api/job_postings");
  try {
    const [rows] = await db.execute(`
      SELECT * FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings ORDER BY created_datetime DESC
      
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Failed to fetch job postings:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/job_postings/max-id", async (req, res) => {
  console.log("📡 [GET] /api/job_postings/max-id");
  try {
    const [rows] = await db.execute(`
      SELECT MAX(id) AS maxId FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings
    `);
    const maxId = rows[0].maxId || 0;
    res.json({ success: true, maxId });
  } catch (err) {
    console.error("❌ Failed to fetch max ID:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/job_postings", async (req, res) => {
  const now = new Date();
  console.log("📡 [POST] /api/job_postings");
  console.log("📥 Received POST body:", req.body);

  const {
    job_code,
    position_title,
    department,
    account,
    job_description,
    job_requirements,
    status,
    workSetup,
  } = req.body;

  console.log("Variables to insert:", {
    job_code,
    position_title,
    department,
    account,
    job_description,
    job_requirements,
    status,
    workSetup,
  });

  try {
    await db.execute(
      `INSERT INTO 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings (
        job_code, position_title, department, account,
        job_description, job_requirements, status, workSetup, created_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job_code,
        position_title,
        department,
        account,
        job_description,
        job_requirements,
        status || "Open",
        workSetup,
        now,
      ],
    );

    console.log(`✅ New job posting created: ${job_code}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to create job posting:", err);
    res.status(500).json({ success: false, message: "Insert failed" });
  }
});

router.put("/job_postings/:id", async (req, res) => {
  console.log(`📡 [PUT] /api/job_postings/${req.params.id}`);
  const { id } = req.params;
  let {
    job_code,
    position_title,
    department,
    account,
    job_description,
    job_requirements,
    status,
    workSetup,
  } = req.body;

  // If account is undefined, null, or empty string, set it to NULL for the DB
  if (!account) {
    account = null;
  }

  try {
    await db.execute(
      `
      UPDATE 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings
      SET
        job_code = ?, position_title = ?, department = ?, account = ?,
        job_description = ?, job_requirements = ?, status = ?, workSetup = ?
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

    console.log(`✅ Updated job_postings ID ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`❌ Failed to update job_posting ID ${id}:`, err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

module.exports = router;
