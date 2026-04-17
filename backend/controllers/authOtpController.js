// // controllers/authOtpController.js
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");
// const pool = require("../config/dbconfig");
// const transporter = require("../utils/mailer");

// /**
//  * STEP 1 — CHECK EMAIL IF REGISTERED
//  */
// const checkEmail = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ success: false, error: "Email is required" });
//   }

//   try {
//     const conn = await pool.getConnection();

//     const [userRows] = await conn.query(
//       `SELECT email, firstname, lastname, middlename, employeeid
//        FROM z_webapp_cmx_qa.db_cmx_dr_users
//        WHERE email = ? LIMIT 1`,
//       [email]
//     );

//     conn.release();

//     if (userRows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: "Email is not registered.",
//       });
//     }

//     const user = userRows[0];

//     return res.status(200).json({
//       success: true,
//       user: {
//         email: user.email,
//         firstname: user.firstname,
//         lastname: user.lastname,
//         middlename: user.middlename,
//         employeeid: user.employeeid,
//       },
//     });
//   } catch (err) {
//     console.error("❌ checkEmail error:", err);
//     return res.status(500).json({ success: false, error: "Server error" });
//   }
// };

// /**
//  * STEP 2 — SEND OTP
//  */
// const sendOtp = async (req, res) => {
//   const { emailAddress } = req.body;

//   if (!emailAddress) {
//     return res.status(400).json({ success: false, message: "Missing email." });
//   }

//   try {
//     const otpPlain = String(Math.floor(100000 + Math.random() * 900000));

//     console.log(`📨 OTP for ${emailAddress}: ${otpPlain}`);

//     const salt = await bcrypt.genSalt(10);
//     const otpHashed = await bcrypt.hash(otpPlain, salt);

//     await transporter.sendMail({
//       from: "noreply@callmaxsolutions.com",
//       to: emailAddress,
//       subject: "CMX Recruitment Portal – One-Time Password",
//       html: `
//         <p>Hi,</p>
//         <p>Your One-Time Password (OTP) is:</p>
//         <h2>${otpPlain}</h2>
//         <p>This OTP will expire in <strong>5 minutes</strong>.</p>
//         <p>Please do not share your OTP.</p>
//         <p>If you did not request this code, please ignore this email.</p>
//         <hr>
//         <p><strong>Confidentiality & Data Privacy</strong><br>
//         This email and its attachments are confidential and intended for the specified recipient(s) only...</p>
//       `,
//     });

//     return res.status(200).json({
//       success: true,
//       otpHashed,
//     });
//   } catch (err) {
//     console.error("❌ sendOtp error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to send OTP",
//     });
//   }
// };

// /**
//  * STEP 3 — VERIFY OTP + RETURN ROLE + USER DATA + JWT TOKEN
//  */
// const verifyOtpLogin = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({
//       success: false,
//       error: "Email is required.",
//     });
//   }

//   try {
//     const conn = await pool.getConnection();

//     // Fetch user basic info
//     const [userRows] = await conn.query(
//       `SELECT firstname, lastname, middlename, employeeid
//        FROM z_webapp_cmx_qa.db_cmx_dr_users
//        WHERE email = ? LIMIT 1`,
//       [email]
//     );

//     if (userRows.length === 0) {
//       conn.release();
//       return res.status(404).json({
//         success: false,
//         error: "User record not found.",
//       });
//     }

//     const user = userRows[0];

//     // Fetch role info
//     const [accessRows] = await conn.query(
//       `SELECT USER_ROLE, STATUS, NAME, EMPLOYEEID
//        FROM z_webapp_central_auth.db_cmx_dr_employee_access
//        WHERE EMAIL = ? LIMIT 1`,
//       [email]
//     );

//     conn.release();

//     const USER_ROLE = accessRows[0]?.USER_ROLE || "Agent";
//     const NAME =
//       accessRows[0]?.NAME || `${user.firstname} ${user.lastname}`.trim();

//     // ✅ Generate JWT token
//     const token = jwt.sign(
//       {
//         email,
//         role: USER_ROLE,
//         employeeid: accessRows[0]?.EMPLOYEEID || user.employeeid,
//         name: NAME,
//       },
//       process.env.JWT_SECRET || "your_fallback_secret", // Replace or secure via env
//       {
//         expiresIn: "12h", // Token valid for 12 hours
//       }
//     );

//     // ✅ Return user info + token
//     return res.status(200).json({
//       success: true,
//       message: "OTP verified, login successful.",
//       user: {
//         email,
//         USER_ROLE,
//         EMPLOYEEID: accessRows[0]?.EMPLOYEEID || user.employeeid,
//         NAME,
//         firstname: user.firstname,
//         lastname: user.lastname,
//         middlename: user.middlename,
//       },
//       token,
//     });
//   } catch (err) {
//     console.error("❌ verifyOtpLogin error:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Server error.",
//     });
//   }
// };

// module.exports = {
//   checkEmail,
//   sendOtp,
//   verifyOtpLogin,
// };

// controllers/authOtpController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../config/dbconfig");
const transporter = require("../utils/mailer");

/**
 * STEP 1 — CHECK EMAIL IF REGISTERED
 */
const checkEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  try {
    const conn = await pool.getConnection();

    const [userRows] = await conn.query(
      `SELECT user_email, user_first_name, user_last_name, user_full_name, id
       FROM 0000_cmx_appdata_appusers.db_cmx_appusers_recruitment_ph
       WHERE user_email = ? LIMIT 1`,
      [email]
    );

    conn.release();

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Email is not registered.",
      });
    }

    const user = userRows[0];

    return res.status(200).json({
      success: true,
      user: {
        email: user.user_email,
        firstname: user.user_first_name,
        lastname: user.user_last_name,
        fullName: user.user_full_name,
        employeeid: user.id,
      },
    });
  } catch (err) {
    console.error("❌ checkEmail error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * STEP 2 — SEND OTP
 */
const sendOtp = async (req, res) => {
  const { emailAddress } = req.body;

  if (!emailAddress) {
    return res.status(400).json({ success: false, message: "Missing email." });
  }

  try {
    const otpPlain = String(Math.floor(100000 + Math.random() * 900000));
    //console.log(`📨 OTP for ${emailAddress}: ${otpPlain}`);

    const salt = await bcrypt.genSalt(10);
    const otpHashed = await bcrypt.hash(otpPlain, salt);

    await transporter.sendMail({
      from: "noreply@callmaxsolutions.com",
      to: emailAddress,
      subject: "CMX Recruitment Portal – One-Time Password",
      html: `
        <p>Hi,</p>
        <p>Your One-Time Password (OTP) is:</p>
        <h2>${otpPlain}</h2>
        <p>This OTP will expire in <strong>5 minutes</strong>.</p>
        <p>Please do not share your OTP.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <hr>
        <p><strong>Confidentiality & Data Privacy</strong><br>
        This email and its attachments are confidential and intended for the specified recipient(s) only...</p>
      `,
    });

    return res.status(200).json({
      success: true,
      otpHashed,
    });
  } catch (err) {
    console.error("❌ sendOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

/**
 * STEP 3 — VERIFY OTP + RETURN ROLE + USER DATA + JWT TOKEN
 */
const verifyOtpLogin = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "Email is required.",
    });
  }

  try {
    const conn = await pool.getConnection();

    // Fetch user info from recruitment users table
    const [userRows] = await conn.query(
      `SELECT id, user_email, user_first_name, user_last_name, user_full_name, user_access_level
       FROM 0000_cmx_appdata_appusers.db_cmx_appusers_recruitment_ph
       WHERE user_email = ? LIMIT 1`,
      [email]
    );

    conn.release();

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User record not found.",
      });
    }

    const user = userRows[0];

    const USER_ROLE = user.user_access_level || "Agent";
    const NAME =
      user.user_full_name ||
      `${user.user_first_name} ${user.user_last_name}`.trim();

    // ✅ Generate JWT token
    const token = jwt.sign(
      {
        email: user.user_email,
        role: USER_ROLE,
        employeeid: user.id,
        name: NAME,
      },
      process.env.JWT_SECRET || "your_fallback_secret",
      {
        expiresIn: "12h",
      }
    );

    // ✅ Return user info + token
    return res.status(200).json({
      success: true,
      message: "OTP verified, login successful.",
      user: {
        email: user.user_email,
        USER_ROLE,
        EMPLOYEEID: user.id,
        NAME,
        firstname: user.user_first_name,
        lastname: user.user_last_name,
        fullName: user.user_full_name,
      },
      token,
    });
  } catch (err) {
    console.error("❌ verifyOtpLogin error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error.",
    });
  }
};

module.exports = {
  checkEmail,
  sendOtp,
  verifyOtpLogin,
};
