import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter } from "react-router-dom";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

const msalConfig = {
  auth: {
    clientId: "2f33b445-b2d8-42fd-a207-cb167a23bc98",
    authority: "https://login.microsoftonline.com/7dae6b7e-a024-4264-bf0b-f8cc2bc79204",
    redirectUri: "http://localhost:5173/auth",
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

async function prepareMsal() {
  await msalInstance.initialize();

  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>
  );
}

prepareMsal();
