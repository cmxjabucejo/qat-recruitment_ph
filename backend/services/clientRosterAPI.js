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
HELPERS
========================================
*/
function safeString(value, maxLength = 255) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function validateRequiredQuery(fields = []) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = safeString(req.query[field]);

      if (!value) {
        return res.status(400).json({
          success: false,
          error: `Missing required query parameter: ${field}`,
        });
      }

      req.query[field] = value;
    }

    next();
  };
}

const protectRecruitmentRoute = [
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
];

/*
========================================
ACCOUNT LIST
========================================
*/
router.get("/accountlist", protectRecruitmentRoute, async (req, res) => {
  const query = `
    SELECT ACCOUNTCODE, ACCOUNT, LOB, TASK
    FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
    WHERE SITE NOT IN ('DR') 
      AND ID IN (
        SELECT MAX(ID) 
        FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
        WHERE SITE NOT IN ('DR') 
        GROUP BY ACCOUNTCODE
      )
    ORDER BY ACCOUNT, LOB, TASK
  `;

  try {
    const [result] = await db.query(query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error fetching account list:", error);

    return res.status(500).json({
      success: false,
      error: "Database error",
    });
  }
});

/*
========================================
LOB LIST
========================================
*/
router.get(
  "/loblist",
  protectRecruitmentRoute,
  validateRequiredQuery(["account"]),
  async (req, res) => {
    const account = safeString(req.query.account);

    const query = `
      SELECT DISTINCT LOB
      FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
      WHERE ACCOUNT = ?
        AND SITE NOT IN ('DR') 
        AND ID IN (
          SELECT MAX(ID)
          FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
          WHERE SITE NOT IN ('DR') 
          GROUP BY ACCOUNTCODE
        )
      ORDER BY LOB
    `;

    try {
      const [result] = await db.query(query, [account]);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error fetching LOB list:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
TASK LIST
========================================
*/
router.get(
  "/tasklist",
  protectRecruitmentRoute,
  validateRequiredQuery(["account", "lob"]),
  async (req, res) => {
    const account = safeString(req.query.account);
    const lob = safeString(req.query.lob);

    const query = `
      SELECT DISTINCT TASK
      FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
      WHERE ACCOUNT = ?
        AND LOB = ?
        AND SITE NOT IN ('DR') 
        AND ID IN (
          SELECT MAX(ID)
          FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
          WHERE SITE NOT IN ('DR') 
          GROUP BY ACCOUNTCODE
        )
      ORDER BY TASK
    `;

    try {
      const [result] = await db.query(query, [account, lob]);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error fetching task list:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
ACCOUNT CODE
========================================
*/
router.get(
  "/accountcode",
  protectRecruitmentRoute,
  validateRequiredQuery(["account", "lob", "task"]),
  async (req, res) => {
    const account = safeString(req.query.account);
    const lob = safeString(req.query.lob);
    const task = safeString(req.query.task);

    const query = `
      SELECT ACCOUNTCODE
      FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
      WHERE ACCOUNT = ?
        AND LOB = ?
        AND TASK = ?
        AND SITE NOT IN ('DR') 
        AND ID IN (
          SELECT MAX(ID)
          FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
          WHERE SITE NOT IN ('DR') 
          GROUP BY ACCOUNTCODE
        )
      LIMIT 1
    `;

    try {
      const [result] = await db.query(query, [account, lob, task]);

      if (!result.length) {
        return res.status(404).json({
          success: false,
          error: "ACCOUNTCODE not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: result[0],
      });
    } catch (error) {
      console.error("❌ Error fetching ACCOUNTCODE:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

module.exports = router;