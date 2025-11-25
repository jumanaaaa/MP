import { useEffect, useState, useRef } from "react";
import { useMsal } from "@azure/msal-react";

export default function AuthRedirect() {
  const { instance, accounts } = useMsal(); // ← instance has handleRedirectPromise built-in
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (hasProcessed.current) {
      console.log("⏭️ Already processed");
      return;
    }

    console.log("🔵 AuthRedirect mounted");
    console.log("📍 Current URL:", window.location.href);
    console.log("🔍 Has hash:", window.location.hash ? "YES" : "NO");
    console.log("🔍 Hash value:", window.location.hash);
    console.log("👥 Accounts:", accounts?.length || 0);

    const handleAuth = async () => {
      try {
        setStatus("processing");
        console.log("⏳ Calling handleRedirectPromise()...");
        
        // This is a built-in MSAL method - automatically handles #code= or ?code=
        const response = await instance.handleRedirectPromise();
        
        console.log("🟣 Response:", response ? "YES" : "NO");
        
        hasProcessed.current = true;

        // CASE 1: Got response from Microsoft
        if (response) {
          console.log("✅ Got response from Microsoft!");
          console.log("📧 Email:", response.account.username);
          console.log("🎫 Access token:", response.accessToken ? "YES" : "NO");
          
          await processLogin(response.account, response.accessToken);
          return;
        }

        // CASE 2: No response, but have cached account
        if (accounts && accounts.length > 0) {
          console.log("🔄 Using cached account");
          const activeAccount = accounts[0];
          instance.setActiveAccount(activeAccount);
          
          try {
            const tokenResponse = await instance.acquireTokenSilent({
              scopes: ["openid", "profile", "email", "User.Read"],
              account: activeAccount,
            });
            
            console.log("✅ Token acquired from cache");
            await processLogin(activeAccount, tokenResponse.accessToken);
            return;
            
          } catch (tokenError) {
            console.error("❌ Token acquisition error:", tokenError);
            console.log("🔄 Redirecting to Microsoft for fresh login...");
            await instance.loginRedirect({
              scopes: ["openid", "profile", "email", "User.Read"]
            });
            return;
          }
        }

        // CASE 3: No response and no accounts
        console.warn("⚠️ No response and no accounts - redirecting to login");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);

      } catch (error) {
        console.error("❌ Error in handleAuth:", error);
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    };

    handleAuth();
  }, [instance, accounts]);

  const processLogin = async (account, accessToken) => {
    try {
      setStatus("authenticating");
      console.log("📤 Sending to backend...");
      console.log("📧 User:", account.username);
      
      const backendRes = await fetch("http://localhost:3000/login/microsoft", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("📥 Backend response:", backendRes.status);

      if (!backendRes.ok) {
        const errorText = await backendRes.text();
        console.error("❌ Backend error:", errorText);
        alert(`Backend login failed: ${backendRes.status}`);
        window.location.href = "/";
        return;
      }

      const backendJson = await backendRes.json();
      console.log("✅ Backend login successful!");
      console.log("👤 User role:", backendJson.role);

      setStatus("verifying");
      console.log("⏳ Waiting 1.5s for cookie to be set...");
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log("🧪 Testing authentication...");
      const testRes = await fetch("http://localhost:3000/user/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      console.log("🧪 Auth test result:", testRes.status);

      if (testRes.ok) {
        const userData = await testRes.json();
        console.log("✅ Authentication verified!");
        console.log("👤 User data:", userData);
        
        setStatus("redirecting");
        console.log("🚀 Redirecting to dashboard...");
        
        window.location.replace("/admindashboard");
      } else {
        const errorText = await testRes.text();
        console.error("❌ Auth test failed!");
        console.error("Response:", errorText);
        alert("Cookie authentication failed. Please try again.");
        window.location.href = "/";
      }

    } catch (error) {
      console.error("❌ Error in processLogin:", error);
      alert(`Login processing error: ${error.message}`);
      window.location.href = "/";
    }
  };

  const getStatusEmoji = () => {
    switch (status) {
      case "checking": return "🔍";
      case "processing": return "⚙️";
      case "authenticating": return "🔐";
      case "verifying": return "🧪";
      case "redirecting": return "🚀";
      default: return "⏳";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "checking": return "Checking redirect...";
      case "processing": return "Processing Microsoft response...";
      case "authenticating": return "Authenticating with backend...";
      case "verifying": return "Verifying session...";
      case "redirecting": return "Redirecting to dashboard...";
      default: return "Please wait...";
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      fontFamily: 'system-ui'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '30px' }}>
          {getStatusEmoji()}
        </div>
        <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '15px' }}>
          Processing Microsoft Login
        </div>
        <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '30px' }}>
          {getStatusText()}
        </div>
        <div style={{
          marginTop: '40px',
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid #fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '30px' }}>
          Open browser console (F12) for detailed logs
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}