const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const { requireAuth } = require("../middleware/authMiddleware");
const { upload } = require("../utils/helpers");
const BUCKET_NAME = process.env.BUCKET_NAME;

router.get("/applicants-list", requireAuth, async (req, res) => {
  // Prevent caching
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  console.log("🚨 applicantsList endpoint HIT. Query:", req.query);

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

    console.log(`✅ Fetched from MySQL | Rows fetched: ${result.length}`);

    // Optionally nullify resume URL or other fields if needed
    const updatedResult = result.map((row) => ({
      ...row,
      resumeUrl: null, // Keep if needed
    }));

    return res.json({ source: "mysql", data: updatedResult });
  } catch (error) {
    console.error("❌ Error fetching applicant data:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

router.get("/successful-hires-per-recruiter", requireAuth, async (req, res) => {
  console.log("🔥 HIT /api/successfulHiresPerRecruiter");

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
      ORDER BY successful_hires DESC;
    `);

    return res.json({ data: result });
  } catch (error) {
    console.error("❌ Error fetching successful hires per recruiter:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

router.get("/successful-hires-per-source", requireAuth, async (req, res) => {
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
      ORDER BY successful_hires DESC;
    `);

    return res.json({ data: result });
  } catch (error) {
    console.error("❌ Error fetching hires per source:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

router.get("/recruitment-tracker", requireAuth, async (req, res) => {
  console.log("📥 /api/recruitment_tracker HIT");

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

    console.log(`✅ Fetched ${rows.length} rows from recruitment tracker`);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching recruitment tracker data:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/getcandidate/:applicationid", requireAuth, async (req, res) => {
  const { applicationid } = req.params;

  const query = `
    SELECT *
    FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
    WHERE applicationid = ?
    LIMIT 1;
  `;

  try {
    const [rows] = await db.query(query, [applicationid]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.json(rows[0]); // return the first (and only) candidate
  } catch (error) {
    console.error("Error fetching candidate:", error);
    res.status(500).json({ error: "Database error while fetching candidate" });
  }
});

router.get("/recruiters-list", requireAuth, async (req, res) => {
  try {
    // Replace with your database query
    const recruiters = await db.query(
      "SELECT * FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_recruiters",
    );
    res.status(200).json(recruiters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching recruiters" });
  }
});

router.post(
  "/addapplicants",
  upload.single("resume"),
  requireAuth,
  async (req, res) => {
    try {
      // Fetch the maximum ID from the database
      const [maxIdRow] = await db.query(
        "SELECT MAX(ID) as maxId FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database",
      );
      const maxId = maxIdRow[0].maxId || 0;

      const data = req.body;

      // Generate applicationId
      const currentDate = new Date();
      const yearMonth = `${String(currentDate.getFullYear()).slice(2)}${String(
        currentDate.getMonth() + 1,
      ).padStart(2, "0")}`;
      const roleAbbreviation = data.applied_role
        ? data.applied_role.slice(0, 2).toUpperCase()
        : "XX";
      const nextId = (maxId + 1).toString().padStart(4, "0");
      const applicationId = `CMX-${yearMonth}${roleAbbreviation}-${nextId}`;

      // Generate applicationdatetime in MySQL format
      const applicationDatetime = currentDate
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      // Upload the file to S3
      let resumeFilename = null;
      if (req.file) {
        const file = req.file;
        const uniqueFilename = `${applicationId}-${file.originalname}`; // Create a unique filename

        const s3Params = {
          Bucket: BUCKET_NAME,
          Key: `resumes/${uniqueFilename}`, // Unique file name in the bucket
          Body: fs.createReadStream(file.path),
          ContentType: file.mimetype,
          ACL: "private", // Keep the file private
        };

        await s3.upload(s3Params).promise();
        resumeFilename = uniqueFilename; // Save only the filename in the database

        // Remove the local file after upload
        fs.unlinkSync(file.path);
      }

      // Construct the fullName
      const candidateName = `${
        (data.nameTitle === "MD" || data.nameTitle === "DMD") &&
        data.nameTitle !== "N/A"
          ? "Dr. "
          : ""
      }${data.lastName}, ${data.firstName} ${data.middleName || ""}${
        data.nameSuffix && data.nameSuffix !== "N/A"
          ? " " + data.nameSuffix
          : ""
      }${
        (data.nameTitle === "MD" || data.nameTitle === "DMD") &&
        data.nameTitle !== "N/A"
          ? ", " + data.nameTitle
          : ""
      }`;

      // Insert data into the database
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
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
`;

      const values = [
        applicationId,
        applicationDatetime,
        candidateName,
        data.gender,
        data.candidatephone1,
        data.candidatephone2,
        data.candidateemail1,
        data.candidateemail2,
        data.candidatesource,
        data.candidatetype,
        resumeFilename,
        data.applied_role,
        data.applied_position_title,
        data.department,
        data.profiled_role,
        data.referral_code || "",
        applicationDatetime,
        data.overallStatus || "Active Application",
        applicationDatetime,
      ];

      await db.query(query, values);

      res.status(200).json({
        success: true,
        applicationId,
      });
    } catch (error) {
      console.error("Error handling applicant data:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

router.put(
  "/editapplicant",
  upload.single("resume"),
  requireAuth,
  async (req, res) => {
    const data = req.body;

    const normalizeText = (v) => (v === undefined ? "" : v);

    let resumeFilename = data.candidatecvattachment || null;

    if (req.file) {
      // Upload resume file to S3
      const uniqueFilename = `${data.applicationid}-${req.file.originalname}`;
      const s3Params = {
        Bucket: BUCKET_NAME,
        Key: `resumes/${uniqueFilename}`,
        Body: fs.createReadStream(req.file.path),
        ContentType: req.file.mimetype,
        ACL: "private",
      };

      try {
        await s3.upload(s3Params).promise();
        resumeFilename = uniqueFilename;
        fs.unlinkSync(req.file.path);
      } catch (error) {
        console.error("Error uploading resume to S3:", error);
        return res.status(500).json({ error: "Failed to upload resume" });
      }
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
    WHERE applicationid = ?;
  `;

    const values = [
      normalizeText(data.candidatename),
      normalizeText(data.gender),
      normalizeText(data.candidatephone1),
      normalizeText(data.candidatephone2),
      normalizeText(data.candidateemail1),
      normalizeText(data.candidateemail2),
      normalizeText(data.candidatesource),
      normalizeText(data.candidatetype),
      resumeFilename,
      normalizeText(data.applied_role),
      normalizeText(data.applied_position_title),
      normalizeText(data.remarks),
      normalizeText(data.recruiter),
      normalizeText(data.referral_code),
      data.applicationid, // 👈 unique key
    ];

    try {
      await db.query(query, values);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating applicant:", error);
      res.status(500).json({ error: "Database error" });
    }
  },
);

router.put("/updateapplicant", upload.single("resume"), async (req, res) => {
  const data = req.body;

  console.log("Incoming update data:", data);

  // ✅ FIX 5 — preserve empty strings, only default undefined
  const normalizeText = (v) => (v === undefined ? "" : v);

  let resumeFilename = normalizeText(data.candidatecvattachment);

  if (req.file) {
    const uniqueFilename = `${data.id}-${req.file.originalname}`;
    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: `resumes/${uniqueFilename}`,
      Body: fs.createReadStream(req.file.path),
      ContentType: req.file.mimetype,
      ACL: "private",
    };

    try {
      await s3.upload(s3Params).promise();
      resumeFilename = uniqueFilename;
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error("Error uploading resume to S3:", error);
      return res.status(500).json({ error: "Failed to upload resume" });
    }
  }

  // Override accountCode based on department
  switch (data.department) {
    case "Accounting":
      data.accountCode = "CMX-ACC-01";
      break;
    case "DREAM":
      data.accountCode = "CMX-DRM-08";
      break;
    case "Facilities":
      data.accountCode = "CMX-FAC-02";
      break;
    case "GSD":
      data.accountCode = "CMX-GSD-03";
      break;
    case "HRAD":
      data.accountCode = "CMX-HRD-04";
      break;
    case "IT":
      data.accountCode = "CMX-ITD-05";
      break;
    case "Ops Support":
      data.accountCode = "CMX-OPS-07";
      break;
    case "Recruitment":
      data.accountCode = "CMX-REC-06";
      break;
    default:
      break;
  }

  // ✅ Dates are CORRECTLY handled as NULL
  const normalizeDate = (date) => {
    if (!date || date.trim() === "") return null;
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime())
      ? "1900-01-01"
      : parsedDate.toISOString().split("T")[0];
  };

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
    WHERE applicationid = ?;
  `;

  const values = [
    normalizeText(data.department),
    normalizeText(data.roleProfiled),
    normalizeText(data.profiledForAccount) || "N/A",
    normalizeText(data.lob) || "N/A",
    normalizeText(data.task) || "N/A",
    data.accountCode,

    normalizeDate(data.initialInterviewDate),
    data.initialInterviewStatus || null,

    normalizeDate(data.skillsAssessmentDate),
    data.skillsAssessmentStatus || null,

    normalizeDate(data.clientInterviewDate),
    data.clientInterviewStatus || null,

    normalizeDate(data.finalInterviewDate),
    data.finalInterviewStatus || null,

    normalizeDate(data.jobOfferDate),
    data.jobOfferStatus || null,

    normalizeDate(data.onboardingDate),
    data.onboardingStatus || null,

    normalizeDate(data.endorsementDateTime),
    data.endorsementStatus || null,

    normalizeDate(data.dateUpdated),
    data.overallStatus || null,

    data.fallout || null,
    normalizeDate(data.falloutDate),

    normalizeText(data.remarks),
    normalizeText(data.recruiter),
    normalizeText(data.workSetup),

    resumeFilename,
    data.applicationid,
  ];

  try {
    await db.query(query, values);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating applicant:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
