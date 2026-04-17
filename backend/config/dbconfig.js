const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  // database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
});

async function testConnection() {
  try {
    const connection = await pool.getConnection(); // Get a connection from the pool
    if (!connection) {
      console.error("❌ Database connection failed.");
      return res.status(500).json({ message: "Database connection failed." });
    }
    console.log("MySQL Connected...");
    connection.release(); // Release the connection back to the pool
  } catch (err) {
    console.error("Error connecting to MySQL:", err);
  }
}

// Test the connection right after setting up the pool
testConnection();

module.exports = pool;
