import React, { useState, useEffect, useRef } from 'react';
import {
    User, Mail, Building, Calendar, Shield, ArrowLeft, Bell, Phone,
    Award, TrendingUp, Clock, Activity, Briefcase, MapPin, Edit2, Save, X
} from 'lucide-react';
import { useSidebar } from '../context/sidebarcontext';
import { apiFetch } from '../utils/api';

const AdminProfilePage = () => {
    const { collapsed } = useSidebar();
    const [isDarkMode, setIsDarkMode] = useState(() => {
        try {
            const savedMode = localStorage.getItem('darkMode');
            return savedMode === 'true';
        } catch (error) {
            return false;
        }
    });
    const [hoveredButton, setHoveredButton] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);
    const [hoveredPeriod, setHoveredPeriod] = useState(null);
    const [showProfileTooltip, setShowProfileTooltip] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editedData, setEditedData] = useState({});
    const [actuals, setActuals] = useState([]);
    const [period, setPeriod] = useState('week');
    const [stats, setStats] = useState({
        weeklyHours: 0,
        capacityUtilization: 0,
        projectCount: 0,
        totalHours: 0
    });

    const injectedStyleRef = useRef(null);
    const originalBodyStyleRef = useRef(null);

    // Fetch actuals data
    useEffect(() => {
        const fetchActuals = async () => {
            try {
                const response = await apiFetch('/actuals', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    setActuals(data);
                }
            } catch (err) {
                console.error('Error fetching actuals:', err);
            }
        };

        if (userData) {
            fetchActuals();
        }
    }, [userData]);

    // Fetch stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                console.log(`📊 Fetching user stats for period: ${period}`);
                const response = await apiFetch(`/actuals/stats?period=${period}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Stats received:', data);
                    setStats(data);
                } else {
                    console.error('❌ Failed to fetch stats');
                }
            } catch (error) {
                console.error('💥 Error fetching stats:', error);
            }
        };

        if (userData) {
            fetchStats();
        }
    }, [userData, period]);

    // Fetch user profile data from backend
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await apiFetch('/user/profile', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error('Failed to fetch user profile');
                }

                const data = await response.json();
                
                const detailsResponse = await apiFetch(`/users/${data.id}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (detailsResponse.ok) {
                    const fullData = await detailsResponse.json();
                    setUserData(fullData);
                    setEditedData(fullData);
                } else {
                    const basicData = {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        role: data.role,
                        department: data.department,
                        team: 'Not specified',
                        project: 'Not specified',
                        phoneNumber: 'Not specified',
                        dateOfBirth: null,
                        dateJoined: null
                    };
                    setUserData(basicData);
                    setEditedData(basicData);
                }
                
                setLoading(false);
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    // Background effect
    useEffect(() => {
        if (!originalBodyStyleRef.current) {
            originalBodyStyleRef.current = {
                background: document.body.style.background,
                margin: document.body.style.margin,
                padding: document.body.style.padding
            };
        }

        if (injectedStyleRef.current) {
            document.head.removeChild(injectedStyleRef.current);
        }

        const pageStyle = document.createElement('style');
        pageStyle.setAttribute('data-component', 'admin-profile-background');

        const backgroundGradient = isDarkMode
            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

        pageStyle.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes float {
                0%, 100% {
                    transform: translateY(0px);
                }
                50% {
                    transform: translateY(-6px);
                }
            }
            
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
            
            @keyframes shimmer {
                0% {
                    background-position: -1000px 0;
                }
                100% {
                    background-position: 1000px 0;
                }
            }
            
            .floating {
                animation: float 3s ease-in-out infinite;
            }
            
            .pulse {
                animation: pulse 2s ease-in-out infinite;
            }
            
            .shimmer {
                animation: shimmer 3s linear infinite;
                background: linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(59,130,246,0.1) 50%,
                    transparent 100%
                );
                background-size: 1000px 100%;
            }
            
            body {
                background: ${backgroundGradient} !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            * {
                transition: background-color 0.3s ease, background 0.3s ease;
            }
        `;

        document.head.appendChild(pageStyle);
        injectedStyleRef.current = pageStyle;

        return () => {
            if (injectedStyleRef.current && document.head.contains(injectedStyleRef.current)) {
                document.head.removeChild(injectedStyleRef.current);
                injectedStyleRef.current = null;
            }
        };
    }, [isDarkMode]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        setShowProfileTooltip(false);

        try {
            localStorage.setItem('darkMode', newMode.toString());
        } catch (error) {
            console.log('Dark mode preference cannot be saved in this environment');
        }
    };

    const styles = {
        page: {
            minHeight: '100vh',
            padding: '30px 60px', // Match AdminActuals padding
            background: isDarkMode
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontFamily: '"Montserrat", sans-serif',
            transition: 'all 0.3s ease',
            position: 'relative'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px' // Increase from 32px to match AdminActuals
        },
        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        },
        backButton: (isHovered) => ({
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: isHovered
                ? 'rgba(59,130,246,0.1)'
                : isDarkMode
                    ? 'rgba(51,65,85,0.9)'
                    : 'rgba(255,255,255,0.9)',
            color: isHovered ? '#3b82f6' : isDarkMode ? '#e2e8f0' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isHovered
                ? '0 8px 25px rgba(59,130,246,0.15)'
                : '0 4px 12px rgba(0,0,0,0.08)',
            transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }),
        title: {
            fontSize: '32px',
            fontWeight: '700',
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        headerRight: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        },
        topButton: (isHovered) => ({
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: isHovered
                ? 'rgba(59,130,246,0.1)'
                : isDarkMode
                    ? 'rgba(51,65,85,0.9)'
                    : 'rgba(255,255,255,0.9)',
            color: isHovered ? '#3b82f6' : isDarkMode ? '#e2e8f0' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isHovered
                ? '0 8px 25px rgba(59,130,246,0.15)'
                : '0 4px 12px rgba(0,0,0,0.08)',
            transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }),
        notificationBadge: {
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            border: '2px solid #fff'
        },
        profileTooltip: {
            position: 'absolute',
            top: '60px',
            right: '0',
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
            padding: '16px',
            minWidth: '250px',
            border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
            zIndex: 1000,
            animation: 'slideIn 0.2s ease-out',
            transition: 'all 0.3s ease'
        },
        tooltipArrow: {
            position: 'absolute',
            top: '-6px',
            right: '16px',
            width: '12px',
            height: '12px',
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
            transform: 'rotate(45deg)',
            border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
            borderBottom: 'none',
            borderRight: 'none',
            transition: 'all 0.3s ease'
        },
        userInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
        },
        userAvatar: {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '600',
            fontSize: '16px'
        },
        userDetails: {
            flex: 1
        },
        userName: {
            fontSize: '14px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '2px',
            transition: 'all 0.3s ease'
        },
        userRole: {
            fontSize: '12px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            transition: 'all 0.3s ease'
        },
        userStats: {
            borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease'
        },
        tooltipStatItem: {
            textAlign: 'center'
        },
        tooltipStatNumber: {
            fontSize: '14px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            transition: 'all 0.3s ease'
        },
        tooltipStatLabel: {
            fontSize: '10px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease'
        },
        themeToggle: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'rgba(59,130,246,0.1)',
            color: '#3b82f6',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginTop: '8px',
            width: '100%',
            textAlign: 'center'
        },
        container: {
            width: '100%',
            maxWidth: '2000px', // Increase from 1200px to match AdminActuals
            margin: '0 auto'
        },
        card: (isHovered) => ({
            backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
            borderRadius: '20px',
            padding: '40px', // Increase from 28px to match AdminActuals
            marginBottom: '28px',
            boxShadow: isHovered
                ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.1)'
                : '0 8px 25px rgba(0,0,0,0.08)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
        }),
        cardGlow: {
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)',
            opacity: 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none'
        },
        floatingIcon: (color = '#3b82f6') => ({
            position: 'absolute',
            top: '20px',
            right: '20px',
            opacity: 0.1,
            fontSize: '48px',
            color: color
        }),
        profileHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            marginBottom: '32px',
            paddingBottom: '32px',
            borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)',
            position: 'relative'
        },
        largeAvatar: {
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '700',
            fontSize: '42px',
            boxShadow: '0 12px 35px rgba(59,130,246,0.4)',
            border: '4px solid rgba(255,255,255,0.2)',
            position: 'relative'
        },
        avatarRing: {
            position: 'absolute',
            inset: '-8px',
            borderRadius: '50%',
            border: '2px solid rgba(59,130,246,0.2)',
            animation: 'pulse 3s ease-in-out infinite'
        },
        profileInfo: {
            flex: 1
        },
        profileName: {
            fontSize: '36px',
            fontWeight: '700',
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            marginBottom: '8px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        profileEmail: {
            fontSize: '16px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        roleChip: {
            padding: '8px 20px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            backgroundColor: userData?.role === 'admin' ? '#fef3c7' : '#dbeafe',
            color: userData?.role === 'admin' ? '#92400e' : '#1e40af',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', // Increase from 200px
            gap: '24px', // Increase from 20px
            marginBottom: '28px'
        },
        statBox: (isHovered) => ({
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
            borderRadius: '16px',
            padding: '32px', // Increase from 24px
            textAlign: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            transform: isHovered ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
            boxShadow: isHovered
                ? '0 12px 24px rgba(0,0,0,0.15)'
                : '0 4px 12px rgba(0,0,0,0.08)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
            position: 'relative',
            overflow: 'hidden'
        }),
        statIcon: {
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59,130,246,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
        },
        statValue: {
            fontSize: '32px',
            fontWeight: '800',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '4px'
        },
        statLabel: {
            fontSize: '13px',
            fontWeight: '600',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        detailsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', // Increase from 280px
            gap: '24px' // Increase from 20px
        },
        detailItem: (isHovered) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
            boxShadow: isHovered ? '0 4px 12px rgba(59,130,246,0.1)' : 'none'
        }),
        detailIcon: {
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59,130,246,0.1)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '48px',
            minHeight: '48px'
        },
        detailContent: {
            flex: 1
        },
        detailLabel: {
            fontSize: '12px',
            fontWeight: '600',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
        },
        detailValue: {
            fontSize: '16px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b'
        },
        sectionTitle: {
            fontSize: '20px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        editButton: (isActive) => ({
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: isActive ? '#ef4444' : '#3b82f6',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            position: 'absolute',
            top: '28px',
            right: '28px'
        }),
        loadingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            fontSize: '18px',
            color: isDarkMode ? '#e2e8f0' : '#64748b'
        },
        errorContainer: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            gap: '16px'
        },
        errorText: {
            fontSize: '18px',
            color: '#ef4444',
            textAlign: 'center'
        },
        retryButton: {
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#3b82f6',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        },
        periodToggleStyles: {
            container: {
                display: 'flex',
                gap: '8px',
                padding: '4px',
                backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
                backdropFilter: 'blur(10px)',
                marginBottom: '20px',
                width: 'fit-content'
            },
            button: (isActive, isHovered) => ({
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isActive ? '#3b82f6' : (isHovered ? 'rgba(59,130,246,0.1)' : 'transparent'),
                color: isActive ? '#fff' : (isDarkMode ? '#e2e8f0' : '#64748b'),
                boxShadow: isActive ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
                transform: isHovered && !isActive ? 'scale(1.05)' : 'scale(1)'
            })
        }
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.loadingContainer}>
                    <div className="pulse">Loading profile...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.page}>
                <div style={styles.errorContainer}>
                    <div style={styles.errorText}>
                        Failed to load profile: {error}
                    </div>
                    <button 
                        style={styles.retryButton}
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!userData) {
        return null;
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <button
                            style={styles.backButton(hoveredButton === 'back')}
                            onClick={() => window.history.back()}
                            onMouseEnter={() => setHoveredButton('back')}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="floating"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={styles.title}>My Profile</h1>
                    </div>

                    <div style={styles.headerRight}>
                        <button
                            style={styles.topButton(hoveredButton === 'alerts')}
                            onMouseEnter={() => setHoveredButton('alerts')}
                            onMouseLeave={() => setHoveredButton(null)}
                            onClick={() => {
                                window.location.href = '/adminalerts';
                            }}
                        >
                            <Bell size={20} />
                            <div style={styles.notificationBadge}></div>
                        </button>

                        <div style={{ position: 'relative' }}>
                            <button
                                style={{
                                    ...styles.topButton(true),
                                    backgroundColor: 'rgba(59,130,246,0.1)',
                                    color: '#3b82f6'
                                }}
                                onMouseEnter={() => setShowProfileTooltip(true)}
                                onMouseLeave={() => setShowProfileTooltip(false)}
                            >
                                <User size={20} />
                            </button>

                            {showProfileTooltip && userData && (
                                <div
                                    style={styles.profileTooltip}
                                    onMouseEnter={() => setShowProfileTooltip(true)}
                                    onMouseLeave={() => setShowProfileTooltip(false)}
                                >
                                    <div style={styles.tooltipArrow}></div>
                                    <div style={styles.userInfo}>
                                        <div style={styles.userAvatar}>
                                            {userData.firstName?.[0]}{userData.lastName?.[0]}
                                        </div>
                                        <div style={styles.userDetails}>
                                            <div style={styles.userName}>
                                                {userData.firstName} {userData.lastName}
                                            </div>
                                            <div style={styles.userRole}>
                                                {userData.role === 'admin' ? 'Admin' : 'Member'} • {userData.department}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={styles.userStats}>
                                        <div style={styles.tooltipStatItem}>
                                            <div style={styles.tooltipStatNumber}>
                                                {actuals.reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0).toFixed(1)}
                                            </div>
                                            <div style={styles.tooltipStatLabel}>Hours</div>
                                        </div>
                                        <div style={styles.tooltipStatItem}>
                                            <div style={styles.tooltipStatNumber}>
                                                {actuals.filter(a => a.Category === 'Project').length}
                                            </div>
                                            <div style={styles.tooltipStatLabel}>Projects</div>
                                        </div>
                                        <div style={styles.tooltipStatItem}>
                                            <div style={styles.tooltipStatNumber}>{stats.capacityUtilization}%</div>
                                            <div style={styles.tooltipStatLabel}>Capacity</div>
                                        </div>
                                    </div>
                                    <button
                                        style={styles.themeToggle}
                                        onClick={toggleTheme}
                                    >
                                        {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Profile Card */}
                <div
                    style={styles.card(hoveredCard === 'main')}
                    onMouseEnter={() => setHoveredCard('main')}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <div style={styles.cardGlow}></div>
                    <div style={styles.floatingIcon()}>
                        <User />
                    </div>

                    <div style={styles.profileHeader}>
                        <div style={styles.largeAvatar} className="floating">
                            <div style={styles.avatarRing}></div>
                            {userData.firstName?.[0]}{userData.lastName?.[0]}
                        </div>
                        <div style={styles.profileInfo}>
                            <div style={styles.profileName}>
                                {userData.firstName} {userData.lastName}
                            </div>
                            <div style={styles.profileEmail}>
                                <Mail size={16} />
                                {userData.email}
                            </div>
                            <div style={styles.roleChip}>
                                <Shield size={16} />
                                {userData.role === 'admin' ? 'Administrator' : 'Member'}
                            </div>
                        </div>
                    </div>

                    <div style={styles.statsGrid}>
                        <div
                            style={styles.statBox(hoveredCard === 'stat-1')}
                            onMouseEnter={() => setHoveredCard('stat-1')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="shimmer" style={{ position: 'absolute', inset: 0, opacity: hoveredCard === 'stat-1' ? 1 : 0 }}></div>
                            <div style={styles.statIcon}>
                                <Clock size={24} />
                            </div>
                            <div style={styles.statValue}>{stats.totalHours || 0}h</div>
                            <div style={styles.statLabel}>Hours {period === 'week' ? 'This Week' : 'This Month'}</div>
                        </div>

                        <div
                            style={styles.statBox(hoveredCard === 'stat-2')}
                            onMouseEnter={() => setHoveredCard('stat-2')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="shimmer" style={{ position: 'absolute', inset: 0, opacity: hoveredCard === 'stat-2' ? 1 : 0 }}></div>
                            <div style={styles.statIcon}>
                                <Briefcase size={24} />
                            </div>
                            <div style={styles.statValue}>{stats.projectHours > 0 ? Math.ceil(stats.projectHours / 40) : 0}</div>
                            <div style={styles.statLabel}>Active Projects</div>
                        </div>

                        <div
                            style={styles.statBox(hoveredCard === 'stat-3')}
                            onMouseEnter={() => setHoveredCard('stat-3')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="shimmer" style={{ position: 'absolute', inset: 0, opacity: hoveredCard === 'stat-3' ? 1 : 0 }}></div>
                            <div style={styles.statIcon}>
                                <Activity size={24} />
                            </div>
                            <div style={styles.statValue}>{stats.capacityUtilization}%</div>
                            <div style={styles.statLabel}>Capacity Usage</div>
                        </div>
                    </div>
                </div>

                {/* Period Toggle */}
                <div style={styles.periodToggleStyles.container}>
                    <button
                        style={styles.periodToggleStyles.button(period === 'week', hoveredPeriod === 'week')}
                        onClick={() => setPeriod('week')}
                        onMouseEnter={() => setHoveredPeriod('week')}
                        onMouseLeave={() => setHoveredPeriod(null)}
                    >
                        This Week
                    </button>
                    <button
                        style={styles.periodToggleStyles.button(period === 'month', hoveredPeriod === 'month')}
                        onClick={() => setPeriod('month')}
                        onMouseEnter={() => setHoveredPeriod('month')}
                        onMouseLeave={() => setHoveredPeriod(null)}
                    >
                        This Month
                    </button>
                </div>

                {/* Personal Information Card */}
                <div
                    style={styles.card(hoveredCard === 'info')}
                    onMouseEnter={() => setHoveredCard('info')}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <div style={styles.cardGlow}></div>
                    <div style={styles.floatingIcon('#10b981')}>
                        <Building />
                    </div>

                    <div style={styles.sectionTitle}>
                        <Building size={24} />
                        Personal Information
                    </div>

                    <div style={styles.detailsGrid}>
                        <div
                            style={styles.detailItem(hoveredCard === 'detail-1')}
                            onMouseEnter={() => setHoveredCard('detail-1')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div style={styles.detailIcon}>
                                <Building size={20} />
                            </div>
                            <div style={styles.detailContent}>
                                <div style={styles.detailLabel}>Department</div>
                                <div style={styles.detailValue}>{userData.department || 'Not specified'}</div>
                            </div>
                        </div>

                        <div
                            style={styles.detailItem(hoveredCard === 'detail-2')}
                            onMouseEnter={() => setHoveredCard('detail-2')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div style={styles.detailIcon}>
                                <User size={20} />
                            </div>
                            <div style={styles.detailContent}>
                                <div style={styles.detailLabel}>Team</div>
                                <div style={styles.detailValue}>{userData.team || 'Not specified'}</div>
                            </div>
                        </div>

                        <div
                            style={styles.detailItem(hoveredCard === 'detail-3')}
                            onMouseEnter={() => setHoveredCard('detail-3')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div style={styles.detailIcon}>
                                <Phone size={20} />
                            </div>
                            <div style={styles.detailContent}>
                                <div style={styles.detailLabel}>Phone Number</div>
                                <div style={styles.detailValue}>{userData.phoneNumber || 'Not specified'}</div>
                            </div>
                        </div>

                        <div
                            style={styles.detailItem(hoveredCard === 'detail-4')}
                            onMouseEnter={() => setHoveredCard('detail-4')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div style={styles.detailIcon}>
                                <Calendar size={20} />
                            </div>
                            <div style={styles.detailContent}>
                                <div style={styles.detailLabel}>Date Joined</div>
                                <div style={styles.detailValue}>{formatDate(userData.dateJoined)}</div>
                            </div>
                        </div>

                        <div
                            style={styles.detailItem(hoveredCard === 'detail-5')}
                            onMouseEnter={() => setHoveredCard('detail-5')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div style={styles.detailIcon}>
                                <Briefcase size={20} />
                            </div>
                            <div style={styles.detailContent}>
                                <div style={styles.detailLabel}>Current Project</div>
                                <div style={styles.detailValue}>{userData.project || 'Not specified'}</div>
                            </div>
                        </div>

                        <div
                            style={styles.detailItem(hoveredCard === 'detail-6')}
                            onMouseEnter={() => setHoveredCard('detail-6')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div style={styles.detailIcon}>
                                <MapPin size={20} />
                            </div>
                            <div style={styles.detailContent}>
                                <div style={styles.detailLabel}>Location</div>
                                <div style={styles.detailValue}>Singapore</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProfilePage;