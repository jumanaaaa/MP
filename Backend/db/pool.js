// /db/pool.js
const sql = require("mssql");
const dotenv = require("dotenv");
dotenv.config();

const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    trustServerCertificate: true // ✅   for local dev
  },
  pool: {
    max: 10,
    min: 2, // ✅ Keep minimum 2 connections alive
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

let globalPool = null;
let isConnecting = false;

async function getPool() {
  // ✅ If already connecting, wait for that connection
  if (isConnecting) {
    console.log("⏳ Connection in progress, waiting...");
    await new Promise(resolve => setTimeout(resolve, 100));
    return getPool(); // Retry
  }

  // ✅ If pool exists and is connected, return it
  if (globalPool && globalPool.connected) {
    return globalPool;
  }

  // ✅ Create new connection
  isConnecting = true;
  try {
    if (globalPool) {
      console.log("⚠️ Closing old pool...");
      await globalPool.close().catch(() => {});
      globalPool = null;
    }

    console.log("🔌 Creating new database pool...");
    globalPool = await sql.connect(config);
    
    globalPool.on('error', (err) => {
      console.error("❌ Pool error:", err.message);
      globalPool = null;
    });

    console.log("✅ Database pool ready");
    return globalPool;
    
  } catch (err) {
    console.error("❌ Pool connection failed:", err.message);
    globalPool = null;
    throw err;
  } finally {
    isConnecting = false;
  }
}

// ✅ Graceful shutdown
process.on('SIGINT', async () => {
  if (globalPool) {
    await globalPool.close();
    console.log("Database pool closed");
  }
  process.exit(0);
});

module.exports = { getPool, sql, config };