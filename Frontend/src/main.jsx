import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter } from "react-router-dom";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

const REDIRECT_URI = "http://localhost:5173/auth";

const msalConfig = {
  auth: {
    clientId: "2f33b445-b2d8-42fd-a207-cb167a23bc98",
    authority: "https://login.microsoftonline.com/7dae6b7e-a024-4264-bf0b-f8cc2bc79204",
    redirectUri: REDIRECT_URI,
    navigateToLoginRequestUrl: false, // Important for SPA
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  },
  system: {
    allowNativeBroker: false, // Disable native broker
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

function Root() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Clear any old cached config
    console.log("🧹 Clearing old MSAL cache...");
    Object.keys(localStorage).forEach(key => {
      if (key.includes('msal') && !key.includes('sidebar')) {
        localStorage.removeItem(key);
      }
    });

    msalInstance.initialize().then(() => {
      console.log("🔥 MSAL fully initialized");
      console.log("✅ Redirect URI:", REDIRECT_URI);
      setReady(true);
    }).catch((error) => {
      console.error("❌ MSAL initialization failed:", error);
    });
  }, []);

  if (!ready) return <div>Loading authentication…</div>;

  return (
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")).render(<Root />);