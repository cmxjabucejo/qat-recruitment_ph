// ============================
// 📦 Module Imports
// ============================
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// 🔴 REDIS
const { createClient } = require("redis");
const { RedisStore: SessionStore } = require("connect-redis");
const { RedisStore: RateLimitRedisStore } = require("rate-limit-redis");

const { doubleCsrf } = require("csrf-csrf");
const cookieParser = require("cookie-parser");

// 🔐 SECURITY
const helmet = require("helmet");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const session = require("express-session");

// 🔐 AUTH MIDDLEWARE
const { requireAuth } = require("./middleware/authMiddleware");

dotenv.config();

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  // required in csrf-csrf v4
  getSessionIdentifier: (req) => req.sessionID,
  cookieName: "__Host-csrf-token",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

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

/*
========================================
⚙️ APP CONFIG
========================================
*/
const app = express();

const PORT = Number(process.env.SERVER_PORT) || 5000;
const ENV = process.env.NODE_ENV || "development";
const IS_PROD = ENV === "production";

const LOCAL_FRONTEND_URL =
  process.env.LOCAL_FRONTEND_URL || "http://localhost:3000";

const PROD_FRONTEND_URL = process.env.PROD_FRONTEND_URL || "";

const FRONTEND_URL = IS_PROD
  ? PROD_FRONTEND_URL || LOCAL_FRONTEND_URL
  : LOCAL_FRONTEND_URL;

const allowedOrigins = [
  LOCAL_FRONTEND_URL,
  PROD_FRONTEND_URL,
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

console.log("🌎 SERVER PORT:", PORT);

/*
========================================
🔐 GLOBAL SECURITY MIDDLEWARE
========================================
*/
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "connect-src": ["'self'", ...allowedOrigins],
      },
    },
    hsts: IS_PROD
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    referrerPolicy: {
      policy: "no-referrer",
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  next();
});

/*
========================================
🌐 CORS
========================================
*/
const corsOptions = {
  origin(origin, callback) {
    // Allow Thunder Client, Postman, curl, health checks, and same-origin requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`🚫 CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Device-Id",
    "X-CSRF-Token",
  ],
};

app.use(cors(corsOptions));

// Avoid app.options("*") because Express 5 / path-to-regexp can throw:
// Missing parameter name at index 1: *
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return cors(corsOptions)(req, res, () => res.sendStatus(204));
  }

  return next();
});

/*
========================================
📦 BODY PARSERS
========================================
*/
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());

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
  database: Number(process.env.REDIS_DB) || 15,
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

/*
========================================
🚀 START SERVER
========================================
*/
async function startServer() {
  try {
    /*
    ========================================
    🔴 CONNECT REDIS
    ========================================
    */
    await redisClient.connect();
    console.log("✅ Redis connected");

    /*
    ========================================
    🧠 SESSION
    ========================================
    */
    const redisStore = new SessionStore({
      client: redisClient,
      prefix: process.env.REDIS_SESSION_PREFIX || "cmx_recruitment:",
    });

    app.use(
      session({
        name: process.env.SESSION_NAME || "cmx_recruitment_sid",
        store: redisStore,
        secret:
          process.env.SESSION_SECRET || "dev-only-change-this-session-secret",
        resave: false,
        saveUninitialized: false,

        // Keep true if you want activity to refresh server-side session TTL.
        // The browser cookie will still be session-only because maxAge is removed.
        rolling: true,

        cookie: {
          httpOnly: true,
          secure: IS_PROD,
          sameSite: "strict",
        },
      }),
    );

    app.get("/api/csrf-token", (req, res) => {
      const csrfToken = generateCsrfToken(req, res);
      res.json({ csrfToken });
    });

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
      windowMs: 10 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: "Too many OTP attempts. Please try again in a few minutes.",
      },
      keyGenerator: (req) => {
        const email =
          req.body?.emailAddress ||
          req.body?.email ||
          req.body?.user_email ||
          "noemail";

        return `${String(email).toLowerCase()}_${ipKeyGenerator(req.ip)}`;
      },
    });

    const otpVerifyLimiter = rateLimit({
      store: new RateLimitRedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: "otp_verify:",
      }),
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 10, // 10 OTP verification attempts per 10 minutes
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Invalid credentials or authentication request",
      },
      keyGenerator: (req) => {
        const challengeId = req.body?.challengeId || "nochallenge";
        return `${String(challengeId)}_${ipKeyGenerator(req.ip)}`;
      },
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
      message: {
        success: false,
        error: "Too many requests. Please try again in a few minutes.",
      },
      keyGenerator: (req) => {
        if (req.session?.user?.userid) {
          return `user:${req.session.user.userid}`;
        }

        if (req.session?.user?.userEmail) {
          return `user:${req.session.user.userEmail}`;
        }

        return `ip:${ipKeyGenerator(req.ip)}`;
      },
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
        if (req.session?.user?.userid) {
          return `user:${req.session.user.userid}`;
        }

        if (req.session?.user?.userEmail) {
          return `user:${req.session.user.userEmail}`;
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

    /*
    ========================================
    ❤️ HEALTH CHECKS
    ========================================
    */
    app.get("/", (req, res) => {
      return res.status(200).send("CMX Recruitment API running 🚀");
    });

    app.get("/api/health", (req, res) => {
      return res.status(200).json({
        success: true,
        message: "API healthy",
        env: ENV,
        port: PORT,
        frontend: FRONTEND_URL,
      });
    });

    /*
    ========================================
    🔐 RATE LIMITERS
    ========================================
    */
    app.use("/api/auth/send-otp", otpLimiter);
    app.use("/api/auth/verify-otp-login", otpVerifyLimiter);

    app.use("/api", (req, res, next) => {
      const contentType = req.headers["content-type"] || "";

      if (contentType.startsWith("multipart/form-data")) {
        return uploadLimiter(req, res, next);
      }

      return generalLimiter(req, res, next);
    });

    /*
    ========================================
    🔗 API ROUTES
    ========================================

    Notes:
    - /api/auth remains public because login and OTP must be reachable.
    - /api/jobposts is protected again at server level as defense-in-depth.
    - /api/accounts, /api/assessments, and /api/mediafiles are internal data routes.
    - /api/applicants and /api/emails are left mounted normally for now because
      we will harden their individual route files next without breaking public
      applicant submission flow.
    */
    app.use("/api/auth", authAPI);

    app.use(doubleCsrfProtection);
    app.use("/api/jobposts", requireAuth, jobpostingAPI);
    app.use("/api/accounts", requireAuth, clientRosterAPI);
    app.use("/api/assessments", requireAuth, assessmentAPI);
    app.use("/api/mediafiles", requireAuth, uploadLimiter, filesAPI);

    app.use("/api/applicants", applicantAPI);
    app.use("/api/emails", emailAPI);

    /*
    ========================================
    ❌ 404 HANDLER
    ========================================
    */
    app.use((req, res) => {
      return res.status(404).json({
        success: false,
        error: "Route not found",
        path: req.originalUrl,
      });
    });

    /*
    ========================================
    🔻 GLOBAL ERROR HANDLER
    ========================================
    */
    app.use((err, req, res, next) => {
      console.error("❌ Global Error:", err);

      if (err.message && err.message.includes("CORS blocked")) {
        return res.status(403).json({
          success: false,
          error: err.message,
        });
      }

      if (err.message === "Unsupported file type") {
        return res.status(400).json({
          success: false,
          error: "Unsupported file type",
        });
      }

      if (err.message === "Invalid file type") {
        return res.status(400).json({
          success: false,
          error: "Invalid file type",
        });
      }

      if (err.name === "MulterError") {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: "Something went wrong",
        details: IS_PROD ? undefined : err.message,
      });
    });

    /*
    ========================================
    🚀 START
    ========================================
    */
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Local API: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
