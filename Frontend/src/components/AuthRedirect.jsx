import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";

export default function AuthRedirect() {
  const { instance, accounts } = useMsal();

  useEffect(() => {
    const runAuthFlow = async () => {
      try {
        // 1️⃣ Handle redirect response from Microsoft
        const response = await instance.handleRedirectPromise();

        if (response && response.account) {
          // Set logged-in user
          instance.setActiveAccount(response.account);
        }

        const activeAccount = instance.getActiveAccount() || accounts[0];

        if (!activeAccount) {
          console.log("❌ No active Microsoft account — redirecting to login");
          window.location.href = "/";
          return;
        }

        // 2️⃣ Acquire MS access token silently
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: ["User.Read"],
          account: activeAccount
        });

        const accessToken = tokenResponse.accessToken;

        // 3️⃣ Send Microsoft token to backend for JWT session creation
        const backendResponse = await fetch(
          "http://localhost:3000/login/microsoft",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (backendResponse.ok) {
          console.log("✅ Backend accepted Microsoft login");
          window.location.href = "/admindashboard";
        } else {
          console.error("❌ Backend login failed");
          window.location.href = "/";
        }
      } catch (err) {
        console.error("❌ MSAL Error:", err);
        window.location.href = "/";
      }
    };

    runAuthFlow();
  }, [instance, accounts]);

  return (
    <div style={{ textAlign: "center", paddingTop: "60px" }}>
      <h2>Signing you in…</h2>
    </div>
  );
}
