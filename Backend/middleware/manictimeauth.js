const axios = require("axios");

const tokenCache = new Map(); // { subscriptionId: { token, expiresAt } }

/**
 * Get valid token for a specific subscription
 */
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
    if (cached.expiresAt > now + 60000) { // 1 min buffer
      console.log(`🔐 Using cached token: ${subscription.SubscriptionName}`);
      return cached.token;
    }
  }

  // Fetch new token
  console.log(`🔄 Fetching new token: ${subscription.SubscriptionName}`);

  try {
    const response = await axios.post(
      `${subscription.BaseUrl}/oauth2/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: subscription.ClientId,
        client_secret: subscription.ClientSecret,
        scope: "openid manictime.timelines",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log(`🔍 Token response status:`, response.status);
    console.log(`🔍 Token response data:`, JSON.stringify(response.data, null, 2));

    const { access_token, expires_in } = response.data;

    // Validate token response
    if (!access_token) {
      console.error(`❌ No access_token in response for ${subscription.SubscriptionName}`);
      console.error(`Response data:`, response.data);
      return null;
    }

    const expiresAt = now + (expires_in || 3600) * 1000; // Default 1 hour if expires_in missing

    tokenCache.set(cacheKey, {
      token: access_token,
      expiresAt,
    });

    console.log(`✅ Token cached: ${subscription.SubscriptionName} (expires in ${expires_in}s)`);
    return access_token;

  } catch (err) {
    console.error(`❌ Token fetch error for ${subscription.SubscriptionName}:`);
    console.error(`Error message:`, err.message);
    console.error(`Error response:`, err.response?.data);
    console.error(`Error status:`, err.response?.status);
    return null; // ✅ Return null instead of throwing
  }
}

module.exports = { getValidManicTimeToken };