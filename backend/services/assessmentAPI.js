const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/eol-assessment", requireAuth, async (req, res) => {
  const query = `
    SELECT 
      ar.*, 
      ad.candidatename, 
      ad.candidateemail1,
      ad.applied_position_title 
    FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_eol_answers ar
    LEFT JOIN 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database ad 
      ON ar.applicantid = ad.applicationid;
  `;

  try {
    const [result] = await db.query(query);
    res.json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/typing-results", requireAuth, async (req, res) => {
  const query = `
    SELECT 
      r.*, 
      a.candidatename AS CANDIDATENAME, 
      a.applied_position_title AS POSITION_APPLIED
    FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_typing_test r
    LEFT JOIN 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
      ON r.APPLICANTID = a.applicationid;
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error("Error fetching typing test results:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
