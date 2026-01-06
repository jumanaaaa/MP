const axios = require("axios");

const tokenCache = new Map(); // { subscriptionId: { token, expiresAt } }

/**
 * Get valid token for a specific subscription
 */
async function getValidManicTimeToken(subscription) {
  if (!subscription || !subscription.Id) {
    throw new Error("Invalid subscription object passed to getValidManicTimeToken");
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

    const { access_token, expires_in } = response.data;
    const expiresAt = now + expires_in * 1000;

    tokenCache.set(cacheKey, {
      token: access_token,
      expiresAt,
    });

    console.log(`✅ Token cached: ${subscription.SubscriptionName}`);
    return access_token;

  } catch (err) {
    console.error(`❌ Token error for ${subscription.SubscriptionName}:`, err.message);
    throw new Error("Failed to get ManicTime token");
  }
}

module.exports = { getValidManicTimeToken };