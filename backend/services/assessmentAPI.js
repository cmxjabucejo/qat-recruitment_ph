const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

/*
========================================
ACCESS CONTROL
========================================
*/
const RECRUITMENT_ROLES = ["Admin", "Super Admin", "Recruiter"];

/*
========================================
EOL ASSESSMENT RESULTS
========================================
*/
router.get(
  "/eol-assessment",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    const query = `
      SELECT 
        ar.*, 
        ad.candidatename, 
        ad.candidateemail1,
        ad.applied_position_title 
      FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_eol_answers ar
      LEFT JOIN 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database ad 
        ON ar.applicantid = ad.applicationid
      ORDER BY ar.id DESC
    `;

    try {
      const [result] = await db.query(query);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error fetching EOL assessment data:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
TYPING TEST RESULTS
========================================
*/
router.get(
  "/typing-results",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    const query = `
      SELECT 
        r.*, 
        a.candidatename AS CANDIDATENAME, 
        a.applied_position_title AS POSITION_APPLIED
      FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_typing_test r
      LEFT JOIN 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
        ON r.APPLICANTID = a.applicationid
      ORDER BY r.id DESC
    `;

    try {
      const [results] = await db.query(query);

      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (err) {
      console.error("❌ Error fetching typing test results:", err);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

module.exports = router;