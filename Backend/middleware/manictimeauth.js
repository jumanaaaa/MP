const axios = require("axios");
const sql = require("mssql");
const dotenv = require("dotenv");
dotenv.config();

const TOKEN_URL = "https://login.manictime.com/connect/token";

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: { encrypt: true, trustServerCertificate: false },
};

async function getValidManicTimeToken() {
  const pool = await sql.connect(dbConfig);
  const { recordset } = await pool.request()
    .query("SELECT TOP 1 * FROM [dbo].[manic_auth] ORDER BY [Id] DESC");
  if (recordset.length === 0) throw new Error("No token found.");

  const tokenData = recordset[0];
  const now = new Date();

  if (now < new Date(tokenData.expires_at)) {
    await pool.close();
    return tokenData.access_token;
  }

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.MANICTIME_CLIENT_ID,
      client_secret: process.env.MANICTIME_CLIENT_SECRET,
      refresh_token: tokenData.refresh_token,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token, refresh_token, expires_in } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  await pool.request().query(`
    UPDATE [dbo].[manic_auth]
    SET [access_token] = '${access_token}',
        [refresh_token] = '${refresh_token}',
        [expires_at] = '${expiresAt}'
    WHERE [Id] = ${tokenData.Id};
  `);
  await pool.close();
  return access_token;
}

module.exports = { getValidManicTimeToken };
