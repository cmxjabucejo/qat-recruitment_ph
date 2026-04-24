const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/accountlist", requireAuth, async (req, res) => {
  const query = `
    SELECT ACCOUNTCODE, ACCOUNT, LOB, TASK
    FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
    WHERE SITE NOT IN ('DR') 
    AND ID IN (
      SELECT MAX(ID) 
      FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
      WHERE SITE NOT IN ('DR') 
      GROUP BY ACCOUNTCODE
    )`;

  try {
    const [result] = await db.query(query);
    // console.log("✅ /api/accountList result:", result);
    res.json(result);
  } catch (error) {
    console.error("Error fetching account list:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/loblist", requireAuth, async (req, res) => {
  const { account } = req.query; // Get the selected ACCOUNT from query params

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
    ORDER BY LOB;`;

  try {
    const [result] = await db.query(query, [account]);

    res.json(result);
  } catch (error) {
    console.error("Error fetching LOB list:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/tasklist", requireAuth, async (req, res) => {
  const { account, lob } = req.query;

  const query = `
    SELECT DISTINCT TASK
    FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
    WHERE ACCOUNT = ? AND LOB = ? AND SITE NOT IN ('DR') 
      AND ID IN (
        SELECT MAX(ID)
        FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
        WHERE SITE NOT IN ('DR') 
        GROUP BY ACCOUNTCODE
      )
    ORDER BY TASK;`;

  try {
    const [result] = await db.query(query, [account, lob]);

    res.json(result);
  } catch (error) {
    console.error("Error fetching Task list:", error);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/accountcode", requireAuth, async (req, res) => {
  const { account, lob, task } = req.query;

  const query = `
    SELECT ACCOUNTCODE
    FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
    WHERE ACCOUNT = ? AND LOB = ? AND TASK = ? AND SITE NOT IN ('DR') 
      AND ID IN (
        SELECT MAX(ID)
        FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
        WHERE SITE NOT IN ('DR') 
        GROUP BY ACCOUNTCODE
      );`;

  try {
    const [result] = await db.query(query, [account, lob, task]);

    if (result.length > 0) {
      // console.log(`Fetched ACCOUNTCODE for ACCOUNT: ${account}, LOB: ${lob}, TASK: ${task}:`, result);
      res.json(result[0]); // Return the first matching record
    } else {
      // console.log(`No ACCOUNTCODE found for ACCOUNT: ${account}, LOB: ${lob}, TASK: ${task}.`);
      res.status(404).json({ error: "ACCOUNTCODE not found" });
    }
  } catch (error) {
    console.error("Error fetching ACCOUNTCODE:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
