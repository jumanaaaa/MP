require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { getPool } = require('../db/pool');
const { sql } = require('../db');

const app = express();
const PORT = 4000;

// Generate PKCE
function generateCodeChallenge() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

const state = crypto.randomBytes(16).toString('hex');
const nonce = crypto.randomBytes(16).toString('hex');
const { verifier, challenge } = generateCodeChallenge();

const REDIRECT_URI = 'http://localhost:4000/callback';
const SUBSCRIPTION_ID = 1; // Main Workspace

let CLIENT_ID, CLIENT_SECRET;

// Fetch credentials from database
(async () => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('subId', sql.Int, SUBSCRIPTION_ID)
      .query(`
        SELECT ClientId, ClientSecret, SubscriptionName
        FROM ManicTimeSubscriptions
        WHERE Id = @subId
      `);

    if (result.recordset.length === 0) {
      console.error('❌ Subscription not found in database!');
      console.error(`   Make sure subscription ID ${SUBSCRIPTION_ID} exists.`);
      process.exit(1);
    }

    const sub = result.recordset[0];
    CLIENT_ID = sub.ClientId;
    CLIENT_SECRET = sub.ClientSecret;

    console.log('\n🔐 ManicTime OAuth Setup');
    console.log(`📋 Subscription: ${sub.SubscriptionName}`);
    console.log(`🔑 Client ID: ${CLIENT_ID}\n`);
    console.log('📋 STEP 1: Open this URL in your browser:\n');

    const authUrl = `https://login.manictime.com/connect/authorize?` +
      `response_type=code&` +
      `nonce=${nonce}&` +
      `state=${state}&` +
      `code_challenge=${challenge}&` +
      `code_challenge_method=S256&` +
      `client_id=${CLIENT_ID}&` +
      `scope=openid+profile+manictimeapi+offline_access&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    console.log(authUrl);
    console.log('\n⏳ Waiting for you to complete login...\n');

  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
})();

app.get('/callback', async (req, res) => {
  const { code, state: returnedState } = req.query;

  if (returnedState !== state) {
    return res.send('❌ State mismatch - possible CSRF attack');
  }

  if (!code) {
    return res.send('❌ No authorization code received');
  }

  console.log('✅ Authorization code received');
  console.log('🔄 Exchanging for tokens...');

  try {
    const response = await axios.post(
      'https://login.manictime.com/connect/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    console.log('✅ Tokens received!');
    console.log(`   Access: ${access_token.substring(0, 20)}...`);
    console.log(`   Refresh: ${refresh_token.substring(0, 20)}...`);
    console.log(`   Expires: ${expiresAt.toLocaleString()}`);

    // Store in database
    const pool = await getPool();

    const check = await pool.request()
      .input('subId', sql.Int, SUBSCRIPTION_ID)
      .query('SELECT Id FROM manic_auth WHERE SubscriptionId = @subId');

    if (check.recordset.length > 0) {
      await pool.request()
        .input('subId', sql.Int, SUBSCRIPTION_ID)
        .input('access', sql.NVarChar, access_token)
        .input('refresh', sql.NVarChar, refresh_token)
        .input('expires', sql.DateTime, expiresAt)
        .query(`
          UPDATE manic_auth
          SET access_token = @access,
              refresh_token = @refresh,
              expires_at = @expires
          WHERE SubscriptionId = @subId
        `);
    } else {
      await pool.request()
        .input('subId', sql.Int, SUBSCRIPTION_ID)
        .input('access', sql.NVarChar, access_token)
        .input('refresh', sql.NVarChar, refresh_token)
        .input('expires', sql.DateTime, expiresAt)
        .query(`
          INSERT INTO manic_auth (SubscriptionId, access_token, refresh_token, expires_at)
          VALUES (@subId, @access, @refresh, @expires)
        `);
    }

    console.log('✅ Tokens stored in Azure database!');

    res.send(`
      <html>
        <body style="font-family: monospace; padding: 40px; background: #0f172a; color: #10b981;">
          <h1>✅ Success!</h1>
          <p><strong>Access Token:</strong> ${access_token.substring(0, 40)}...</p>
          <p><strong>Refresh Token:</strong> ${refresh_token.substring(0, 40)}...</p>
          <p><strong>Expires:</strong> ${expiresAt.toLocaleString()}</p>
          <br/>
          <p>✅ Tokens saved to Azure database!</p>
          <p>You can close this window and press Ctrl+C in terminal</p>
        </body>
      </html>
    `);

    setTimeout(() => process.exit(0), 2000);

  } catch (err) {
    console.error('❌ Token exchange failed:');
    console.error(err.response?.data || err.message);
    res.send(`❌ Error: ${JSON.stringify(err.response?.data || err.message)}`);
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Callback server running on http://localhost:${PORT}\n`);
});