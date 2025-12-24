import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Sparkles, Zap, Shield } from 'lucide-react';
import { useMsal } from "@azure/msal-react";

const LoginForm = () => {
    const { instance, accounts } = useMsal();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [mousePos, setMousePos] = useState({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    });

    const mouseTarget = React.useRef({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    });

    const shootingStarData = React.useMemo(() => {
        return Array.from({ length: 6 }).map(() => ({
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 20
        }));
    }, []);
    const [isMicrosoftHovered, setIsMicrosoftHovered] = useState(false);

    const [logoPhysics, setLogoPhysics] = useState({
        y: 0,
        x: 0,
        velocityY: 0,
        velocityX: 0,
        rotation: 0,
        rotationVelocity: 0,
        opacity: 1,
        isFalling: false
    });

    const [textPhysics, setTextPhysics] = useState({
        y: 0,
        x: 0,
        velocityY: 0,
        velocityX: 0,
        rotation: 0,
        rotationVelocity: 0,
        opacity: 1
    });

    const GRAVITY = 1.2;
    const FLOOR_Y = 125;
    const BOUNCE_DAMPING = 0.6;
    const FRICTION = 0.98;
    const SPIN_AMOUNT = 15;

    const triggerLogoFall = () => {
        if (logoPhysics.isFalling) return;

        const randomVelX = (Math.random() - 0.5) * 8;
        const randomRotationVel = (Math.random() - 0.5) * SPIN_AMOUNT;

        setLogoPhysics({
            y: 0,
            x: 0,
            velocityY: 0,
            velocityX: randomVelX,
            rotation: 0,
            rotationVelocity: randomRotationVel,
            opacity: 1,
            isFalling: true
        });

        setTextPhysics({
            y: 0,
            x: 0,
            velocityY: Math.random() * 2 - 1,
            velocityX: (Math.random() - 0.5) * 10,
            rotation: 0,
            rotationVelocity: (Math.random() - 0.5) * 20,
            opacity: 1
        });

        let raf;

        const fall = () => {
            setLogoPhysics(prev => {
                let newVelY = prev.velocityY + GRAVITY;
                let newVelX = prev.velocityX * FRICTION;
                let newY = prev.y + newVelY;
                let newX = prev.x + newVelX;
                let newRotation = prev.rotation + prev.rotationVelocity;
                let newRotationVel = prev.rotationVelocity * 0.99;

                if (newY >= FLOOR_Y) {
                    newY = FLOOR_Y;
                    newVelY = -newVelY * BOUNCE_DAMPING;
                    newRotationVel *= 0.8;

                    if (Math.abs(newVelY) < 0.5 && Math.abs(newVelX) < 0.1) {
                        setTimeout(() => {
                            setLogoPhysics(p => ({ ...p, opacity: 0 }));
                            setTextPhysics(p => ({ ...p, opacity: 0 }));
                        }, 800);

                        setTimeout(() => {
                            setLogoPhysics({
                                y: 0, x: 0, velocityY: 0, velocityX: 0,
                                rotation: 0, rotationVelocity: 0,
                                opacity: 0, isFalling: false
                            });
                            setTextPhysics({
                                y: 0, x: 0, velocityY: 0, velocityX: 0,
                                rotation: 0, rotationVelocity: 0, opacity: 0
                            });
                        }, 1200);

                        setTimeout(() => {
                            setLogoPhysics(p => ({ ...p, opacity: 1 }));
                            setTextPhysics(p => ({ ...p, opacity: 1 }));
                        }, 1500);

                        cancelAnimationFrame(raf);
                        return prev;
                    }
                }

                return {
                    ...prev,
                    y: newY,
                    x: newX,
                    velocityY: newVelY,
                    velocityX: newVelX,
                    rotation: newRotation,
                    rotationVelocity: newRotationVel
                };
            });

            setTextPhysics(prev => {
                let newVelY = prev.velocityY + GRAVITY;
                let newVelX = prev.velocityX * FRICTION;
                let newY = prev.y + newVelY;
                let newX = prev.x + newVelX;
                let newRotation = prev.rotation + prev.rotationVelocity;
                let newRotationVel = prev.rotationVelocity * 0.99;

                if (newY >= FLOOR_Y + 10) {
                    newY = FLOOR_Y + 10;
                    newVelY = -newVelY * BOUNCE_DAMPING * 0.7;
                    newRotationVel *= 0.7;
                }

                return {
                    y: newY,
                    x: newX,
                    velocityY: newVelY,
                    velocityX: newVelX,
                    rotation: newRotation,
                    rotationVelocity: newRotationVel,
                    opacity: prev.opacity
                };
            });

            raf = requestAnimationFrame(fall);
        };

        raf = requestAnimationFrame(fall);
    };

    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [fade, setFade] = useState(true);

    const rotatingTexts = [
        "Clarity for planning, approvals, and execution.",
        "Designed for signal. Built to reduce guesswork.",
        "Insight you can defend — not just display."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length);
                setFade(true);
            }, 300);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            mouseTarget.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useEffect(() => {
        let animationFrame;

        const smoothFollow = () => {
            setMousePos(prev => {
                const dx = mouseTarget.current.x - prev.x;
                const dy = mouseTarget.current.y - prev.y;

                return {
                    x: prev.x + dx * 0.04,
                    y: prev.y + dy * 0.04
                };
            });

            animationFrame = requestAnimationFrame(smoothFollow);
        };

        smoothFollow();

        return () => cancelAnimationFrame(animationFrame);
    }, []);

    useEffect(() => {
        console.log("🔵 LoginForm mounted");
        console.log("🔵 MSAL instance:", instance ? "READY" : "NOT READY");
        console.log("🔵 Accounts:", accounts?.length || 0);

        if (accounts && accounts.length > 0) {
            console.log("📧 Existing account found:", accounts[0].username);
        }
    }, [instance, accounts]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errorMessage) setErrorMessage('');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    type: "password",
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful! User role:", data.role);
                window.location.href = "/admindashboard";
            } else {
                if (response.status === 401) {
                    setErrorMessage("Invalid email or password");
                } else if (response.status === 400) {
                    setErrorMessage(data.error || "Missing email or password");
                } else if (response.status === 500) {
                    setErrorMessage("Server error. Please try again later.");
                } else {
                    setErrorMessage(data.error || "Login failed");
                }
                setIsLoading(false);
            }
        } catch (error) {
            setIsLoading(false);
            console.error("Login error:", error);
            setErrorMessage("Login failed. Please check your connection.");
        }
    };

    const handleMicrosoftLogin = async () => {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔵 Microsoft Login Button Clicked");

        try {
            if (!instance) {
                console.error("❌ MSAL instance not ready!");
                alert("Microsoft login not ready. Please refresh and try again.");
                return;
            }

            const accounts = instance.getAllAccounts();
            if (accounts.length > 0) {
                console.log("🧹 Clearing cached accounts before fresh login...");

                Object.keys(localStorage).forEach(key => {
                    if (key.includes('msal')) {
                        localStorage.removeItem(key);
                        console.log("  🗑️ Removed:", key);
                    }
                });

                console.log("✅ Cache cleared! Proceeding with fresh login...");
            }

            console.log("✅ MSAL instance ready");
            console.log("📋 Expected MSAL Configuration:");
            console.log("  → Redirect URI: http://localhost:5173/auth");

            const loginRequest = {
                scopes: ["openid", "profile", "email", "User.Read", "Calendars.Read"],
                prompt: "select_account"
            };

            console.log("🚀 Calling instance.loginRedirect()...");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

            await instance.loginRedirect(loginRequest);

        } catch (error) {
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.error("❌ Microsoft login error:", error);
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            alert(`Microsoft login failed: ${error.message}`);
        }
    };

    const handleForgotPassword = () => {
        window.location.href = "/forgotpassword";
    };

    const styles = {
        container: {
            minHeight: '100vh',
            display: 'flex',
            fontFamily: '"Montserrat", Tahoma, Geneva, Verdana, sans-serif',
            overflow: 'hidden',
            position: 'relative'
        },
        
        // LEFT PANEL - Animated Background
        leftPanel: {
            flex: '0 0 60%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
        },
        
        // RIGHT PANEL - Form
        rightPanel: {
            flex: '0 0 40%',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            position: 'relative',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.1)'
        },

        animatedBg1: {
            position: 'absolute',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '-250px',
            left: '-250px',
            animation: 'float1 20s ease-in-out infinite',
            pointerEvents: 'none'
        },
        animatedBg2: {
            position: 'absolute',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            bottom: '-200px',
            right: '-200px',
            animation: 'float2 18s ease-in-out infinite',
            pointerEvents: 'none'
        },
        animatedBg3: {
            position: 'absolute',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '40%',
            left: '60%',
            animation: 'float3 22s ease-in-out infinite',
            pointerEvents: 'none'
        },
        
        particles: {
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none'
        },
        particle: (index) => ({
            position: 'absolute',
            width: '5px',
            height: '5px',
            background: 'rgba(255, 255, 255, 0.4)',
            borderRadius: '50%',
            top: `${(index * 17) % 100}%`,
            left: `${(index * 23) % 100}%`,
            animation: `particle${index % 3} ${15 + index % 5}s ease-in-out infinite`,
            animationDelay: `${index * 0.5}s`
        }),
        
        mouseGlow: {
            position: 'absolute',
            width: '700px',
            height: '700px',
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            transform: `translate(${mousePos.x - 350}px, ${mousePos.y - 350}px)`,
            transition: 'transform 1s cubic-bezier(0.22, 1, 0.36, 1)'
        },
        
        shootingStars: {
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0
        },
        shootingStar: (index) => ({
            position: "absolute",
            width: "200px",
            height: "2px",
            background: "linear-gradient(90deg, rgba(255,255,255,0), #00A4EF, #7FBA00, #A855F7, rgba(255,255,255,0))",
            opacity: 1,
            transform: "rotate(-25deg)",
            animation: `shootingStar ${8 + index * 2}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            filter: "drop-shadow(0 0 12px rgba(59,130,246,0.9))"
        }),

        // Logo Container in Left Panel
        logoContainer: {
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '40px'
        },
        
        logoFloatWrapper: {
            position: 'relative',
            animation: 'floatY 4s ease-in-out infinite'
        },
        
        logoClickWrapper: {
            cursor: 'pointer',
            willChange: 'transform, opacity',
            transition: 'opacity 0.3s ease',
            position: 'relative',
            transform: `translate(${logoPhysics.x}px, ${logoPhysics.y}px) rotate(${logoPhysics.rotation}deg)`,
            opacity: logoPhysics.opacity
        },
        
        logoImage: {
            height: '80px',
            width: 'auto',
            maxWidth: '300px',
            objectFit: 'contain',
            animation: 'logoClock 10s ease-in-out infinite',
            filter: 'drop-shadow(0 8px 24px rgba(59, 130, 246, 0.4))'
        },
        
        circularText: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'sealRotate 40s linear infinite',
            pointerEvents: 'none',
            zIndex: 1
        },

        // Branding Text Below Logo
        brandingText: {
            textAlign: 'center',
            color: 'white',
            marginTop: '20px'
        },
        brandingTitle: {
            fontSize: '48px',
            fontWeight: '800',
            marginBottom: '16px',
            background: 'linear-gradient(90deg, #FF0000 0%, #00FF00 25%, #0000FF 50%, #FF00FF 75%, #FF0000 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'fadeInDown 1s ease-out, rgbShift 3s linear infinite'
        },
        brandingSubtitle: {
            fontSize: '18px',
            fontWeight: '500',
            color: 'rgba(255, 255, 255, 0.8)',
            transition: 'opacity 0.3s ease',
            opacity: fade ? 1 : 0,
            minHeight: '27px',
            lineHeight: '1.5'
        },

        // Feature Pills
        featurePills: {
            display: 'flex',
            gap: '12px',
            marginTop: '40px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: '500px'
        },
        featurePill: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600',
            animation: 'fadeInUp 1s ease-out'
        },

        // Form Container
        formContainer: {
            width: '100%',
            maxWidth: '420px',
            animation: 'fadeInRight 0.8s ease-out'
        },
        
        formTitle: {
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '12px'
        },
        
        formSubtitle: {
            fontSize: '15px',
            color: '#6b7280',
            marginBottom: '40px',
            lineHeight: '1.6'
        },
        
        inputGroup: {
            marginBottom: '24px'
        },
        
        label: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#1f2937'
        },
        
        input: (hasError) => ({
            width: '100%',
            padding: '14px 16px',
            borderRadius: '10px',
            border: hasError ? '2px solid #ef4444' : '2px solid #e5e7eb',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease',
            backgroundColor: '#f9fafb'
        }),
        
        passwordContainer: {
            position: 'relative'
        },
        
        passwordInput: (hasError) => ({
            width: '100%',
            padding: '14px 50px 14px 16px',
            borderRadius: '10px',
            border: hasError ? '2px solid #ef4444' : '2px solid #e5e7eb',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease',
            backgroundColor: '#f9fafb'
        }),
        
        eyeButton: {
            position: 'absolute',
            top: '50%',
            right: '12px',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '8px',
            transition: 'all 0.3s ease'
        },
        
        signInButton: (isLoading) => ({
            width: '100%',
            backgroundColor: isLoading ? '#6b7280' : '#0f172a',
            color: 'white',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '10px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginTop: '12px',
            transition: 'all 0.3s ease',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isLoading ? 'scale(0.98)' : 'scale(1)'
        }),
        
        loadingSpinner: {
            width: '18px',
            height: '18px',
            border: '2px solid #ffffff40',
            borderRadius: '50%',
            borderTopColor: '#ffffff',
            animation: 'spin 0.6s linear infinite',
            marginRight: '10px'
        },
        
        errorMessage: {
            color: '#ef4444',
            fontSize: '14px',
            textAlign: 'left',
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            animation: 'shake 0.5s ease-in-out, fadeIn 0.3s ease-out'
        },

        divider: {
            display: 'flex',
            alignItems: 'center',
            margin: '28px 0',
            gap: '16px'
        },
        dividerLine: {
            flex: 1,
            height: '1px',
            background: 'linear-gradient(to right, transparent, #d1d5db, transparent)'
        },
        dividerText: {
            fontSize: '13px',
            color: '#9ca3af',
            fontWeight: '500'
        },

        microsoftButtonWrapper: {
            position: 'relative',
            width: '100%'
        },
        microsoftButton: {
            position: 'relative',
            zIndex: 1,
            width: '100%',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            padding: '14px',
            fontSize: '15px',
            fontWeight: '600',
            borderRadius: '10px',
            border: '2px solid #e5e7eb',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s ease'
        },
        microsoftLogo: {
            width: '22px',
            height: '22px'
        }
    };

    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes float1 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(120px, -120px) scale(1.1); }
                66% { transform: translate(-60px, 60px) scale(0.9); }
            }
            @keyframes float2 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(-120px, 120px) scale(1.15); }
                66% { transform: translate(90px, -90px) scale(0.95); }
            }
            @keyframes float3 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(-140px, 70px) scale(1.2); }
            }
            @keyframes particle0 {
                0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
                50% { transform: translateY(-40px) translateX(25px); opacity: 0.7; }
            }
            @keyframes particle1 {
                0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
                50% { transform: translateY(50px) translateX(-20px); opacity: 0.6; }
            }
            @keyframes particle2 {
                0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
                50% { transform: translateY(-30px) translateX(-30px); opacity: 0.8; }
            }
            @keyframes floatY {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-15px); }
            }
            @keyframes logoClock {
                0% { transform: rotate(0deg); }
                70% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes fadeInDown {
                0% { transform: translateY(-30px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes fadeInUp {
                0% { transform: translateY(30px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes fadeInRight {
                0% { transform: translateX(40px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                20%, 40%, 60%, 80% { transform: translateX(8px); }
            }
            @keyframes shootingStar {
                0% {
                    transform: translateX(200px) translateY(-100px) rotate(-25deg);
                    opacity: 0;
                }
                15% {
                    opacity: 0.9;
                }
                100% {
                    transform: translateX(-900px) translateY(500px) rotate(-25deg);
                    opacity: 0;
                }
            }
            @keyframes sealRotate {
                from {
                    transform: translate(-50%, -50%) rotate(0deg);
                }
                to {
                    transform: translate(-50%, -50%) rotate(360deg);
                }
            }
            @keyframes microsoftGlow {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            @keyframes rgbShift {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
            }
            input:focus {
                border-color: #3b82f6 !important;
                background-color: #ffffff !important;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
            }
            button:hover:not(:disabled) {
                transform: scale(1.03) !important;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12) !important;
            }
            svg text {
                font-size: 15.5px;
                font-weight: 600;
                letter-spacing: 1.2px;
                fill: rgba(255, 255, 255, 0.85);
                text-transform: uppercase;
            }
            
            @media (max-width: 1024px) {
                .split-container {
                    flex-direction: column !important;
                }
                .left-panel, .right-panel {
                    flex: 1 1 100% !important;
                    min-height: 50vh !important;
                }
            }
        `;
        document.head.appendChild(styleElement);
        return () => {
            if (document.head.contains(styleElement)) {
                document.head.removeChild(styleElement);
            }
        };
    }, []);

    return (
        <div style={styles.container} className="split-container">
            {/* LEFT PANEL - Animated Background & Branding */}
            <div style={styles.leftPanel} className="left-panel">
                {/* Animated background elements */}
                <div style={styles.animatedBg1}></div>
                <div style={styles.animatedBg2}></div>
                <div style={styles.animatedBg3}></div>

                {/* Shooting RGB stars */}
                <div style={styles.shootingStars}>
                    {shootingStarData.map((star, i) => (
                        <div
                            key={i}
                            style={{
                                ...styles.shootingStar(i),
                                top: `${star.top}%`,
                                left: `${star.left}%`,
                                animationDelay: `${star.delay}s`
                            }}
                        />
                    ))}
                </div>

                {/* Mouse-following glow */}
                <div style={styles.mouseGlow}></div>

                {/* Floating particles */}
                <div style={styles.particles}>
                    {[...Array(15)].map((_, i) => (
                        <div key={i} style={styles.particle(i)}></div>
                    ))}
                </div>

                {/* Logo & Branding */}
                <div style={styles.logoContainer}>
                    <div style={styles.logoFloatWrapper}>
                        <div style={styles.logoClickWrapper} onClick={triggerLogoFall}>
                            <svg
                                width="180"
                                height="180"
                                viewBox="0 0 180 180"
                                style={{
                                    ...styles.circularText,
                                    transform: `translate(calc(-50% + ${textPhysics.x}px), calc(-50% + ${textPhysics.y}px)) rotate(${textPhysics.rotation}deg)`,
                                    opacity: textPhysics.opacity
                                }}
                            >
                                <defs>
                                    <path
                                        id="circlePath"
                                        d="M 90, 90 m -60, 0 a 60,60 0 1,1 120,0 a 60,60 0 1,1 -120,0"
                                    />
                                </defs>
                                <text>
                                    <textPath href="#circlePath" startOffset="0%">
                                        MAXCAP · MAXCAP · MAXCAP · MAXCAP ·
                                    </textPath>
                                </text>
                            </svg>

                            <img
                                src="/images/maxcap.png"
                                alt="Logo"
                                style={styles.logoImage}
                            />
                        </div>
                    </div>

                    <div style={styles.brandingText}>
                        <h1 style={styles.brandingTitle}>MAXCAP</h1>
                        <p style={styles.brandingSubtitle}>
                            {rotatingTexts[currentTextIndex]}
                        </p>
                    </div>

                    <div style={styles.featurePills}>
                        <div style={styles.featurePill}>
                            <Shield size={16} />
                            <span>Enterprise Grade</span>
                        </div>
                        <div style={{ ...styles.featurePill, animationDelay: '0.1s' }}>
                            <Zap size={16} />
                            <span>Real-time Sync</span>
                        </div>
                        <div style={{ ...styles.featurePill, animationDelay: '0.2s' }}>
                            <Sparkles size={16} />
                            <span>AI-Powered</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - Login Form */}
            <div style={styles.rightPanel} className="right-panel">
                <div style={styles.formContainer}>
                    <h2 style={styles.formTitle}>Welcome back</h2>
                    <p style={styles.formSubtitle}>
                        Sign in to your workspace
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                                style={styles.input(!!errorMessage)}
                                required
                                disabled={isLoading}
                                placeholder="Enter your email address"
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Password</label>
                            <div style={styles.passwordContainer}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                                    style={styles.passwordInput(!!errorMessage)}
                                    required
                                    disabled={isLoading}
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    style={styles.eyeButton}
                                    disabled={isLoading}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {errorMessage && (
                            <div style={styles.errorMessage}>
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            style={styles.signInButton(isLoading)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div style={styles.loadingSpinner}></div>
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div style={styles.divider}>
                        <div style={styles.dividerLine}></div>
                        <span style={styles.dividerText}>OR</span>
                        <div style={styles.dividerLine}></div>
                    </div>

                    {/* Microsoft Sign-In Button with RGB Underglow */}
                    <div
                        style={styles.microsoftButtonWrapper}
                        onMouseEnter={() => setIsMicrosoftHovered(true)}
                        onMouseLeave={() => setIsMicrosoftHovered(false)}
                    >
                        {isMicrosoftHovered && (
                            <div style={{
                                position: "absolute",
                                inset: "-3px",
                                borderRadius: "12px",
                                background: "linear-gradient(90deg, #F25022 0%, #7FBA00 25%, #00A4EF 50%, #FFB900 75%, #F25022 100%)",
                                backgroundSize: "300% 100%",
                                animation: "microsoftGlow 3s linear infinite",
                                filter: "blur(10px)",
                                opacity: "0.7",
                                zIndex: 0
                            }}></div>
                        )}

                        <button
                            type="button"
                            onClick={handleMicrosoftLogin}
                            style={styles.microsoftButton}
                        >
                            <img
                                src="/images/microsoft.png"
                                alt="Microsoft Logo"
                                style={styles.microsoftLogo}
                            />
                            Sign in with Microsoft
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;