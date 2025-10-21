import React, { useState, useEffect } from 'react';
import {
    User, Mail, Building, Calendar, Shield, ArrowLeft, Bell
} from 'lucide-react';

const AdminProfilePage = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [hoveredButton, setHoveredButton] = useState(null);
    const [showProfileTooltip, setShowProfileTooltip] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch user profile data from backend
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetch('http://localhost:3000/user/profile', {
                    method: 'GET',
                    credentials: 'include', // Include cookies for authentication
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        // Redirect to login if unauthorized
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error('Failed to fetch user profile');
                }

                const data = await response.json();
                
                // Fetch full user details using the ID
                const detailsResponse = await fetch(`http://localhost:3000/users/${data.id}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (detailsResponse.ok) {
                    const fullData = await detailsResponse.json();
                    setUserData(fullData);
                } else {
                    // If detailed fetch fails, use basic data
                    setUserData({
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
                    });
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

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const styles = {
        page: {
            minHeight: '100vh',
            padding: '30px',
            background: isDarkMode
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontFamily: '"Montserrat", sans-serif',
            transition: 'all 0.3s ease'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
        },
        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        },
        backButton: {
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
            color: isDarkMode ? '#e2e8f0' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
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
        profileCard: {
            backgroundColor: isDarkMode ? '#374151' : '#fff',
            borderRadius: '24px',
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
            backdropFilter: 'blur(20px)',
            maxWidth: '600px',
            margin: '0 auto',
            position: 'relative',
            overflow: 'hidden'
        },
        profileGlow: {
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)',
            pointerEvents: 'none'
        },
        profileHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '32px',
            paddingBottom: '24px',
            borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
        },
        largeAvatar: {
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '700',
            fontSize: '28px',
            boxShadow: '0 8px 25px rgba(59,130,246,0.3)'
        },
        profileName: {
            fontSize: '28px',
            fontWeight: '700',
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            marginBottom: '4px'
        },
        profileEmail: {
            fontSize: '16px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            marginBottom: '8px'
        },
        roleChip: {
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
        },
        detailsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px'
        },
        detailItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
            transition: 'all 0.3s ease'
        },
        detailIcon: {
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59,130,246,0.1)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
            marginBottom: '4px'
        },
        detailValue: {
            fontSize: '16px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b'
        },
        loadingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            fontSize: '18px',
            color: isDarkMode ? '#e2e8f0' : '#64748b'
        },
        errorContainer: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
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
        }
    };

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
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
            
            .floating {
                animation: float 3s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.loadingContainer}>
                    Loading profile...
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
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button
                        style={styles.backButton}
                        onClick={() => window.history.back()}
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
                                        <div style={styles.tooltipStatNumber}>32</div>
                                        <div style={styles.tooltipStatLabel}>Hours</div>
                                    </div>
                                    <div style={styles.tooltipStatItem}>
                                        <div style={styles.tooltipStatNumber}>3</div>
                                        <div style={styles.tooltipStatLabel}>Projects</div>
                                    </div>
                                    <div style={styles.tooltipStatItem}>
                                        <div style={styles.tooltipStatNumber}>80%</div>
                                        <div style={styles.tooltipStatLabel}>Capacity</div>
                                    </div>
                                </div>
                                <button
                                    style={styles.themeToggle}
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                >
                                    {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={styles.profileCard}>
                <div style={styles.profileGlow}></div>

                <div style={styles.profileHeader}>
                    <div style={styles.largeAvatar}>
                        {userData.firstName?.[0]}{userData.lastName?.[0]}
                    </div>
                    <div>
                        <div style={styles.profileName}>
                            {userData.firstName} {userData.lastName}
                        </div>
                        <div style={styles.profileEmail}>
                            {userData.email}
                        </div>
                        <div style={styles.roleChip}>
                            <Shield size={14} />
                            {userData.role === 'admin' ? 'Administrator' : 'Member'}
                        </div>
                    </div>
                </div>

                <div style={styles.detailsGrid}>
                    <div style={styles.detailItem}>
                        <div style={styles.detailIcon}>
                            <Building size={20} />
                        </div>
                        <div style={styles.detailContent}>
                            <div style={styles.detailLabel}>Department</div>
                            <div style={styles.detailValue}>{userData.department || 'Not specified'}</div>
                        </div>
                    </div>

                    <div style={styles.detailItem}>
                        <div style={styles.detailIcon}>
                            <User size={20} />
                        </div>
                        <div style={styles.detailContent}>
                            <div style={styles.detailLabel}>Team</div>
                            <div style={styles.detailValue}>{userData.team || 'Not specified'}</div>
                        </div>
                    </div>

                    <div style={styles.detailItem}>
                        <div style={styles.detailIcon}>
                            <Mail size={20} />
                        </div>
                        <div style={styles.detailContent}>
                            <div style={styles.detailLabel}>Phone</div>
                            <div style={styles.detailValue}>{userData.phoneNumber || 'Not specified'}</div>
                        </div>
                    </div>

                    <div style={styles.detailItem}>
                        <div style={styles.detailIcon}>
                            <Calendar size={20} />
                        </div>
                        <div style={styles.detailContent}>
                            <div style={styles.detailLabel}>Date Joined</div>
                            <div style={styles.detailValue}>{formatDate(userData.dateJoined)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProfilePage;