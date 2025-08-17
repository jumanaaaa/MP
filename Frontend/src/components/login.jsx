import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
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
                credentials: "include", // send cookies with JWT
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful! User role:", data.role);
                
                // Both admin and member go to the same dashboard route
                // The dashboard component will handle role-based rendering
                window.location.href = "/admindashboard";
                
            } else {
                // Handle error responses from server
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
            fontFamily: '"Montserrat", Tahoma, Geneva, Verdana, sans-serif'
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
            textAlign: 'center'
        },
        logoFloating: {
            position: 'absolute',
            top: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '64px',
            zIndex: 2
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '4px'
        },
        subtitle: {
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '32px'
        },
        inputGroup: {
            marginBottom: '20px',
            textAlign: 'left'
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
            transition: 'border-color 0.2s ease'
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
            transition: 'border-color 0.2s ease'
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
            padding: '4px'
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
            transition: 'background-color 0.2s ease',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }),
        loadingSpinner: {
            width: '16px',
            height: '16px',
            border: '2px solid #ffffff40',
            borderRadius: '50%',
            borderTopColor: '#ffffff',
            animation: 'spin 1s linear infinite',
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
            border: '1px solid #fecaca'
        },
        forgotPasswordLeft: {
            textAlign: 'left',
            marginTop: '12px'
        },
        forgotPasswordLink: {
            color: '#38bdf8',
            textDecoration: 'underline',
            cursor: 'pointer',
            marginLeft: '4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            padding: '0'
        }
    };

    // Add CSS animation for loading spinner
    React.useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
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
            {/* Floating logo above form box */}
            <img src="/images/maxcap.png" alt="Logo" style={styles.logoFloating} />

            {/* White form box */}
            <div style={styles.formContainer}>
                <h2 style={styles.title}>Sign in to your workspace:</h2>
                <p style={styles.subtitle}>ihrp.maxcap.com</p>

                <div onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email:</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
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

                    <div style={styles.forgotPasswordLeft}>
                        <button 
                            onClick={handleForgotPassword}
                            style={styles.forgotPasswordLink}
                        >
                            Forgot password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;