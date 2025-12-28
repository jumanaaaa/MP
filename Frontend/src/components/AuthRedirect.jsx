import { useEffect, useState, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { CheckCircle, Fingerprint } from "lucide-react";
import { apiFetch } from '../utils/api';

export default function AuthRedirect() {
  const { instance, accounts } = useMsal();
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState("checking");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

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
        
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const response = await instance.handleRedirectPromise();

        if (response) {
          console.log("✅ Got response from Microsoft!");
          console.log("📧 Email:", response.account.username);
          console.log("🎫 Access token:", response.accessToken ? "YES" : "NO");
          
          await processLogin(response.account, response.accessToken);
          return;
        }

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
      
      const backendRes = await apiFetch("/login/microsoft", {
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
      let verified = false;

      for (let i = 0; i < 3; i++) {
        const testRes = await apiFetch("/user/profile", {
          credentials: "include",
        });

        if (testRes.ok) {
          verified = true;
          break;
        }

        await new Promise(r => setTimeout(r, 500));
      }

      if (!verified) {
        throw new Error("Cookie not ready");
      }

      console.log("🧪 Testing authentication...");
      const testRes = await apiFetch("/user/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      console.log("✅ Authentication verified!");
      setStatus("redirecting");
      window.location.replace("/admindashboard");

    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("⚠️ Fetch aborted due to redirect");
        return;
      }

      console.error("❌ Error in processLogin:", error);
      alert("Login failed. Please try again.");
    }
  };

  const getStatusIcon = () => {
    if (status === "redirecting") {
      return (
        <span style={{ lineHeight: 0, display: 'block' }}>
          <CheckCircle
            size={64}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="success-icon"
          />
        </span>
      );
    }

    return (
      <span style={{ lineHeight: 0, display: 'block' }}>
        <Fingerprint
          size={64}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="floating-icon"
        />
      </span>
    );
  };


  const getStatusText = () => {
    switch (status) {
      case "checking": return "Authenticating...";
      case "processing": return "Processing...";
      case "authenticating": return "Securing Session...";
      case "verifying": return "Verifying...";
      case "redirecting": return "Success!";
      default: return "Loading...";
    }
  };

  const getStatusSubtext = () => {
    switch (status) {
      case "redirecting": return "Redirecting to your dashboard";
      default: return "Please wait while we log you in";
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    },
    backgroundOrbs: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none'
    },
    orb: (top, left, size, delay) => ({
      position: 'absolute',
      top: top,
      left: left,
      width: size,
      height: size,
      borderRadius: '50%',
      background: isDarkMode
        ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)'
        : 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
      animation: `float ${6 + delay}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      filter: 'blur(40px)'
    }),
    container: {
      position: 'relative',
      zIndex: 10,
      textAlign: 'center',
      maxWidth: '600px',
      padding: '0 20px'
    },
    card: {
      paddingTop: '100px'
    },
    cardGlow: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
      pointerEvents: 'none'
    },
    iconContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '-40px', // overlaps card
      position: 'relative',
      zIndex: 20
    },
    iconWrapper: {
      width: '160px',
      height: '160px',
      borderRadius: '50%',
      background: isDarkMode
        ? 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.2) 100%)'
        : 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.15) 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#3b82f6',
      border: isDarkMode ? '3px solid rgba(59,130,246,0.3)' : '3px solid rgba(59,130,246,0.2)',
      position: 'relative',
      overflow: 'hidden',  // ✅ Change from 'visible' to 'hidden'
      animation: 'glow 2s ease-in-out infinite',
      isolation: 'isolate'
    },
    iconGlow: {
      position: 'absolute',
      inset: '-30px',
      borderRadius: '50%',
      background: isDarkMode
        ? 'radial-gradient(circle, rgba(59,130,246,0.45), transparent 70%)'
        : 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)',
      filter: 'blur(30px)',
      zIndex: 0,
      pointerEvents: 'none'
    },
    iconRing: {
      position: 'absolute',
      inset: '-8px',
      borderRadius: '50%',
      border: '2px solid rgba(59,130,246,0.2)',
      animation: 'pulse-ring 2s ease-in-out infinite'
    },
    title: {
      fontSize: '36px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      marginBottom: '16px',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    subtitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#3b82f6',
      marginBottom: '12px'
    },
    description: {
      fontSize: '15px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '50px',
      lineHeight: '1.6'
    },
    loadingDots: {
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '40px'
    },
    dot: (delay) => ({
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: '#3b82f6',
      animation: `bounce 1.4s ease-in-out ${delay}s infinite`,
      boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
    }),
    consoleNote: {
      fontSize: '12px',
      color: isDarkMode ? '#64748b' : '#94a3b8',
      fontStyle: 'italic'
    }
  };

  return (
    <div style={styles.page}>
      {/* Background Orbs */}
      <div style={styles.backgroundOrbs}>
        <div style={styles.orb('10%', '10%', '400px', 0)}></div>
        <div style={styles.orb('60%', '70%', '350px', 1)}></div>
        <div style={styles.orb('30%', '80%', '300px', 2)}></div>
      </div>

      {/* Main Container */}
      <div style={styles.container}>
        <div style={styles.iconContainer}>
          <div style={styles.iconWrapper} className="floating">
            <div style={styles.iconGlow}></div>
            <div style={styles.iconRing}></div>
            {getStatusIcon()}
          </div>
        </div>

        {/* CARD — CONTENT ONLY */}
        <div style={styles.card}>
          <div style={styles.cardGlow}></div>

          <div style={styles.title}>Processing Microsoft Login</div>
          <div style={styles.subtitle}>{getStatusText()}</div>
          <div style={styles.description}>{getStatusSubtext()}</div>

          <div style={styles.loadingDots}>
            <div style={styles.dot(0)}></div>
            <div style={styles.dot(0.2)}></div>
            <div style={styles.dot(0.4)}></div>
          </div>

          <div style={styles.consoleNote}>
            Press F12 to view detailed authentication logs
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
          }
          66% {
            transform: translateY(10px) translateX(-10px) rotate(-5deg);
          }
        }
        
        @keyframes pulse-ring {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }
        
        @keyframes scale-up {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 15px 40px rgba(59,130,246,0.4);
          }
          50% {
            box-shadow: 0 15px 60px rgba(59,130,246,0.7);
          }
        }
        
        .floating {
          animation: float 4s ease-in-out infinite;
        }
        
        .floating-icon {
          animation: float 3s ease-in-out infinite, glow 2s ease-in-out infinite;
        }
        
        .success-icon {
          animation: scale-up 0.6s ease-out;
          color: #10b981 !important;
        }
        
        * {
          transition: background-color 0.3s ease, background 0.3s ease;
        }

        .floating-icon svg,
.success-icon svg,
.floating-icon,
.success-icon {
  background: none !important;
  background-color: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Target the SVG elements directly */
svg {
  background: transparent !important;
  border: none !important;
}

/* Remove any rect elements that might be creating the square */
svg rect {
  display: none !important;
}

.floating-icon,
.success-icon {
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
}
      `}</style>
    </div>
  );
}