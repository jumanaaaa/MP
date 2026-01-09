const axios = require("axios");

const tokenCache = new Map();

async function getValidManicTimeToken(subscription) {
  if (!subscription || !subscription.Id) {
    console.error("❌ Invalid subscription object");
    return null;
  }

  const cacheKey = `${subscription.BaseUrl}|${subscription.WorkspaceId}|${subscription.Id}`;
  const now = Date.now();

  // Check memory cache
  if (tokenCache.has(cacheKey)) {
    const cached = tokenCache.get(cacheKey);
    if (cached.expiresAt > now + 60000) {
      console.log(`🔐 Using cached token: ${subscription.SubscriptionName}`);
      return cached.token;
    }
  }

  console.log(`🔄 Fetching new token: ${subscription.SubscriptionName}`);

  try {
    // ✅ CORRECT ENDPOINT: login.manictime.com (not cloud.manictime.com)
    const tokenUrl = 'https://login.manictime.com/connect/token';
    
    console.log(`🔗 Token URL: ${tokenUrl}`);

    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: subscription.ClientId,
        client_secret: subscription.ClientSecret,
        scope: "manictimeapi" // ✅ Correct scope
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    console.log(`✅ Token response status:`, response.status);

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      console.error(`❌ No access_token in response`);
      console.error(`Response data:`, response.data);
      return null;
    }

    const expiresAt = now + (expires_in || 3600) * 1000;

    tokenCache.set(cacheKey, {
      token: access_token,
      expiresAt
    });

    console.log(`✅ Token cached: ${subscription.SubscriptionName} (expires in ${expires_in}s)`);
    return access_token;

  } catch (err) {
    console.error(`❌ Token fetch error for ${subscription.SubscriptionName}:`);
    console.error(`Error message:`, err.message);
    console.error(`Error response:`, err.response?.data);
    console.error(`Error status:`, err.response?.status);
    return null;
  }
}

module.exports = { getValidManicTimeToken };