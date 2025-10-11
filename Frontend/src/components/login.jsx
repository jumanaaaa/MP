import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

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
                body: JSON.stringify(formData)
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

    const handleForgotPassword = () => {
        window.location.href = "/forgotpassword";
    };

    const styles = {
        container: {
            minHeight: '100vh',
            background: 'linear-gradient(to right, #1e293b, #334155)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            position: 'relative',
            fontFamily: '"Montserrat", Tahoma, Geneva, Verdana, sans-serif',
            overflow: 'hidden'
        },
        animatedBg1: {
            position: 'absolute',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '-200px',
            left: '-200px',
            animation: 'float1 20s ease-in-out infinite',
            pointerEvents: 'none'
        },
        animatedBg2: {
            position: 'absolute',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            bottom: '-150px',
            right: '-150px',
            animation: 'float2 18s ease-in-out infinite',
            pointerEvents: 'none'
        },
        animatedBg3: {
            position: 'absolute',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '50%',
            right: '10%',
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
            width: '4px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            top: `${(index * 17) % 100}%`,
            left: `${(index * 23) % 100}%`,
            animation: `particle${index % 3} ${15 + index % 5}s ease-in-out infinite`,
            animationDelay: `${index * 0.5}s`
        }),
        mouseGlow: {
            position: 'absolute',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            transform: `translate(${mousePos.x - 300}px, ${mousePos.y - 300}px)`,
            transition: 'transform 0.3s ease-out'
        },
        formContainer: {
            marginTop: '100px',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            zIndex: 1,
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            animation: 'formPulse 3s ease-in-out infinite, slideInUp 0.6s ease-out',
            position: 'relative'
        },
        logoFloating: {
            position: 'absolute',
            top: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '64px',
            zIndex: 2,
            animation: 'logoFloat 3s ease-in-out infinite, logoGlow 2s ease-in-out infinite',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '4px',
            animation: 'fadeInDown 0.8s ease-out'
        },
        subtitle: {
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '32px',
            animation: 'fadeInDown 1s ease-out'
        },
        inputGroup: {
            marginBottom: '20px',
            textAlign: 'left',
            animation: 'fadeInLeft 1s ease-out'
        },
        label: {
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '6px',
            color: '#1f2937'
        },
        input: (hasError) => ({
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: hasError ? '1px solid #ef4444' : '1px solid #d1d5db',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease',
            animation: 'inputGlow 2s ease-in-out infinite'
        }),
        passwordContainer: {
            position: 'relative'
        },
        passwordInput: (hasError) => ({
            width: '100%',
            padding: '10px 40px 10px 14px',
            borderRadius: '8px',
            border: hasError ? '1px solid #ef4444' : '1px solid #d1d5db',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease',
            animation: 'inputGlow 2s ease-in-out infinite'
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
            padding: '4px',
            transition: 'all 0.3s ease',
            animation: 'iconBounce 2s ease-in-out infinite'
        },
        signInButton: (isLoading) => ({
            width: '100%',
            backgroundColor: isLoading ? '#6b7280' : '#1e293b',
            color: 'white',
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginTop: '8px',
            transition: 'all 0.3s ease',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isLoading ? 'none' : 'buttonPulse 2s ease-in-out infinite',
            transform: isLoading ? 'scale(0.98)' : 'scale(1)'
        }),
        loadingSpinner: {
            width: '16px',
            height: '16px',
            border: '2px solid #ffffff40',
            borderRadius: '50%',
            borderTopColor: '#ffffff',
            animation: 'spin 0.6s linear infinite',
            marginRight: '8px'
        },
        errorMessage: {
            color: '#ef4444',
            fontSize: '14px',
            textAlign: 'center',
            marginTop: '12px',
            padding: '8px',
            backgroundColor: '#fef2f2',
            borderRadius: '6px',
            border: '1px solid #fecaca',
            animation: 'shake 0.5s ease-in-out, fadeIn 0.3s ease-out'
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
                33% { transform: translate(100px, -100px) scale(1.1); }
                66% { transform: translate(-50px, 50px) scale(0.9); }
            }
            @keyframes float2 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(-100px, 100px) scale(1.15); }
                66% { transform: translate(80px, -80px) scale(0.95); }
            }
            @keyframes float3 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(-120px, 60px) scale(1.2); }
            }
            @keyframes particle0 {
                0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
                50% { transform: translateY(-30px) translateX(20px); opacity: 0.7; }
            }
            @keyframes particle1 {
                0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
                50% { transform: translateY(40px) translateX(-15px); opacity: 0.6; }
            }
            @keyframes particle2 {
                0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
                50% { transform: translateY(-20px) translateX(-25px); opacity: 0.8; }
            }
            @keyframes logoFloat {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                50% { transform: translateX(-50%) translateY(-10px); }
            }
            @keyframes logoGlow {
                0%, 100% { filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2)); }
                50% { filter: drop-shadow(0 8px 20px rgba(59, 130, 246, 0.4)); }
            }
            @keyframes formPulse {
                0%, 100% { box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
                50% { box-shadow: 0 25px 50px rgba(59, 130, 246, 0.25); }
            }
            @keyframes slideInUp {
                0% { transform: translateY(30px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes fadeInDown {
                0% { transform: translateY(-20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes fadeInLeft {
                0% { transform: translateX(-20px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeInRight {
                0% { transform: translateX(20px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            @keyframes inputGlow {
                0%, 100% { box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
                50% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.1); }
            }
            @keyframes buttonPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                50% { transform: scale(1.02); box-shadow: 0 6px 12px rgba(59, 130, 246, 0.3); }
            }
            @keyframes iconBounce {
                0%, 100% { transform: translateY(-50%) scale(1); }
                50% { transform: translateY(-50%) scale(1.1); }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                20%, 40%, 60%, 80% { transform: translateX(8px); }
            }
            input:focus {
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
                animation: none !important;
            }
            button:hover:not(:disabled) {
                transform: scale(1.05) !important;
                box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4) !important;
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
        <div style={styles.container}>
            {/* Animated background elements */}
            <div style={styles.animatedBg1}></div>
            <div style={styles.animatedBg2}></div>
            <div style={styles.animatedBg3}></div>
            
            {/* Mouse-following glow */}
            <div style={styles.mouseGlow}></div>
            
            {/* Floating particles */}
            <div style={styles.particles}>
                {[...Array(12)].map((_, i) => (
                    <div key={i} style={styles.particle(i)}></div>
                ))}
            </div>

            {/* Floating logo */}
            <img src="/images/maxcap.png" alt="Logo" style={styles.logoFloating} />

            {/* Form container */}
            <div style={styles.formContainer}>
                <h2 style={styles.title}>Sign in to your workspace:</h2>
                <p style={styles.subtitle}>ihrp.maxcap.com</p>

                <div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email:</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                            style={styles.input(!!errorMessage)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password:</label>
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
                            />
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                style={styles.eyeButton}
                                disabled={isLoading}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                        onClick={handleSubmit}
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
                </div>
            </div>
        </div>
    );
};

export default LoginForm;