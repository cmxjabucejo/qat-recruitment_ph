const express = require("express");
const router = express.Router();
const db = require("../config/dbconfig");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// ===============================
// CONFIG
// ===============================
const OTP_EXPIRY_MINUTES = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const SESSION_COOKIE_NAME = process.env.SESSION_NAME || "cmx_recruitment_sid";

const AUTH_GENERIC_MESSAGE = "Invalid credentials or authentication request";
const IFVALID_AUTH_MESSAGE = "If request is valid, an OTP will be sent.";

const GENERIC_AUTH_RESPONSE = {
  success: true,
  message: IFVALID_AUTH_MESSAGE,
};

const RECRUITMENT_ROLES = ["Admin", "Super Admin", "Recruiter"];

// ===============================
// EMAIL CONFIG
// ===============================
const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

// ===============================
// HELPERS
// ===============================
function normalizeEmail(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : req.ip;
}

function getUserAgent(req) {
  return req.headers["user-agent"] || null;
}

function generateFingerprint(req) {
  const ip = getClientIp(req);
  const ua = getUserAgent(req) || "";
  const deviceId = req.headers["x-device-id"] || "unknown";

  const raw = `${ip}|${ua}|${deviceId}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function buildUser(user) {
  return {
    userid: user.user_email,
    userEmail: user.user_email,
    firstName: user.user_first_name,
    lastName: user.user_last_name,
    fullName: user.user_full_name,
    userLevel: user.user_access_level,
    userStatus: user.user_status,
  };
}

function isAdminUser(sessionUser) {
  return ["Admin", "Super Admin"].includes(sessionUser?.userLevel);
}

async function writeAuditLog({
  email = null,
  eventType = null,
  status = null,
  ipAddress = null,
  userAgent = null,
  details = null,
}) {
  try {
    await db.execute(
      `
      INSERT INTO 0003_cmx_auth_handler_recruitment_ph.auth_audit_log_recruitment_ph
        (email, event_type, status, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        email ?? null,
        eventType ?? null,
        status ?? null,
        ipAddress ?? null,
        userAgent ?? null,
        details ?? null,
      ],
    );
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

async function sendNewDeviceAlert({ toEmail, name, ip, userAgent }) {
  const now = new Date().toLocaleString();

  const html = `
    <p>Hi ${name || "User"},</p>

    <p>We detected a login to your account from a <strong>new device</strong>.</p>

    <p><strong>Details:</strong></p>
    <ul>
      <li><strong>IP Address:</strong> ${ip}</li>
      <li><strong>Device/Browser:</strong> ${userAgent || "Unknown"}</li>
      <li><strong>Time:</strong> ${now}</li>
    </ul>

    <p>If this was <strong>NOT you</strong>, please report this to dream-devops@callmaxsolutions.com or notify the Callmax IT department.</p>

    <br/>
    <p>— Callmax DREAM-DEVOPS Team</p>
  `;

  await transporter.sendMail({
    to: toEmail,
    from:
      process.env.EMAIL_FROM ||
      "Callmax Solutions - Security Alert <noreply@callmaxsolutions.com>",
    subject: "New Login Detected",
    html,
  });
}

async function findActiveUserByEmail(email) {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM 0000_cmx_appdata_appusers.db_cmx_appusers_recruitment_ph
    WHERE user_email = ?
    LIMIT 1
    `,
    [email],
  );

  if (!rows.length) return null;
  if (rows[0].user_status !== "Active") return null;

  return rows[0];
}

// ===============================
// CHECK EMAIL
// ===============================
// Security fix:
// Do not reveal whether the email exists or is allowed.
router.post("/check-email", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  try {
    if (!email) {
      await writeAuditLog({
        email: null,
        eventType: "CHECK_EMAIL",
        status: "DENIED",
        ipAddress: ip,
        userAgent: ua,
        details: "Missing email",
      });

      return res.status(200).json(GENERIC_AUTH_RESPONSE);
    }

    const user = await findActiveUserByEmail(email);

    await writeAuditLog({
      email,
      eventType: "CHECK_EMAIL",
      status: user ? "SUCCESS" : "DENIED",
      ipAddress: ip,
      userAgent: ua,
      details: user ? "Eligible account checked" : "Invalid or inactive user",
    });

    return res.status(200).json(GENERIC_AUTH_RESPONSE);
  } catch (err) {
    console.error("❌ check-email error:", err);

    await writeAuditLog({
      email,
      eventType: "CHECK_EMAIL",
      status: "ERROR",
      ipAddress: ip,
      userAgent: ua,
      details: err.message,
    });

    return res.status(200).json(GENERIC_AUTH_RESPONSE);
  }
});

// ===============================
// CHECK APPLICANT EMAIL EXISTS
// ===============================
// Protected because public application submission is handled by quickapply.cmxph.com.
// This route is only for internal recruitment users.
router.post(
  "/check-email-exists",
  requireAuth,
  requireRole(...RECRUITMENT_ROLES),
  async (req, res) => {
    const email1 = normalizeEmail(req.body.email1);
    const email2 = normalizeEmail(req.body.email2);

    if (!email1 && !email2) {
      return res.status(400).json({
        success: false,
        error: "At least one email is required.",
      });
    }

    try {
      let query = `
        SELECT COUNT(*) AS count
        FROM 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
        WHERE 1 = 0
      `;

      const values = [];

      if (email1) {
        query += " OR LOWER(candidateemail1) = ? OR LOWER(candidateemail2) = ?";
        values.push(email1, email1);
      }

      if (email2) {
        query += " OR LOWER(candidateemail1) = ? OR LOWER(candidateemail2) = ?";
        values.push(email2, email2);
      }

      const [result] = await db.query(query, values);
      const count = result?.[0]?.count || 0;

      return res.status(200).json({
        success: true,
        exists: count > 0,
      });
    } catch (error) {
      console.error("❌ Error checking applicant email:", error);

      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }
  },
);

// ===============================
// SEND OTP
// ===============================
// Security fix:
// Invalid users receive the same outward response shape as valid users.
// A dummy challengeId is returned for invalid/inactive users, but no OTP is sent.
router.post("/send-otp", async (req, res) => {
  const emailAddress = normalizeEmail(req.body.emailAddress || req.body.email);
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const dummyChallengeId = crypto.randomUUID();
  const dummyExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

  try {
    if (!emailAddress) {
      await writeAuditLog({
        email: null,
        eventType: "SEND_OTP",
        status: "DENIED",
        ipAddress: ip,
        userAgent: ua,
        details: "Missing email",
      });

      return res.status(200).json({
        success: true,
        challengeId: dummyChallengeId,
        expiresAt: dummyExpires,
      });
    }

    const user = await findActiveUserByEmail(emailAddress);

    if (!user) {
      await writeAuditLog({
        email: emailAddress,
        eventType: "SEND_OTP",
        status: "DENIED",
        ipAddress: ip,
        userAgent: ua,
        details: "User not found or inactive",
      });

      return res.status(200).json({
        success: true,
        challengeId: dummyChallengeId,
        expiresAt: dummyExpires,
      });
    }

    const firstName = user.user_first_name || "User";

    await db.execute(
      `
      UPDATE 0003_cmx_auth_handler_recruitment_ph.auth_otp_challenges_recruitment_ph
      SET status = 'expired'
      WHERE email = ? AND status = 'pending'
      `,
      [emailAddress],
    );

    const otp = crypto.randomInt(100000, 1000000).toString();
    const hash = await bcrypt.hash(otp, 10);
    const challengeId = crypto.randomUUID();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    await db.execute(
      `
      INSERT INTO 0003_cmx_auth_handler_recruitment_ph.auth_otp_challenges_recruitment_ph
        (challenge_id, email, otp_hash, max_attempts, requested_ip, requested_user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [challengeId, emailAddress, hash, MAX_VERIFY_ATTEMPTS, ip, ua, expires],
    );

    await transporter.sendMail({
      to: emailAddress,
      from:
        process.env.EMAIL_FROM ||
        "Callmax Solutions <noreply@callmaxsolutions.com>",
      subject: "Your One-Time Password (OTP)",
      html: `
        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
          <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:8px; overflow:hidden;">
            <div style="background:#0f4c5c; color:#ffffff; padding:14px; text-align:center; font-weight:bold;">
              Callmax Recruitment Portal
            </div>

            <div style="padding:25px; text-align:center; color:#333;">
              <p style="text-align:left;">Hi ${firstName},</p>

              <p>Use the code below to complete your sign-in:</p>

              <div style="font-size:32px; letter-spacing:6px; font-weight:bold; margin:20px 0; color:#000;">
                ${otp}
              </div>

              <p style="font-size:14px; color:#555;">
                This code will expire in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
              </p>

              <p style="font-size:13px; color:#777; margin-top:15px;">
                If you did not request this code and suspect unauthorized use, report this to:
              </p>

              <p style="font-size:13px; margin-top:5px;">
                <a href="mailto:dream-devops@callmaxsolutions.com" style="color:#0f4c5c; text-decoration:none;">
                  dream-devops@callmaxsolutions.com
                </a>
              </p>
            </div>

            <div style="padding:18px; background:#fafafa; font-size:12px; color:#555; text-align:center;">
              <p style="margin-bottom:8px;">
                Unauthorized use of this system is subject to applicable cybersecurity laws.
              </p>

              <hr style="border:none; border-top:1px solid #ddd; margin:12px 0;" />

              <p style="margin:4px 0;">
                <strong>Powered by Callmax DREAM-DevOps</strong>
              </p>
              <p style="margin:4px 0;">
                Callmax Solutions International Inc
              </p>
              <p style="margin:4px 0;">
                <a href="https://www.callmaxsolutions.com" target="_blank" style="color:#0f4c5c;">
                  www.callmaxsolutions.com
                </a>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    await writeAuditLog({
      email: emailAddress,
      eventType: "SEND_OTP",
      status: "SUCCESS",
      ipAddress: ip,
      userAgent: ua,
    });

    return res.status(200).json({
      success: true,
      challengeId,
      expiresAt: expires,
    });
  } catch (err) {
    console.error("❌ send-otp error:", err);

    await writeAuditLog({
      email: emailAddress,
      eventType: "SEND_OTP",
      status: "ERROR",
      ipAddress: ip,
      userAgent: ua,
      details: err.message,
    });

    return res.status(200).json({
      success: true,
      challengeId: dummyChallengeId,
      expiresAt: dummyExpires,
    });
  }
});

// ===============================
// VERIFY OTP LOGIN
// ===============================
router.post("/verify-otp-login", async (req, res) => {
  const { challengeId, otp } = req.body;
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  if (!challengeId || !otp) {
    return res.status(400).json({
      success: false,
      message: AUTH_GENERIC_MESSAGE,
    });
  }

  try {
    const [rows] = await db.execute(
      `
      SELECT *
      FROM 0003_cmx_auth_handler_recruitment_ph.auth_otp_challenges_recruitment_ph
      WHERE challenge_id = ?
      LIMIT 1
      `,
      [challengeId],
    );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: AUTH_GENERIC_MESSAGE,
      });
    }

    const challenge = rows[0];

    if (challenge.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: AUTH_GENERIC_MESSAGE,
      });
    }

    if (new Date() > new Date(challenge.expires_at)) {
      await db.execute(
        `
        UPDATE 0003_cmx_auth_handler_recruitment_ph.auth_otp_challenges_recruitment_ph
        SET status = 'expired'
        WHERE challenge_id = ?
        `,
        [challengeId],
      );

      await writeAuditLog({
        email: challenge.email,
        eventType: "VERIFY_OTP",
        status: "EXPIRED",
        ipAddress: ip,
        userAgent: ua,
        details: "OTP expired",
      });

      return res.status(400).json({
        success: false,
        message: AUTH_GENERIC_MESSAGE,
      });
    }

    if (challenge.attempt_count >= challenge.max_attempts) {
      await writeAuditLog({
        email: challenge.email,
        eventType: "VERIFY_OTP",
        status: "LOCKED",
        ipAddress: ip,
        userAgent: ua,
        details: "Maximum attempts reached",
      });

      return res.status(429).json({
        success: false,
        message: AUTH_GENERIC_MESSAGE,
      });
    }

    const match = await bcrypt.compare(String(otp).trim(), challenge.otp_hash);

    if (!match) {
      const newCount = Number(challenge.attempt_count || 0) + 1;
      const newStatus =
        newCount >= Number(challenge.max_attempts) ? "locked" : "pending";

      await db.execute(
        `
        UPDATE 0003_cmx_auth_handler_recruitment_ph.auth_otp_challenges_recruitment_ph
        SET attempt_count = ?, status = ?
        WHERE challenge_id = ?
        `,
        [newCount, newStatus, challengeId],
      );

      await writeAuditLog({
        email: challenge.email,
        eventType: "VERIFY_OTP",
        status: "FAILED",
        ipAddress: ip,
        userAgent: ua,
        details: `Invalid OTP attempt ${newCount}`,
      });

      return res.status(newStatus === "locked" ? 429 : 401).json({
        success: false,
        message: AUTH_GENERIC_MESSAGE,
      });
    }

    await db.execute(
      `
      UPDATE 0003_cmx_auth_handler_recruitment_ph.auth_otp_challenges_recruitment_ph
      SET status = 'verified',
          verified_ip = ?,
          verified_user_agent = ?,
          verified_at = NOW()
      WHERE challenge_id = ?
      `,
      [ip, ua, challengeId],
    );

    const user = await findActiveUserByEmail(challenge.email);

    if (!user) {
      await writeAuditLog({
        email: challenge.email,
        eventType: "VERIFY_OTP",
        status: "DENIED",
        ipAddress: ip,
        userAgent: ua,
        details: "User not found or inactive during verification",
      });

      return res.status(403).json({
        success: false,
        message: AUTH_GENERIC_MESSAGE,
      });
    }

    const sessionUser = buildUser(user);
    const fingerprint = generateFingerprint(req);

    const [devices] = await db.execute(
      `
      SELECT id, ip_address
      FROM 0003_cmx_auth_handler_recruitment_ph.auth_user_devices
      WHERE user_email = ? AND fingerprint = ?
      LIMIT 1
      `,
      [challenge.email, fingerprint],
    );

    if (!devices.length) {
      await db.execute(
        `
        INSERT INTO 0003_cmx_auth_handler_recruitment_ph.auth_user_devices
          (user_email, fingerprint, ip_address, user_agent, is_trusted)
        VALUES (?, ?, ?, ?, ?)
        `,
        [challenge.email, fingerprint, ip, ua, false],
      );

      await writeAuditLog({
        email: challenge.email,
        eventType: "NEW_DEVICE",
        status: "WARNING",
        ipAddress: ip,
        userAgent: ua,
        details: "New device detected",
      });

      try {
        await sendNewDeviceAlert({
          toEmail: challenge.email,
          name: user.user_first_name,
          ip,
          userAgent: ua,
        });
      } catch (emailErr) {
        console.error("❌ New device alert email failed:", emailErr);
      }
    } else {
      await db.execute(
        `
        UPDATE 0003_cmx_auth_handler_recruitment_ph.auth_user_devices
        SET last_used = NOW(),
            ip_address = ?,
            user_agent = ?
        WHERE id = ?
        `,
        [ip, ua, devices[0].id],
      );
    }

    return req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);

        return res.status(500).json({
          success: false,
          message: AUTH_GENERIC_MESSAGE,
        });
      }

      req.session.user = sessionUser;
      req.session.authenticated = true;

      req.session.save(async (saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);

          await writeAuditLog({
            email: challenge.email,
            eventType: "VERIFY_OTP",
            status: "ERROR",
            ipAddress: ip,
            userAgent: ua,
            details: "Session save failed",
          });

          return res.status(500).json({
            success: false,
            message: AUTH_GENERIC_MESSAGE,
          });
        }

        await writeAuditLog({
          email: challenge.email,
          eventType: "VERIFY_OTP",
          status: "SUCCESS",
          ipAddress: ip,
          userAgent: ua,
          details: "OTP verified and session created",
        });

        return res.status(200).json({
          success: true,
          user: sessionUser,
        });
      });
    });
  } catch (err) {
    console.error("❌ verify-otp-login error:", err);

    await writeAuditLog({
      email: null,
      eventType: "VERIFY_OTP",
      status: "ERROR",
      ipAddress: ip,
      userAgent: ua,
      details: err.message,
    });

    return res.status(500).json({
      success: false,
      message: AUTH_GENERIC_MESSAGE,
    });
  }
});

// ===============================
// SESSION
// ===============================
router.get("/session", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "No active session",
    });
  }

  return res.status(200).json({
    success: true,
    user: req.session.user,
  });
});

// ===============================
// LOGOUT
// ===============================
router.post("/logout", (req, res) => {
  const email = req.session?.user?.userEmail || null;
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  if (!req.session) {
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }

  req.session.destroy(async (err) => {
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);

    if (err) {
      console.error("❌ Logout failed:", err);

      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }

    await writeAuditLog({
      email,
      eventType: "LOGOUT",
      status: "SUCCESS",
      ipAddress: ip,
      userAgent: ua,
      details: "User logged out",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  });
});

// ===============================
// USER ACCESS
// ===============================
// Protected route.
// Users can query themselves.
// Admin / Super Admin can query other users.
router.get("/user-access", requireAuth, async (req, res) => {
  const requestedEmail = normalizeEmail(req.query.userid);
  const sessionEmail = normalizeEmail(req.session?.user?.userEmail);
  const sessionUser = req.session?.user;

  if (!requestedEmail) {
    return res.status(400).json({
      success: false,
      error: "Missing email parameter.",
    });
  }

  if (!isAdminUser(sessionUser) && requestedEmail !== sessionEmail) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
        user_email AS EMAIL,
        user_first_name,
        user_last_name,
        user_full_name AS NAME,
        user_access_level AS USER_ROLE,
        user_status AS STATUS
      FROM 0000_cmx_appdata_appusers.db_cmx_appusers_recruitment_ph
      WHERE user_email = ?
      LIMIT 1
      `,
      [requestedEmail],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: rows[0],
    });
  } catch (error) {
    console.error("❌ Error fetching user access:", error);

    return res.status(500).json({
      success: false,
      error: "Database error",
    });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.session.user,
  });
});

module.exports = router;
