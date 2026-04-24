// ============================
// 📦 Module Imports
// ============================
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt"); // Use bcrypt in the backend
const AWS = require("aws-sdk");
const multer = require("multer"); // for recordings
const path = require("path");
const fs = require("fs");
const db = require("./config/dbconfig"); // Use the connection pool from dbconfig.js
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
// const { redisApplicant } = require("./redisApplicant");
// 🔴 REDIS
const { createClient } = require("redis");
const { RedisStore: SessionStore } = require("connect-redis");
const { RedisStore: RateLimitRedisStore } = require("rate-limit-redis");

// 🔐 SECURITY
const helmet = require("helmet");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const session = require("express-session");
dotenv.config();

/*
========================================
🔥 GLOBAL ERROR HANDLERS
========================================
*/
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION:", err);
});

// ============================
// ⚙️ App Initialization
// ============================
const app = express();
const PORT = process.env.SERVER_PORT || 5000;
const ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
// const BUCKET_NAME = "cmxdrqarecordings";

// ============================
// 📧 Nodemailer (Amazon SES)
// ============================

const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com", // SES SMTP endpoint
  port: 587, // Use 587 for TLS
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// ============================
// ☁️ AWS S3 Configuration
// ============================
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const BUCKET_NAME = process.env.BUCKET_NAME; // Replace with your S3 bucket name

// ============================
// 🔐 Middleware
// ============================

// Middleware
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: [FRONTEND_URL],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
========================================
🔴 REDIS CLIENT
========================================
*/
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

/*
========================================
🔥 START SERVER
========================================
*/
async function startServer() {
  try {
    await redisClient.connect();
    console.log("✅ Redis connected");

    /*
    ========================================
    🧠 SESSION
    ========================================
    */
    const redisStore = new SessionStore({
      client: redisClient,
      prefix: "cmx:",
    });

    app.use(
      session({
        name: process.env.SESSION_NAME,
        store: redisStore,
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax", // OK now (same domain)
          maxAge: 1000 * 60 * 60 * 8,
        },
      }),
    );

    /*
    ========================================
    🔥 RATE LIMITERS
    ========================================
    */
    const otpLimiter = rateLimit({
      store: new RateLimitRedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: "otp:",
      }),
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) =>
        `${req.body?.emailAddress || "noemail"}_${ipKeyGenerator(req.ip)}`,
    });

    const generalLimiter = rateLimit({
      store: new RateLimitRedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: "general:",
      }),
      windowMs: 5 * 60 * 1000,
      max: 150,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.session?.user?.id || ipKeyGenerator(req.ip),
    });

    const uploadLimiter = rateLimit({
      store: new RateLimitRedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: "upload:",
      }),
      windowMs: 5 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error:
          "Too many save or upload attempts. Please try again in a few minutes.",
      },
      keyGenerator: (req) => {
        if (req.session?.user?.id) {
          return `user:${req.session.user.id}`;
        }
        return `ip:${ipKeyGenerator(req.ip)}`;
      },
    });

    /*
    ========================================
    📦 ROUTES
    ========================================
    */
    const authAPI = require("./services/authAPI");
    const applicantAPI = require("./services/applicantsAPI");
    const clientRosterAPI = require("./services/clientRosterAPI");
    const emailAPI = require("./services/emailAPI");
    const jobpostingAPI = require("./services/jobPostingsAPI");
    const filesAPI = require("./services/filesAPI");
    const assessmentAPI = require("./services/assessmentAPI");

    app.use("/api/auth/send-otp", otpLimiter);

    // 🚫 CRITICAL: skip limiter for multipart
    app.use("/api", (req, res, next) => {
      const contentType = req.headers["content-type"] || "";

      // 📦 If multipart (form + upload)
      if (contentType.startsWith("multipart/form-data")) {
        return uploadLimiter(req, res, next); // ✅ NOT bypass
      }

      // 🔐 Everything else
      return generalLimiter(req, res, next);
    });

    app.use("/api/auth", authAPI);
    app.use("/api/applicants", applicantAPI);
    app.use("/api/accounts", clientRosterAPI);
    app.use("/api/emails", emailAPI);
    app.use("/api/jobposts", jobpostingAPI);
    app.use("/api/assessments", assessmentAPI);
    app.use("/api/mediafiles", uploadLimiter, filesAPI);

    /*
    ========================================
    ❤️ HEALTH CHECK
    ========================================
    */
    app.get("/", generalLimiter, (req, res) => {
      res.send("CMX API running 🚀");
    });

    /*
    ========================================
    🚀 START
    ========================================
    */
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

// ============================
// 🌐 Routes
// ============================

// // 🔻 Global error handler (place this at the end of your backend file)
// app.use((err, req, res, next) => {
//   console.error("❌ Global Error:", err);

//   if (err.message === "Unsupported file type") {
//     return res.status(400).json({ error: "Unsupported file type" });
//   }

//   // Other Multer-specific errors
//   if (err.name === "MulterError") {
//     return res.status(400).json({ error: err.message });
//   }

//   // Fallback
//   return res
//     .status(500)
//     .json({ error: "Something went wrong", details: err.message });
// });

// app.post("/api/checkEmailExists", async (req, res) => {
//   const { email1, email2 } = req.body;

//   if (!email1 && !email2) {
//     return res.status(400).json({ error: "At least one email is required" });
//   }

//   try {
//     let query = `
//       SELECT COUNT(*) as count
//       FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//       WHERE 1 = 0
//     `;
//     const values = [];

//     if (email1) {
//       query += " OR candidateemail1 = ? OR candidateemail2 = ?";
//       values.push(email1, email1);
//     }

//     if (email2) {
//       query += " OR candidateemail1 = ? OR candidateemail2 = ?";
//       values.push(email2, email2);
//     }

//     const [result] = await db.query(query, values);
//     const count = result[0].count;

//     res.status(200).json({ exists: count > 0 });
//   } catch (error) {
//     console.error("Error checking email:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// app.get("/api/userAccess", async (req, res) => {
//   const email = req.query.userid;

//   console.log(`🔐 [GET] /api/userAccess hit with email: ${email}`);

//   if (!email) {
//     return res.status(400).json({ error: "Missing email parameter." });
//   }

//   const query = `
//     SELECT
//       user_email AS EMAIL,
//       user_first_name,
//       user_last_name,
//       user_full_name AS NAME,
//       user_access_level AS USER_ROLE,
//       user_status AS STATUS
//     FROM 0000_cmx_appdata_appusers.db_cmx_appusers_recruitment_ph
//     WHERE user_email = ?
//     LIMIT 1;
//   `;

//   try {
//     const [rows] = await db.query(query, [email]);

//     if (rows.length === 0) {
//       console.warn(`❌ User not found: ${email}`);
//       return res.status(404).json({ message: "User not found" });
//     }

//     const user = rows[0];

//     console.log(`✅ User access fetched for ${user.EMAIL}`);
//     res.status(200).json(user); // returns USER_ROLE, NAME, EMAIL, etc.
//   } catch (error) {
//     console.error("❌ Error fetching user access:", error);
//     res.status(500).json({ error: "Database error", details: error.message });
//   }
// });

// app.get("/api/applicantsList", async (req, res) => {
//   // Prevent caching
//   res.set(
//     "Cache-Control",
//     "no-store, no-cache, must-revalidate, proxy-revalidate",
//   );
//   res.set("Pragma", "no-cache");
//   res.set("Expires", "0");

//   console.log("🚨 applicantsList endpoint HIT. Query:", req.query);

//   try {
//     const [result] = await db.query(`
//       SELECT a.*
//       FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
//       JOIN (
//         SELECT MAX(ID) AS max_id
//         FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//         GROUP BY applicationid
//       ) latest_applicant
//         ON a.ID = latest_applicant.max_id
//       ORDER BY a.ID DESC
//     `);

//     console.log(`✅ Fetched from MySQL | Rows fetched: ${result.length}`);

//     // Optionally nullify resume URL or other fields if needed
//     const updatedResult = result.map((row) => ({
//       ...row,
//       resumeUrl: null, // Keep if needed
//     }));

//     return res.json({ source: "mysql", data: updatedResult });
//   } catch (error) {
//     console.error("❌ Error fetching applicant data:", error);
//     return res.status(500).json({ error: "Database error" });
//   }
// });

// app.get("/api/successfulHiresPerRecruiter", async (req, res) => {
//   console.log("🔥 HIT /api/successfulHiresPerRecruiter");

//   try {
//     const [result] = await db.query(`
//       SELECT
//         a.recruiter,
//         COUNT(*) AS total_applications,
//         SUM(a.overall_status = 'Successful Hire') AS successful_hires
//       FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
//       JOIN (
//         SELECT MAX(ID) AS max_id
//         FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//         GROUP BY applicationid
//       ) latest_applicant
//         ON a.ID = latest_applicant.max_id
//       WHERE
//         a.recruiter IS NOT NULL
//         AND TRIM(a.recruiter) <> ''
//         AND LOWER(a.recruiter) <> 'unknown'
//         AND LOWER(a.recruiter) <> 'null'
//       GROUP BY a.recruiter
//       ORDER BY successful_hires DESC;
//     `);

//     return res.json({ data: result });
//   } catch (error) {
//     console.error("❌ Error fetching successful hires per recruiter:", error);
//     return res.status(500).json({ error: "Database error" });
//   }
// });

// app.get("/api/successfulHiresPerSource", async (req, res) => {
//   try {
//     const [result] = await db.query(`
//       SELECT
//         a.candidatesource,
//         COUNT(*) AS total_applications,
//         SUM(a.overall_status = 'Successful Hire') AS successful_hires
//       FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
//       JOIN (
//         SELECT MAX(ID) AS max_id
//         FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//         GROUP BY applicationid
//       ) latest_applicant
//         ON a.ID = latest_applicant.max_id
//       WHERE a.candidatesource IS NOT NULL
//         AND a.candidatesource <> ''
//       GROUP BY a.candidatesource
//       ORDER BY successful_hires DESC;
//     `);

//     return res.json({ data: result });
//   } catch (error) {
//     console.error("❌ Error fetching hires per source:", error);
//     return res.status(500).json({ error: "Database error" });
//   }
// });

// // GET /api/recruitment_tracker
// app.get("/api/recruitment_tracker", async (req, res) => {
//   console.log("📥 /api/recruitment_tracker HIT");

//   try {
//     const [rows] = await db.query(`
//        SELECT a.*
//       FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
//       INNER JOIN (
//         SELECT applicationid, MAX(id) AS max_id
//         FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//         GROUP BY applicationid
//       ) latest
//         ON a.id = latest.max_id
//       ORDER BY a.id DESC
//     `);

//     console.log(`✅ Fetched ${rows.length} rows from recruitment tracker`);
//     res.json(rows);
//   } catch (err) {
//     console.error("❌ Error fetching recruitment tracker data:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// app.get("/getCandidate/:applicationid", async (req, res) => {
//   const { applicationid } = req.params;

//   const query = `
//     SELECT *
//     FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//     WHERE applicationid = ?
//     LIMIT 1;
//   `;

//   try {
//     const [rows] = await db.query(query, [applicationid]);

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Candidate not found" });
//     }

//     res.json(rows[0]); // return the first (and only) candidate
//   } catch (error) {
//     console.error("Error fetching candidate:", error);
//     res.status(500).json({ error: "Database error while fetching candidate" });
//   }
// });

// app.get("/api/RecruitersList", async (req, res) => {
//   try {
//     // Replace with your database query
//     const recruiters = await db.query(
//       "SELECT * FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_recruiters",
//     );
//     res.status(200).json(recruiters);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error fetching recruiters" });
//   }
// });

// // Fetch Accounts Data
// //Account List
// app.get("/api/accountList", async (req, res) => {
//   const query = `
//     SELECT ACCOUNTCODE, ACCOUNT, LOB, TASK
//     FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//     WHERE SITE NOT IN ('DR')
//     AND ID IN (
//       SELECT MAX(ID)
//       FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//       WHERE SITE NOT IN ('DR')
//       GROUP BY ACCOUNTCODE
//     )`;

//   try {
//     const [result] = await db.query(query);
//     // console.log("✅ /api/accountList result:", result);
//     res.json(result);
//   } catch (error) {
//     console.error("Error fetching account list:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// //LOB List
// app.get("/api/lobList", async (req, res) => {
//   const { account } = req.query; // Get the selected ACCOUNT from query params

//   const query = `
//     SELECT DISTINCT LOB
//     FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//     WHERE ACCOUNT = ?
//       AND SITE NOT IN ('DR')
//       AND ID IN (
//         SELECT MAX(ID)
//         FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//         WHERE SITE NOT IN ('DR')
//         GROUP BY ACCOUNTCODE
//       )
//     ORDER BY LOB;`;

//   try {
//     const [result] = await db.query(query, [account]);

//     // if (result.length > 0) {
//     //   console.log(`Fetched ${result.length} LOBs for ACCOUNT ${account}:`, result);
//     // } else {
//     //   console.log(`No LOBs found for ACCOUNT ${account}.`);
//     // }

//     res.json(result);
//   } catch (error) {
//     console.error("Error fetching LOB list:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// //Task List
// app.get("/api/taskList", async (req, res) => {
//   const { account, lob } = req.query;

//   const query = `
//     SELECT DISTINCT TASK
//     FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//     WHERE ACCOUNT = ? AND LOB = ? AND SITE NOT IN ('DR')
//       AND ID IN (
//         SELECT MAX(ID)
//         FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//         WHERE SITE NOT IN ('DR')
//         GROUP BY ACCOUNTCODE
//       )
//     ORDER BY TASK;`;

//   try {
//     const [result] = await db.query(query, [account, lob]);

//     // if (result.length > 0) {
//     //   console.log(`Fetched ${result.length} Tasks for ACCOUNT ${account} and LOB ${lob}:`, result);
//     // } else {
//     //   console.log(`No Tasks found for ACCOUNT ${account} and LOB ${lob}.`);
//     // }

//     res.json(result);
//   } catch (error) {
//     console.error("Error fetching Task list:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// app.get("/api/accountCode", async (req, res) => {
//   const { account, lob, task } = req.query;

//   const query = `
//     SELECT ACCOUNTCODE
//     FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//     WHERE ACCOUNT = ? AND LOB = ? AND TASK = ? AND SITE NOT IN ('DR')
//       AND ID IN (
//         SELECT MAX(ID)
//         FROM 1000_cmx_appdata_client_database.db_cmx_client_roster
//         WHERE SITE NOT IN ('DR')
//         GROUP BY ACCOUNTCODE
//       );`;

//   try {
//     const [result] = await db.query(query, [account, lob, task]);

//     if (result.length > 0) {
//       // console.log(`Fetched ACCOUNTCODE for ACCOUNT: ${account}, LOB: ${lob}, TASK: ${task}:`, result);
//       res.json(result[0]); // Return the first matching record
//     } else {
//       // console.log(`No ACCOUNTCODE found for ACCOUNT: ${account}, LOB: ${lob}, TASK: ${task}.`);
//       res.status(404).json({ error: "ACCOUNTCODE not found" });
//     }
//   } catch (error) {
//     console.error("Error fetching ACCOUNTCODE:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // Add Applicants
// app.post("/addApplicants", upload.single("resume"), async (req, res) => {
//   try {
//     // Fetch the maximum ID from the database
//     const [maxIdRow] = await db.query(
//       "SELECT MAX(ID) as maxId FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database",
//     );
//     const maxId = maxIdRow[0].maxId || 0;

//     const data = req.body;

//     // Generate applicationId
//     const currentDate = new Date();
//     const yearMonth = `${String(currentDate.getFullYear()).slice(2)}${String(
//       currentDate.getMonth() + 1,
//     ).padStart(2, "0")}`;
//     const roleAbbreviation = data.applied_role
//       ? data.applied_role.slice(0, 2).toUpperCase()
//       : "XX";
//     const nextId = (maxId + 1).toString().padStart(4, "0");
//     const applicationId = `CMX-${yearMonth}${roleAbbreviation}-${nextId}`;

//     // Generate applicationdatetime in MySQL format
//     const applicationDatetime = currentDate
//       .toISOString()
//       .slice(0, 19)
//       .replace("T", " ");

//     // Upload the file to S3
//     let resumeFilename = null;
//     if (req.file) {
//       const file = req.file;
//       const uniqueFilename = `${applicationId}-${file.originalname}`; // Create a unique filename

//       const s3Params = {
//         Bucket: BUCKET_NAME,
//         Key: `resumes/${uniqueFilename}`, // Unique file name in the bucket
//         Body: fs.createReadStream(file.path),
//         ContentType: file.mimetype,
//         ACL: "private", // Keep the file private
//       };

//       await s3.upload(s3Params).promise();
//       resumeFilename = uniqueFilename; // Save only the filename in the database

//       // Remove the local file after upload
//       fs.unlinkSync(file.path);
//     }

//     // Construct the fullName
//     const candidateName = `${
//       (data.nameTitle === "MD" || data.nameTitle === "DMD") &&
//       data.nameTitle !== "N/A"
//         ? "Dr. "
//         : ""
//     }${data.lastName}, ${data.firstName} ${data.middleName || ""}${
//       data.nameSuffix && data.nameSuffix !== "N/A" ? " " + data.nameSuffix : ""
//     }${
//       (data.nameTitle === "MD" || data.nameTitle === "DMD") &&
//       data.nameTitle !== "N/A"
//         ? ", " + data.nameTitle
//         : ""
//     }`;

//     // Insert data into the database
//     const query = `
//   INSERT INTO 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database (
//     applicationid,
//     applicationdatetime,
//     candidatename,
//     gender,
//     candidatephone1,
//     candidatephone2,
//     candidateemail1,
//     candidateemail2,
//     candidatesource,
//     candidatetype,
//     candidatecvattachment,
//     applied_role,
//     applied_position_title,
//     department,
//     profiled_role,
//     referral_code,
//     date_updated,
//     overall_status,
//     applicationencodeddatetime
//   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
// `;

//     const values = [
//       applicationId,
//       applicationDatetime,
//       candidateName,
//       data.gender,
//       data.candidatephone1,
//       data.candidatephone2,
//       data.candidateemail1,
//       data.candidateemail2,
//       data.candidatesource,
//       data.candidatetype,
//       resumeFilename,
//       data.applied_role,
//       data.applied_position_title,
//       data.department,
//       data.profiled_role,
//       data.referral_code || "",
//       applicationDatetime,
//       data.overallStatus || "Active Application",
//       applicationDatetime,
//     ];

//     await db.query(query, values);

//     res.status(200).json({
//       success: true,
//       applicationId,
//     });
//   } catch (error) {
//     console.error("Error handling applicant data:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// app.put("/editApplicant", upload.single("resume"), async (req, res) => {
//   const data = req.body;

//   const normalizeText = (v) => (v === undefined ? "" : v);

//   let resumeFilename = data.candidatecvattachment || null;

//   if (req.file) {
//     // Upload resume file to S3
//     const uniqueFilename = `${data.applicationid}-${req.file.originalname}`;
//     const s3Params = {
//       Bucket: BUCKET_NAME,
//       Key: `resumes/${uniqueFilename}`,
//       Body: fs.createReadStream(req.file.path),
//       ContentType: req.file.mimetype,
//       ACL: "private",
//     };

//     try {
//       await s3.upload(s3Params).promise();
//       resumeFilename = uniqueFilename;
//       fs.unlinkSync(req.file.path);
//     } catch (error) {
//       console.error("Error uploading resume to S3:", error);
//       return res.status(500).json({ error: "Failed to upload resume" });
//     }
//   }

//   const query = `
//     UPDATE 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//     SET
//       candidatename = ?,
//       gender = ?,
//       candidatephone1 = ?,
//       candidatephone2 = ?,
//       candidateemail1 = ?,
//       candidateemail2 = ?,
//       candidatesource = ?,
//       candidatetype = ?,
//       candidatecvattachment = ?,
//       applied_role = ?,
//       applied_position_title = ?,
//       remarks = ?,
//       recruiter = ?,
//       referral_code = ?
//     WHERE applicationid = ?;
//   `;

//   const values = [
//     normalizeText(data.candidatename),
//     normalizeText(data.gender),
//     normalizeText(data.candidatephone1),
//     normalizeText(data.candidatephone2),
//     normalizeText(data.candidateemail1),
//     normalizeText(data.candidateemail2),
//     normalizeText(data.candidatesource),
//     normalizeText(data.candidatetype),
//     resumeFilename,
//     normalizeText(data.applied_role),
//     normalizeText(data.applied_position_title),
//     normalizeText(data.remarks),
//     normalizeText(data.recruiter),
//     normalizeText(data.referral_code),
//     data.applicationid, // 👈 unique key
//   ];

//   try {
//     await db.query(query, values);

//     res.status(200).json({ success: true });
//   } catch (error) {
//     console.error("Error updating applicant:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // Update Applicant Lifecycle Data
// app.put("/updateApplicant", upload.single("resume"), async (req, res) => {
//   const data = req.body;

//   console.log("Incoming update data:", data);

//   // ✅ FIX 5 — preserve empty strings, only default undefined
//   const normalizeText = (v) => (v === undefined ? "" : v);

//   let resumeFilename = normalizeText(data.candidatecvattachment);

//   if (req.file) {
//     const uniqueFilename = `${data.id}-${req.file.originalname}`;
//     const s3Params = {
//       Bucket: BUCKET_NAME,
//       Key: `resumes/${uniqueFilename}`,
//       Body: fs.createReadStream(req.file.path),
//       ContentType: req.file.mimetype,
//       ACL: "private",
//     };

//     try {
//       await s3.upload(s3Params).promise();
//       resumeFilename = uniqueFilename;
//       fs.unlinkSync(req.file.path);
//     } catch (error) {
//       console.error("Error uploading resume to S3:", error);
//       return res.status(500).json({ error: "Failed to upload resume" });
//     }
//   }

//   // Override accountCode based on department
//   switch (data.department) {
//     case "Accounting":
//       data.accountCode = "CMX-ACC-01";
//       break;
//     case "DREAM":
//       data.accountCode = "CMX-DRM-08";
//       break;
//     case "Facilities":
//       data.accountCode = "CMX-FAC-02";
//       break;
//     case "GSD":
//       data.accountCode = "CMX-GSD-03";
//       break;
//     case "HRAD":
//       data.accountCode = "CMX-HRD-04";
//       break;
//     case "IT":
//       data.accountCode = "CMX-ITD-05";
//       break;
//     case "Ops Support":
//       data.accountCode = "CMX-OPS-07";
//       break;
//     case "Recruitment":
//       data.accountCode = "CMX-REC-06";
//       break;
//     default:
//       break;
//   }

//   // ✅ Dates are CORRECTLY handled as NULL
//   const normalizeDate = (date) => {
//     if (!date || date.trim() === "") return null;
//     const parsedDate = new Date(date);
//     return isNaN(parsedDate.getTime())
//       ? "1900-01-01"
//       : parsedDate.toISOString().split("T")[0];
//   };

//   const query = `
//     UPDATE 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
//     SET
//       department = ?,
//       profiled_role = ?,
//       profiled_account = ?,
//       profiled_lob = ?,
//       profiled_task = ?,
//       profiled_acctCode = ?,
//       initialinterviewdatetime = ?,
//       initialinterviewstatus = ?,
//       skillsassessmentdatetime = ?,
//       skillsassessmentstatus = ?,
//       clientinterviewdatetime = ?,
//       clientinterviewstatus = ?,
//       finaliinterviewdatetime = ?,
//       finalinterviewstatus = ?,
//       jobofferdatetime = ?,
//       jobofferstatus = ?,
//       onboardingdatetime = ?,
//       onboardingstatus = ?,
//       endorsementdatetime = ?,
//       endorsementstatus = ?,
//       date_updated = ?,
//       overall_status = ?,
//       fallout = ?,
//       falloutdatetime = ?,
//       remarks = ?,
//       recruiter = ?,
//       worksetup = ?,
//       candidatecvattachment = ?
//     WHERE applicationid = ?;
//   `;

//   const values = [
//     normalizeText(data.department),
//     normalizeText(data.roleProfiled),
//     normalizeText(data.profiledForAccount) || "N/A",
//     normalizeText(data.lob) || "N/A",
//     normalizeText(data.task) || "N/A",
//     data.accountCode,

//     normalizeDate(data.initialInterviewDate),
//     data.initialInterviewStatus || null,

//     normalizeDate(data.skillsAssessmentDate),
//     data.skillsAssessmentStatus || null,

//     normalizeDate(data.clientInterviewDate),
//     data.clientInterviewStatus || null,

//     normalizeDate(data.finalInterviewDate),
//     data.finalInterviewStatus || null,

//     normalizeDate(data.jobOfferDate),
//     data.jobOfferStatus || null,

//     normalizeDate(data.onboardingDate),
//     data.onboardingStatus || null,

//     normalizeDate(data.endorsementDateTime),
//     data.endorsementStatus || null,

//     normalizeDate(data.dateUpdated),
//     data.overallStatus || null,

//     data.fallout || null,
//     normalizeDate(data.falloutDate),

//     normalizeText(data.remarks),
//     normalizeText(data.recruiter),
//     normalizeText(data.workSetup),

//     resumeFilename,
//     data.applicationid,
//   ];

//   try {
//     await db.query(query, values);
//     res.status(200).json({ success: true });
//   } catch (error) {
//     console.error("Error updating applicant:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// app.get("/api/media/:s3Key", async (req, res) => {
//   const { s3Key } = req.params;

//   if (!s3Key) {
//     return res.status(400).json({ error: "Missing S3 key" });
//   }

//   const s3Params = {
//     Bucket: BUCKET_NAME,
//     Key: decodeURIComponent(s3Key), // handle URL-encoded keys
//     Expires: 300, // 5 minutes
//   };

//   try {
//     const signedUrl = await s3.getSignedUrlPromise("getObject", s3Params);
//     res.json({ url: signedUrl });
//   } catch (err) {
//     console.error("❌ Failed to generate signed URL:", err);
//     res.status(500).json({ error: "Could not generate media access link." });
//   }
// });

// // GET Signed URL for Voice Recording
// app.get("/api/voice/:fileName", async (req, res) => {
//   try {
//     const { fileName } = req.params;

//     const s3Params = {
//       Bucket: BUCKET_NAME,
//       Key: `voicerecordings/${fileName}`, // same as what you used in upload
//       Expires: 60, // URL expiration time in seconds
//     };

//     const downloadURL = await s3.getSignedUrlPromise("getObject", s3Params);

//     res.redirect(downloadURL);
//   } catch (error) {
//     console.error("❌ Error generating voice download URL:", error);
//     res.status(500).json({ error: "Failed to generate voice download URL" });
//   }
// });

// app.post("/api/send_acknowledgment", async (req, res) => {
//   try {
//     const { email } = req.body;

//     await transporter.sendMail({
//       from: "noreply@callmaxsolutions.com",
//       to: email,
//       subject: "Resume Received - Callmax Solutions",
//       html: `
//         <p>Good day.</p>
//         <p>Thank you for submitting your resume at <strong>Callmax Solutions</strong>. We appreciate the time and effort you've invested in your application.</p>
//         <p>Due to the high volume of applicants, our team is carefully reviewing each submission, and as such, we may not be able to contact you immediately. If your qualifications match the requirements for the role, we will reach out to you directly for further steps.</p>
//         <p>We truly appreciate your interest in joining Callmax Solutions and thank you for your patience during this process. If you don't hear from us in the coming weeks, please know that we value your application and will keep it on file for future opportunities.</p>
//         <p><strong>Callmax Solutions International Recruitment</strong></p>
//       `,
//     });

//     res.status(200).json({ success: true });
//   } catch (error) {
//     console.error("❌ Failed to send acknowledgment email:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // For recruitment tracker
// //To view resume
// app.get("/api/resume/:filename", async (req, res) => {
//   const { filename } = req.params;

//   if (!filename) {
//     return res.status(400).json({ error: "Filename is required" });
//   }

//   const s3Params = {
//     Bucket: BUCKET_NAME,
//     Key: `resumes/${filename}`,
//     Expires: 3600, // URL valid for 1 hour
//   };

//   try {
//     const signedUrl = await s3.getSignedUrlPromise("getObject", s3Params);
//     res.json({ url: signedUrl }); // ✅ Return JSON response
//   } catch (err) {
//     console.error("Error generating signed URL:", err);
//     res.status(500).json({ error: "Failed to generate signed URL" });
//   }
// });

// app.post("/voiceRecordingEmail", async (req, res) => {
//   try {
//     const { emailAddress, applicantID } = req.body;

//     await transporter.sendMail({
//       from: "noreply@callmaxsolutions.com",
//       to: emailAddress,
//       subject: "Voice Recording Instructions - Callmax Solutions",
//       html: `
//         <p>Dear Applicant,</p>

//         <p>Thank you for your interest in joining <strong>Callmax Solutions</strong>.</p>

//         <p>As part of our screening process, we kindly request you to complete a short voice recording task by following the instructions below:</p>

//         <ol>
//           <li>Go to our official voice recording portal:
//             <a href="https://cmx.voicerecording.com" target="_blank">https://cmx.voicerecording.com</a>
//           </li>
//           <li>Use your unique <strong>Applicant ID</strong> (provided below) when submitting your recording.</li>
//           <li>Make a <strong>2-minute voice recording</strong> covering the following points:
//             <ul>
//               <li>Self-introduction: State your Full Name</li>
//               <li>Discuss your job experiences:
//                 <ul>
//                   <li>Most recent job</li>
//                   <li>The job you stayed the longest</li>
//                   <li>The job you stayed the shortest</li>
//                 </ul>
//               </li>
//               <li>Your key experience and competencies relevant to the job you are applying for</li>
//               <li>How you will commute from your home to the office</li>
//               <li>Your general attitude toward work</li>
//             </ul>
//           </li>
//           <li><strong>Note:</strong> Please complete all of the above in a single recording.</li>
//         </ol>

//         <p><strong>Applicant ID:</strong> ${applicantID}</p>

//         <p>We look forward to reviewing your recording. Thank you for your cooperation!</p>

//         <p>Sincerely,<br/><strong>Callmax Solutions International Recruitment Team</strong></p>
//       `,
//     });

//     res.status(200).json({
//       success: true,
//       message: "Voice recording email sent successfully.",
//     });
//   } catch (error) {
//     console.error("❌ Error sending voice recording email:", error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while sending the voice recording email.",
//       error: error.message,
//     });
//   }
// });

// app.post("/typingTestEmail", async (req, res) => {
//   try {
//     const { emailAddress, applicantID } = req.body;

//     await transporter.sendMail({
//       from: "noreply@callmaxsolutions.com",
//       to: emailAddress,
//       subject: "Your Typing Test Instructions - Callmax Solutions",
//       html: `
//         <p>Dear Applicant,</p>

//         <p>Thank you for your interest in becoming a part of <strong>Callmax Solutions</strong>.</p>

//         <p>To proceed with your application, please complete the typing test by following the instructions below:</p>

//         <ol>
//           <li>Visit our official typing test portal:
//             <a href="https://cmx.typingtest.com" target="_blank">https://cmx.typingtest.com</a>
//           </li>
//           <li>Enter your unique <strong>Applicant ID</strong> (provided below) to begin the test.</li>
//           <li>The test duration is <strong>2 minutes</strong>. Make sure to focus on both speed and accuracy.</li>
//           <li><strong>Important:</strong> You are only allowed <strong>one attempt</strong>, so please do your best.</li>
//         </ol>

//         <p><strong>Applicant ID:</strong> ${applicantID}</p>

//         <p>We appreciate your participation and look forward to reviewing your results.</p>

//         <p>Sincerely,<br/><strong>Callmax Solutions International Recruitment Team</strong></p>
//       `,
//     });

//     res
//       .status(200)
//       .json({ success: true, message: "Typing test email sent successfully." });
//   } catch (error) {
//     console.error("❌ Error sending typing test email:", error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while sending the typing test email.",
//       error: error.message,
//     });
//   }
// });

// //Send EOL Email
// app.post("/eolEmail", async (req, res) => {
//   try {
//     const { emailAddress, applicantID } = req.body;

//     // Send EOL Assessment Email
//     await transporter.sendMail({
//       from: "noreply@callmaxsolutions.com",
//       to: emailAddress,
//       subject: "Online English Assessment Test",
//       html: `
//         <p>Dear Applicant,</p>

//         <p>Thank you for your interest in joining <strong>Callmax Solutions</strong>. As part of your application process, you are required to take our <strong>online English assessment test</strong>.</p>

//         <p>Please click the link below to access the assessment site:</p>

//         <p><a href="https://eol.cmxph.com" target="_blank"><strong>Take the Assessment</strong></a></p>

//         <p>Use the following <strong>Applicant ID</strong> to log in and complete the test:</p>

//         <h2>${applicantID}</h2>

//         <p>We wish you the best of luck on your assessment!</p>

//         <p>If you have any questions or need assistance, feel free to reach out to us.</p>

//         <hr>

//         <p><strong>Confidentiality & Data Privacy</strong><br>
//         This email and its attachments are confidential and intended for the specified recipient(s) only. Unauthorized review, use, disclosure, or distribution is prohibited. If you received this email in error, please notify the sender and delete the email and its attachments.<br>
//         Opinions expressed are the sender's own and may not reflect those of Callmax Solutions International Inc. We accept no liability for damages resulting from this email. Your data privacy is important to us.</p>
//       `,
//     });

//     res
//       .status(200)
//       .json({ success: true, message: "EOL Email sent successfully." });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({
//       message: "An error occurred while processing the request.",
//       error: error.message,
//     });
//   }
// });

// //For EOL Assessment
// // Pull EOL assessment with candidate details
// app.get("/api/eolAssessment", async (req, res) => {
//   const query = `
//     SELECT
//       ar.*,
//       ad.candidatename,
//       ad.candidateemail1,
//       ad.applied_position_title
//     FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_eol_answers ar
//     LEFT JOIN 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database ad
//       ON ar.applicantid = ad.applicationid;
//   `;

//   try {
//     const [result] = await db.query(query);
//     res.json(result);
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// // For Typing Test page
// app.get("/api/typing-results", async (req, res) => {
//   const query = `
//     SELECT
//       r.*,
//       a.candidatename AS CANDIDATENAME,
//       a.applied_position_title AS POSITION_APPLIED
//     FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_typing_test r
//     LEFT JOIN 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database a
//       ON r.APPLICANTID = a.applicationid;
//   `;

//   try {
//     const [results] = await db.query(query);
//     res.json(results);
//   } catch (err) {
//     console.error("Error fetching typing test results:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// //For Job Posting Page
// // GET all job postings for its page
// app.get("/api/job_postings", async (req, res) => {
//   // console.log("📡 [GET] /api/job_postings");
//   try {
//     const [rows] = await db.execute(`
//       SELECT * FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings ORDER BY created_datetime DESC

//     `);
//     res.json({ success: true, data: rows });
//   } catch (err) {
//     console.error("❌ Failed to fetch job postings:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// // GET max ID from job postings for job code generation
// app.get("/api/job_postings/max-id", async (req, res) => {
//   console.log("📡 [GET] /api/job_postings/max-id");
//   try {
//     const [rows] = await db.execute(`
//       SELECT MAX(id) AS maxId FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings
//     `);
//     const maxId = rows[0].maxId || 0;
//     res.json({ success: true, maxId });
//   } catch (err) {
//     console.error("❌ Failed to fetch max ID:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// app.post("/api/job_postings", async (req, res) => {
//   const now = new Date();
//   console.log("📡 [POST] /api/job_postings");
//   console.log("📥 Received POST body:", req.body);

//   const {
//     job_code,
//     position_title,
//     department,
//     account,
//     job_description,
//     job_requirements,
//     status,
//     workSetup,
//   } = req.body;

//   console.log("Variables to insert:", {
//     job_code,
//     position_title,
//     department,
//     account,
//     job_description,
//     job_requirements,
//     status,
//     workSetup,
//   });

//   try {
//     await db.execute(
//       `INSERT INTO 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings (
//         job_code, position_title, department, account,
//         job_description, job_requirements, status, workSetup, created_datetime
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         job_code,
//         position_title,
//         department,
//         account,
//         job_description,
//         job_requirements,
//         status || "Open",
//         workSetup,
//         now,
//       ],
//     );

//     console.log(`✅ New job posting created: ${job_code}`);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("❌ Failed to create job posting:", err);
//     res.status(500).json({ success: false, message: "Insert failed" });
//   }
// });

// app.put("/api/job_postings/:id", async (req, res) => {
//   console.log(`📡 [PUT] /api/job_postings/${req.params.id}`);
//   const { id } = req.params;
//   let {
//     job_code,
//     position_title,
//     department,
//     account,
//     job_description,
//     job_requirements,
//     status,
//     workSetup,
//   } = req.body;

//   // If account is undefined, null, or empty string, set it to NULL for the DB
//   if (!account) {
//     account = null;
//   }

//   try {
//     await db.execute(
//       `
//       UPDATE 1001_cmx_appdata_recruitment_database_ph.db_cmxph_job_postings
//       SET
//         job_code = ?, position_title = ?, department = ?, account = ?,
//         job_description = ?, job_requirements = ?, status = ?, workSetup = ?
//       WHERE id = ?
//     `,
//       [
//         job_code,
//         position_title,
//         department,
//         account,
//         job_description,
//         job_requirements,
//         status,
//         workSetup,
//         id,
//       ],
//     );

//     console.log(`✅ Updated job_postings ID ${id}`);
//     res.json({ success: true });
//   } catch (err) {
//     console.error(`❌ Failed to update job_posting ID ${id}:`, err);
//     res.status(500).json({ success: false, message: "Update failed" });
//   }
// });

// Start the server
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
