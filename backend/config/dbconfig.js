const mysql = require("mysql2/promise");
require("dotenv").config();

/*
========================================
REQUIRED ENV VALIDATION
========================================
*/
const requiredEnv = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD"];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(
    `❌ Missing required database environment variables: ${missingEnv.join(", ")}`,
  );

  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

/*
========================================
MYSQL POOL CONFIG
========================================
*/
const poolConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,

  // Keep database optional because your app queries multiple schemas directly.
  // Example:
  // 1001_cmx_appdata_recruitment_database_ph.db_cmxph_applicant_database
  database: process.env.MYSQL_DATABASE || undefined,

  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
  queueLimit: Number(process.env.MYSQL_QUEUE_LIMIT) || 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  charset: "utf8mb4",
};

/*
========================================
OPTIONAL MYSQL SSL
========================================
Enable only if your MySQL server requires/supports SSL.

.env:
MYSQL_SSL=true
========================================
*/
if (String(process.env.MYSQL_SSL || "").toLowerCase() === "true") {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  };
}

const pool = mysql.createPool(poolConfig);

/*
========================================
TEST CONNECTION
========================================
*/
async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.ping();

    console.log("✅ MySQL connected");
  } catch (err) {
    console.error("❌ Error connecting to MySQL:", err.message);

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

testConnection();

/*
========================================
GRACEFUL SHUTDOWN
========================================
*/
async function closePool(signal) {
  try {
    console.log(`🛑 ${signal} received. Closing MySQL pool...`);
    await pool.end();
    console.log("✅ MySQL pool closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error closing MySQL pool:", err.message);
    process.exit(1);
  }
}

process.once("SIGINT", () => closePool("SIGINT"));
process.once("SIGTERM", () => closePool("SIGTERM"));

module.exports = pool;