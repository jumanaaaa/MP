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

  // 🔥 TRY MULTIPLE ENDPOINTS
  const endpointsToTry = [
    `${subscription.BaseUrl}/oauth2/token`,
    `${subscription.BaseUrl}/${subscription.WorkspaceId}/oauth2/token`,
    `${subscription.BaseUrl}/api/oauth2/token`,
    `${subscription.BaseUrl}/${subscription.WorkspaceId}/api/oauth2/token`
  ];

  for (const tokenUrl of endpointsToTry) {
    console.log(`\n🔗 Trying: ${tokenUrl}`);

    try {
      const response = await axios.post(
        tokenUrl,
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

      console.log(`  ✅ Status: ${response.status}`);
      
      // Check if response is JSON (not HTML)
      if (response.data && typeof response.data === 'object' && response.data.access_token) {
        const { access_token, expires_in } = response.data;
        const expiresAt = now + (expires_in || 3600) * 1000;

        tokenCache.set(cacheKey, { token: access_token, expiresAt });

        console.log(`  ✅ SUCCESS! Token obtained from: ${tokenUrl}`);
        console.log(`  ✅ Token expires in: ${expires_in}s`);
        return access_token;
      } else {
        console.log(`  ⚠️ Response is not JSON token (might be HTML)`);
      }

    } catch (err) {
      console.log(`  ❌ Failed: ${err.message} (${err.response?.status || 'no status'})`);
    }
  }

  console.error(`\n❌ All OAuth endpoints failed for ${subscription.SubscriptionName}`);
  console.error(`Credentials used:`);
  console.error(`  - ClientId: ${subscription.ClientId?.substring(0, 10)}...`);
  console.error(`  - WorkspaceId: ${subscription.WorkspaceId}`);
  console.error(`  - BaseUrl: ${subscription.BaseUrl}`);
  
  return null;
}

module.exports = { getValidManicTimeToken };