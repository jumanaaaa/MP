const axios = require("axios");
const { getPool } = require("../db/pool");
const { sql } = require("../db");

const tokenCache = new Map();

async function getValidManicTimeToken(subscription) {
  if (!subscription || !subscription.Id) {
    console.error("❌ Invalid subscription");
    return null;
  }

  const cacheKey = `sub_${subscription.Id}`;
  const now = Date.now();

  // Check cache
  if (tokenCache.has(cacheKey)) {
    const cached = tokenCache.get(cacheKey);
    if (cached.expiresAt > now + 60000) {
      console.log(`🔐 Using cached token: ${subscription.SubscriptionName}`);
      return cached.token;
    }
  }

  console.log(`🔄 Getting token for: ${subscription.SubscriptionName}`);

  try {
    const pool = await getPool();

    // Get stored tokens
    const result = await pool.request()
      .input('subId', sql.Int, subscription.Id)
      .query(`
        SELECT access_token, refresh_token, expires_at
        FROM manic_auth
        WHERE SubscriptionId = @subId
      `);

    if (result.recordset.length === 0) {
      console.error(`❌ No tokens found for ${subscription.SubscriptionName}`);
      console.error(`   Run: node scripts/manictime-login.js`);
      return null;
    }

    const { access_token, refresh_token, expires_at } = result.recordset[0];

    // Check if access token still valid
    if (access_token && expires_at && new Date(expires_at) > new Date(now + 60000)) {
      console.log(`✅ Using stored token (expires: ${new Date(expires_at).toLocaleString()})`);
      
      tokenCache.set(cacheKey, {
        token: access_token,
        expiresAt: new Date(expires_at).getTime()
      });

      return access_token;
    }

    // Refresh token
    if (!refresh_token) {
      console.error(`❌ No refresh token for ${subscription.SubscriptionName}`);
      console.error(`   Run: node scripts/manictime-login.js`);
      return null;
    }

    console.log(`🔄 Refreshing token...`);

    const response = await axios.post(
      'https://login.manictime.com/connect/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: subscription.ClientId,
        client_secret: subscription.ClientSecret
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token: newAccess, refresh_token: newRefresh, expires_in } = response.data;

    if (!newAccess) {
      console.error(`❌ No access_token in refresh response`);
      return null;
    }

    const newExpires = new Date(now + expires_in * 1000);

    console.log(`✅ New token received (expires in ${expires_in}s)`);

    // Update database
    await pool.request()
      .input('subId', sql.Int, subscription.Id)
      .input('access', sql.NVarChar, newAccess)
      .input('refresh', sql.NVarChar, newRefresh || refresh_token)
      .input('expires', sql.DateTime, newExpires)
      .query(`
        UPDATE manic_auth
        SET access_token = @access,
            refresh_token = @refresh,
            expires_at = @expires
        WHERE SubscriptionId = @subId
      `);

    // Cache it
    tokenCache.set(cacheKey, {
      token: newAccess,
      expiresAt: newExpires.getTime()
    });

    return newAccess;

  } catch (err) {
    console.error(`❌ Token error for ${subscription.SubscriptionName}:`);
    console.error(`Message:`, err.message);
    console.error(`Response:`, err.response?.data);
    
    if (err.response?.data?.error === 'invalid_grant') {
      console.error(`\n⚠️  Refresh token expired!`);
      console.error(`   Run: node scripts/manictime-login.js\n`);
    }
    
    return null;
  }
}

module.exports = { getValidManicTimeToken };