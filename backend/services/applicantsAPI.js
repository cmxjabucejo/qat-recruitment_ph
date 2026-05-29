const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { upload, s3 } = require("../utils/helpers");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const BUCKET_NAME = process.env.BUCKET_NAME;
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
function noCache(res) {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
}

function safeString(value, maxLength = 255) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function safeNullableString(value, maxLength = 255) {
  const cleaned = safeString(value, maxLength);
  return cleaned || null;
}

function safeLongText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function safeFileName(value) {
  return String(value || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

function normalizeDate(date) {
  if (!date || String(date).trim() === "") return null;

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate.toISOString().split("T")[0];
}

function buildCandidateName(data) {
  const title = safeString(data.nameTitle, 20);
  const suffix = safeString(data.nameSuffix, 20);
  const firstName = safeString(data.firstName, 100);
  const middleName = safeString(data.middleName, 100);
  const lastName = safeString(data.lastName, 100);

  const isDoctor = (title === "MD" || title === "DMD") && title !== "N/A";

  return `${isDoctor ? "Dr. " : ""}${lastName}, ${firstName} ${
    middleName || ""
  }${suffix && suffix !== "N/A" ? ` ${suffix}` : ""}${
    isDoctor ? `, ${title}` : ""
  }`.trim();
}

function setAccountCodeByDepartment(data) {
  const departmentMap = {
    Accounting: "CMX-ACC-01",
    DREAM: "CMX-DRM-08",
    Facilities: "CMX-FAC-02",
    GSD: "CMX-GSD-03",
    HRAD: "CMX-HRD-04",
    IT: "CMX-ITD-05",
    "Ops Support": "CMX-OPS-07",
    Recruitment: "CMX-REC-06",
  };

  return departmentMap[data.department] || data.accountCode || null;
}

async function uploadResumeToS3(file, applicationId) {
  if (!file) return null;

  if (!BUCKET_NAME) {
    throw new Error("BUCKET_NAME is not configured");
  }

  const uniqueFilename = `${safeString(applicationId, 100)}-${safeFileName(
    file.originalname,
  )}`;

  const s3Params = {
    Bucket: BUCKET_NAME,
    Key: `resumes/${uniqueFilename}`,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(s3Params));

  try {
    fs.unlinkSync(file.path);
  } catch (unlinkErr) {
    console.warn("⚠️ Could not remove local uploaded file:", unlinkErr.message);
  }

  return uniqueFilename;
}

function cleanupUploadedFile(req) {
  if (req.file?.path) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // ignore cleanup failure
    }
  }
}

/*
========================================
APPLICANTS LIST
========================================
*/
router.get(
  "/applicants-list",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    noCache(res);

    try {
      const [result] = await db.query(`
        SELECT a.*
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
        JOIN (
          SELECT MAX(ID) AS max_id
          FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
          GROUP BY applicationid
        ) latest_applicant
          ON a.ID = latest_applicant.max_id
        ORDER BY a.ID DESC
      `);

      const updatedResult = result.map((row) => ({
        ...row,
        resumeUrl: null,
      }));

      return res.status(200).json({
        success: true,
        source: "mysql",
        data: updatedResult,
      });
    } catch (error) {
      console.error("❌ Error fetching applicant data:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
SUCCESSFUL HIRES PER RECRUITER
========================================
*/
router.get(
  "/successful-hires-per-recruiter",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    try {
      const [result] = await db.query(`
        SELECT 
          a.recruiter,
          COUNT(*) AS total_applications,
          SUM(a.overall_status = 'Successful Hire') AS successful_hires
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
        JOIN (
          SELECT MAX(ID) AS max_id
          FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
          GROUP BY applicationid
        ) latest_applicant
          ON a.ID = latest_applicant.max_id
        WHERE 
          a.recruiter IS NOT NULL
          AND TRIM(a.recruiter) <> ''
          AND LOWER(a.recruiter) <> 'unknown'
          AND LOWER(a.recruiter) <> 'null'
        GROUP BY a.recruiter
        ORDER BY successful_hires DESC
      `);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error fetching successful hires per recruiter:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
SUCCESSFUL HIRES PER SOURCE
========================================
*/
router.get(
  "/successful-hires-per-source",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    try {
      const [result] = await db.query(`
        SELECT 
          a.candidatesource,
          COUNT(*) AS total_applications,
          SUM(a.overall_status = 'Successful Hire') AS successful_hires
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
        JOIN (
          SELECT MAX(ID) AS max_id
          FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
          GROUP BY applicationid
        ) latest_applicant
          ON a.ID = latest_applicant.max_id
        WHERE a.candidatesource IS NOT NULL
          AND a.candidatesource <> ''
        GROUP BY a.candidatesource
        ORDER BY successful_hires DESC
      `);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error fetching hires per source:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
RECRUITMENT TRACKER
========================================
*/
router.get(
  "/recruitment-tracker",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT a.*
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
        INNER JOIN (
          SELECT applicationid, MAX(id) AS max_id
          FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
          GROUP BY applicationid
        ) latest
          ON a.id = latest.max_id
        ORDER BY a.id DESC
      `);

      return res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (err) {
      console.error("❌ Error fetching recruitment tracker data:", err);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
GET CANDIDATE
========================================
*/
router.get(
  "/getcandidate/:applicationid",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    const applicationid = safeString(req.params.applicationid, 100);

    if (!applicationid) {
      return res.status(400).json({
        success: false,
        error: "Invalid candidate request.",
      });
    }

    try {
      const [rows] = await db.query(
        `
        SELECT *
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
        WHERE applicationid = ?
        LIMIT 1
        `,
        [applicationid],
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          error: "Candidate not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      console.error("❌ Error fetching candidate:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
RECRUITERS LIST
========================================
*/
router.get(
  "/recruiters-list",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    try {
      const [recruiters] = await db.query(`
        SELECT *
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_recruiters
      `);

      return res.status(200).json({
        success: true,
        data: recruiters,
      });
    } catch (error) {
      console.error("❌ Error fetching recruiters:", error);

      return res.status(500).json({
        success: false,
        message: "Error fetching recruiters",
      });
    }
  },
);

/*
========================================
ADD APPLICANT
========================================
Internal only.
Public application submission is handled by quickapply.cmxph.com.
Important: requireAuth must run before upload.single().
========================================
*/
router.post(
  "/addapplicants",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  upload.single("resume"),
  async (req, res) => {
    try {
      const data = req.body;

      const [maxIdRow] = await db.query(`
        SELECT MAX(ID) as maxId
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
      `);

      const maxId = maxIdRow[0].maxId || 0;

      const currentDate = new Date();
      const yearMonth = `${String(currentDate.getFullYear()).slice(2)}${String(
        currentDate.getMonth() + 1,
      ).padStart(2, "0")}`;

      const roleAbbreviation = data.applied_role
        ? safeString(data.applied_role, 100).slice(0, 2).toUpperCase()
        : "XX";

      const nextId = (maxId + 1).toString().padStart(4, "0");
      const applicationId = `CMX-${yearMonth}${roleAbbreviation}-${nextId}`;

      const applicationDatetime = currentDate
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const resumeFilename = await uploadResumeToS3(req.file, applicationId);

      const candidateName = buildCandidateName(data);

      const query = `
        INSERT INTO 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database (
          applicationid, 
          applicationdatetime, 
          candidatename, 
          gender,
          candidatephone1, 
          candidatephone2, 
          candidateemail1,
          candidateemail2, 
          candidatesource, 
          candidatetype, 
          candidatecvattachment, 
          applied_role, 
          applied_position_title,
          department,
          profiled_role, 
          referral_code,
          date_updated,
          overall_status,
          applicationencodeddatetime
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

      const values = [
        applicationId,
        applicationDatetime,
        candidateName,
        safeNullableString(data.gender, 50),
        safeNullableString(data.candidatephone1, 50),
        safeNullableString(data.candidatephone2, 50),
        safeNullableString(data.candidateemail1, 255),
        safeNullableString(data.candidateemail2, 255),
        safeNullableString(data.candidatesource, 255),
        safeNullableString(data.candidatetype, 255),
        resumeFilename,
        safeNullableString(data.applied_role, 255),
        safeNullableString(data.applied_position_title, 255),
        safeNullableString(data.department, 255),
        safeNullableString(data.profiled_role, 255),
        safeString(data.referral_code, 100),
        applicationDatetime,
        safeNullableString(data.overallStatus, 100) || "Active Application",
        applicationDatetime,
      ];

      await db.query(query, values);

      return res.status(201).json({
        success: true,
        applicationId,
      });
    } catch (error) {
      cleanupUploadedFile(req);
      console.error("❌ Error handling applicant data:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
EDIT APPLICANT BASIC INFO
========================================
Important: requireAuth must run before upload.single().
========================================
*/
router.put(
  "/editapplicant",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  upload.single("resume"),
  async (req, res) => {
    try {
      const data = req.body;
      const applicationid = safeString(data.applicationid, 100);

      if (!applicationid) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          error: "Invalid applicant request.",
        });
      }

      let resumeFilename = safeNullableString(data.candidatecvattachment, 255);

      if (req.file) {
        resumeFilename = await uploadResumeToS3(req.file, applicationid);
      }

      const query = `
        UPDATE 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
        SET 
          candidatename = ?, 
          gender = ?, 
          candidatephone1 = ?, 
          candidatephone2 = ?, 
          candidateemail1 = ?, 
          candidateemail2 = ?, 
          candidatesource = ?, 
          candidatetype = ?, 
          candidatecvattachment = ?, 
          applied_role = ?, 
          applied_position_title = ?, 
          remarks = ?, 
          recruiter = ?, 
          referral_code = ?
        WHERE applicationid = ?
      `;

      const values = [
        safeNullableString(data.candidatename, 255),
        safeNullableString(data.gender, 50),
        safeNullableString(data.candidatephone1, 50),
        safeNullableString(data.candidatephone2, 50),
        safeNullableString(data.candidateemail1, 255),
        safeNullableString(data.candidateemail2, 255),
        safeNullableString(data.candidatesource, 255),
        safeNullableString(data.candidatetype, 255),
        resumeFilename,
        safeNullableString(data.applied_role, 255),
        safeNullableString(data.applied_position_title, 255),
        safeLongText(data.remarks),
        safeNullableString(data.recruiter, 255),
        safeNullableString(data.referral_code, 100),
        applicationid,
      ];

      const [result] = await db.query(query, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Applicant not found",
        });
      }

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      cleanupUploadedFile(req);
      console.error("❌ Error updating applicant:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

/*
========================================
UPDATE APPLICANT PIPELINE / STATUS
========================================
This was previously missing requireAuth.
========================================
*/
router.put(
  "/updateapplicant",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  upload.single("resume"),
  async (req, res) => {
    try {
      const data = req.body;
      const applicationid = safeString(data.applicationid, 100);

      if (!applicationid) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          error: "Invalid applicant request.",
        });
      }

      let resumeFilename = safeNullableString(data.candidatecvattachment, 255);

      if (req.file) {
        const filePrefix = safeString(data.id || applicationid, 100);
        resumeFilename = await uploadResumeToS3(req.file, filePrefix);
      }

      const accountCode = setAccountCodeByDepartment(data);

      const query = `
        UPDATE 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
        SET 
          department = ?, 
          profiled_role = ?, 
          profiled_account = ?, 
          profiled_lob = ?, 
          profiled_task = ?, 
          profiled_acctCode = ?, 
          initialinterviewdatetime = ?, 
          initialinterviewstatus = ?, 
          skillsassessmentdatetime = ?, 
          skillsassessmentstatus = ?, 
          clientinterviewdatetime = ?, 
          clientinterviewstatus = ?, 
          finaliinterviewdatetime = ?, 
          finalinterviewstatus = ?, 
          jobofferdatetime = ?, 
          jobofferstatus = ?, 
          onboardingdatetime = ?, 
          onboardingstatus = ?, 
          endorsementdatetime = ?, 
          endorsementstatus = ?, 
          date_updated = ?, 
          overall_status = ?, 
          fallout = ?, 
          falloutdatetime = ?, 
          remarks = ?, 
          recruiter = ?, 
          worksetup = ?,  
          candidatecvattachment = ? 
        WHERE applicationid = ?
      `;

      const values = [
        safeNullableString(data.department, 255),
        safeNullableString(data.roleProfiled, 255),
        safeNullableString(data.profiledForAccount, 255) || "N/A",
        safeNullableString(data.lob, 255) || "N/A",
        safeNullableString(data.task, 255) || "N/A",
        safeNullableString(accountCode, 100),

        normalizeDate(data.initialInterviewDate),
        safeNullableString(data.initialInterviewStatus, 100),

        normalizeDate(data.skillsAssessmentDate),
        safeNullableString(data.skillsAssessmentStatus, 100),

        normalizeDate(data.clientInterviewDate),
        safeNullableString(data.clientInterviewStatus, 100),

        normalizeDate(data.finalInterviewDate),
        safeNullableString(data.finalInterviewStatus, 100),

        normalizeDate(data.jobOfferDate),
        safeNullableString(data.jobOfferStatus, 100),

        normalizeDate(data.onboardingDate),
        safeNullableString(data.onboardingStatus, 100),

        normalizeDate(data.endorsementDateTime),
        safeNullableString(data.endorsementStatus, 100),

        normalizeDate(data.dateUpdated),
        safeNullableString(data.overallStatus, 100),

        safeNullableString(data.fallout, 255),
        normalizeDate(data.falloutDate),

        safeLongText(data.remarks),
        safeNullableString(data.recruiter, 255),
        safeNullableString(data.workSetup, 100),

        resumeFilename,
        applicationid,
      ];

      const [result] = await db.query(query, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Applicant not found",
        });
      }

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      cleanupUploadedFile(req);
      console.error("❌ Error updating applicant:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

module.exports = router;
