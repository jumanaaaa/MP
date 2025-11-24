const axios = require("axios");
const msal = require("@azure/msal-node");

// MSAL CLIENT (REQUIRED!)
const msalConfig = {
  auth: {
    clientId: process.env.MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
    clientSecret: process.env.MS_CLIENT_SECRET
  }
};

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

exports.getCalendarEvents = async (req, res) => {
  try {
    const userAccessToken = req.headers.authorization?.split(" ")[1];

    if (!userAccessToken) {
      return res.status(401).json({ error: "Missing user access token" });
    }

    // 1️⃣ Exchange frontend user token → Graph token
    const oboRequest = {
      oboAssertion: userAccessToken,
      scopes: ["Calendars.Read"]
    };

    const tokenResponse = await msalClient.acquireTokenOnBehalfOf(oboRequest);

    const graphToken = tokenResponse.accessToken;

    // 2️⃣ Set calendar range (today → +30 days)
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 3️⃣ Call Microsoft Graph as the *user*
    const result = await axios.get(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${end}&$orderby=start/dateTime`,
      {
        headers: { Authorization: `Bearer ${graphToken}` }
      }
    );

    return res.json({
      events: result.data.value || []
    });

  } catch (err) {
    console.error("OBO Calendar Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to fetch calendar" });
  }
};
