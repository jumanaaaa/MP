import React, { useState, useEffect } from 'react';
import { CirclePlus, LayoutDashboard, Menu, LogOut, Calendar, BarChart3, Users, VenetianMask } from 'lucide-react';
import { useSidebar } from '../context/sidebarcontext';
import { apiFetch } from '../utils/api';

const Sidebar = () => {
    const { collapsed, toggleSidebar } = useSidebar();

    const [hoveredItem, setHoveredItem] = useState(null);
    const [showTooltip, setShowTooltip] = useState(null);
    const [userData, setUserData] = useState({
        firstName: '',
        lastName: '',
        role: 'member',
        email: '',
        department: ''
    });
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    const [isNavigating, setIsNavigating] = useState(false);

    // Generate floating particles
    const particles = React.useMemo(() => {
        return Array.from({ length: 8 }).map((_, i) => ({
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 10,
            duration: 15 + Math.random() * 10,
            size: 2 + Math.random() * 3
        }));
    }, []);

    const [playIntro, setPlayIntro] = useState(false);

    useEffect(() => {
        const hasPlayed = sessionStorage.getItem('sidebarIntroPlayed');

        if (!hasPlayed) {
            setPlayIntro(true);
            sessionStorage.setItem('sidebarIntroPlayed', 'true');
        }
    }, []);


    // Track current path for active states
    useEffect(() => {
        const handleLocationChange = () => {
            setCurrentPath(window.location.pathname);
        };

        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    // Fetch user data to determine role (needed for both navigation AND tooltip)
    useEffect(() => {
        const abortController = new AbortController();
        let isMounted = true;

        const fetchUserData = async () => {
            setIsLoadingUser(true);
            try {
                const response = await apiFetch('/user/profile', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: abortController.signal
                });

                if (response.ok) {
                    const data = await response.json();
                    if (isMounted) {
                        setUserData(data);
                    }
                } else {
                    if (isMounted) {
                        setUserData({
                            firstName: 'User',
                            lastName: '',
                            role: 'member',
                            email: '',
                            department: 'General'
                        });
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('Fetch aborted - component unmounted');
                    return;
                }
                console.error('Error fetching user data:', error);
                if (isMounted) {
                    setUserData({
                        firstName: 'User',
                        lastName: '',
                        role: 'member',
                        email: '',
                        department: 'General'
                    });
                }
            } finally {
                if (isMounted) {
                    setIsLoadingUser(false);
                }
            }
        };

        fetchUserData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    const allNavItems = [
        { label: 'Home', icon: <LayoutDashboard size={22} />, path: '/admindashboard', roles: ['admin', 'member'] },
        { label: 'Actuals', icon: <CirclePlus size={22} />, path: '/adminactuals', roles: ['admin', 'member'] },
        { label: 'Plan', icon: <Calendar size={22} />, path: '/adminviewplan', roles: ['admin', 'member'] },
        { label: 'Reports', icon: <BarChart3 size={22} />, path: '/adminreports', roles: ['admin', 'member'] },
        { label: 'Users', icon: <Users size={22} />, path: '/users', roles: ['admin'] },
        {
            label: 'Resources',
            icon: <VenetianMask size={22} />,
            path: '/secret',
            roles: ['admin'],
            allowedEmails: ['muhammad.hasan@ihrp.sg', 'jumana.haseen@ihrp.sg']
        },
    ];

    const navItems = allNavItems.filter(item => {
        const hasRole = item.roles.includes(userData.role);
        const hasEmailAccess = !item.allowedEmails || item.allowedEmails.includes(userData.email);
        return hasRole && hasEmailAccess;
    });

    const handleNavigation = (path, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Prevent navigation if already navigating or logging out or still loading
        if (isNavigating || isLoggingOut || isLoadingUser) {
            console.log('Navigation blocked - already in progress');
            return;
        }

        setIsNavigating(true);
        setShowTooltip(null);
        setHoveredItem(null);

        try {
            localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
        } catch (error) {
            console.error('Error saving sidebar state:', error);
        }

        // Add small delay to ensure state is saved
        setTimeout(() => {
            window.location.href = path;
        }, 100);
    };

    const handleLogout = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Prevent double-logout
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);
        setShowTooltip(null);

        try {
            // Add timeout to logout request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await apiFetch('/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn('Server logout failed, but proceeding with client logout');
            }

            // Clear local storage
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) {
                console.error('Failed to clear storage:', e);
            }

            window.location.href = '/';

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Logout request timed out, proceeding anyway');
            } else {
                console.error('Logout error:', error);
            }

            // Force logout regardless of error
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) {
                console.error('Failed to clear storage:', e);
            }

            window.location.href = '/';
        }
    };

    const styles = {
        sidebar: {
            height: '100vh',
            width: collapsed ? '80px' : '220px',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '16px',
            paddingBottom: '16px',
            paddingLeft: '0px',
            paddingRight: '0px',
            zIndex: 10,
            fontFamily: '"Montserrat", sans-serif',
            boxShadow: '2px 0 20px rgba(0, 0, 0, 0.15)',
            color: 'white',
            transition: 'width 0.3s ease'
        },
        animatedBg1: {
            position: 'absolute',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '-120px',
            left: '-120px',
            animation: playIntro
                ? 'sidebarFloat1 20s ease-in-out infinite'
                : 'none',
            pointerEvents: 'none',
            filter: 'blur(40px)'
        },
        animatedBg2: {
            position: 'absolute',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            bottom: '-100px',
            right: '-100px',
            animation: 'sidebarFloat2 22s ease-in-out infinite',
            pointerEvents: 'none',
            filter: 'blur(40px)'
        },
        animatedBg3: {
            position: 'absolute',
            width: '250px',
            height: '250px',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'sidebarFloat3 25s ease-in-out infinite',
            pointerEvents: 'none',
            filter: 'blur(40px)'
        },
        // Gradient overlay that animates
        gradientOverlay: {
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
            animation: 'gradientMove 8s ease-in-out infinite',
            pointerEvents: 'none'
        },
        // Floating particles
        particlesContainer: {
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden'
        },
        particle: (particle) => ({
            position: 'absolute',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            top: `${particle.top}%`,
            left: `${particle.left}%`,
            animation: `floatParticle ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
        }),
        logoContainer: {
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            paddingLeft: '16px',
            paddingRight: '16px',
            position: 'relative',
            zIndex: 2,
            animation: playIntro ? 'slideInDown 0.6s ease-out' : 'none'
        },
        logoWrapper: {
            position: 'relative',
            animation: 'logoFloat 4s ease-in-out infinite',
            marginTop: '12px'
        },
        logoGlow: {
            position: 'absolute',
            inset: '-10px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'pulse 3s ease-in-out infinite',
            filter: 'blur(20px)',
            zIndex: -1
        },
        logo: {
            height: collapsed ? '48px' : '56px',
            transition: 'height 0.3s ease, filter 0.3s ease',
            filter: 'brightness(1.1) drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3))',
            position: 'relative',
            zIndex: 1
        },
        logoText: {
            fontSize: '13px',
            fontWeight: 'bold',
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 0.3s ease',
            background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 3s ease-in-out infinite',
            marginTop: '4px'
        },
        toggleButton: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            marginBottom: '24px',
            paddingTop: '8px',
            paddingBottom: '8px',
            paddingLeft: '8px',
            paddingRight: '8px',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            position: 'relative',
            zIndex: 2,
            animation: 'fadeIn 0.8s ease-out 0.2s both',
            backdropFilter: 'blur(10px)'
        },
        navItem: {
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? '4px' : '16px',
            width: collapsed ? '56px' : 'calc(100% - 24px)',
            paddingTop: collapsed ? '12px' : '14px',
            paddingBottom: collapsed ? '12px' : '14px',
            paddingLeft: collapsed ? '8px' : '16px',
            paddingRight: collapsed ? '8px' : '16px',
            borderRadius: '12px',
            textDecoration: 'none',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '6px',
            marginTop: '0px',
            marginLeft: '12px',
            marginRight: '12px',
            backgroundColor: 'transparent',
            flexDirection: collapsed ? 'column' : 'row',
            justifyContent: collapsed ? 'center' : 'flex-start',
            textAlign: collapsed ? 'center' : 'left',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            border: 'none',
            cursor: 'pointer',
            zIndex: 2,
            backdropFilter: 'blur(10px)'
        },
        activeItem: {
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderLeft: '4px solid #3b82f6',
            marginLeft: collapsed ? '12px' : '8px',
            paddingLeft: collapsed ? '8px' : '12px',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)'
        },
        hoverItem: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            transform: 'translateX(4px) scale(1.02)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        },
        navContainer: {
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            paddingTop: '8px',
            position: 'relative',
            zIndex: 2
        },
        logoutContainer: {
            width: '100%',
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            position: 'relative',
            zIndex: 2
        },
        logoutButton: (isLoggingOut) => ({
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? '4px' : '16px',
            width: collapsed ? '56px' : 'calc(100% - 24px)',
            paddingTop: collapsed ? '12px' : '14px',
            paddingBottom: collapsed ? '12px' : '14px',
            paddingLeft: collapsed ? '8px' : '16px',
            paddingRight: collapsed ? '8px' : '16px',
            borderRadius: '12px',
            textDecoration: 'none',
            color: isLoggingOut ? '#94a3b8' : '#ef4444',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '6px',
            marginTop: '0px',
            marginLeft: '12px',
            marginRight: '12px',
            backgroundColor: 'transparent',
            flexDirection: collapsed ? 'column' : 'row',
            justifyContent: collapsed ? 'center' : 'flex-start',
            textAlign: collapsed ? 'center' : 'left',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            border: 'none',
            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
            backdropFilter: 'blur(10px)'
        }),
        tooltip: {
            position: 'absolute',
            left: '72px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: '#374151',
            color: 'white',
            paddingTop: '8px',
            paddingBottom: '8px',
            paddingLeft: '12px',
            paddingRight: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            opacity: showTooltip ? 1 : 0,
            visibility: showTooltip ? 'visible' : 'hidden',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)'
        },
        tooltipArrow: {
            position: 'absolute',
            left: '-4px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderRight: '4px solid #374151',
            pointerEvents: 'none'
        },
        iconContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '22px',
            transition: 'transform 0.3s ease'
        },
        labelText: {
            marginTop: collapsed ? '4px' : '0px',
            fontSize: collapsed ? '10px' : '14px',
            lineHeight: '1.2',
            opacity: collapsed ? 0.9 : 1,
            transition: 'all 0.3s ease'
        },
        sectionDivider: {
            width: 'calc(100% - 24px)',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            marginTop: '12px',
            marginBottom: '16px',
            marginLeft: '12px',
            marginRight: '12px',
            animation: 'shimmerLine 3s ease-in-out infinite'
        },
        loadingSpinner: {
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            borderTopColor: '#ef4444',
            animation: 'spin 1s linear infinite',
            marginRight: collapsed ? '0' : '8px'
        }
    };

    const handleMouseEnter = (index, label) => {
        if (!isLoggingOut) {
            setHoveredItem(index);
            if (collapsed) {
                setTimeout(() => {
                    setShowTooltip(label);
                }, 100);
            }
        }
    };

    const handleMouseLeave = () => {
        if (!isLoggingOut) {
            setHoveredItem(null);
            setShowTooltip(null);
        }
    };

    React.useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes sidebarFloat1 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(40px, -50px) scale(1.15); }
                66% { transform: translate(-30px, 40px) scale(0.95); }
            }
            
            @keyframes sidebarFloat2 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(-40px, 50px) scale(1.2); }
                66% { transform: translate(35px, -35px) scale(0.9); }
            }
            
            @keyframes sidebarFloat3 {
                0%, 100% { transform: translate(-50%, 0) scale(1); }
                50% { transform: translate(-50%, 30px) scale(1.25); }
            }
            
            @keyframes gradientMove {
                0%, 100% { transform: translateY(0); opacity: 0.3; }
                50% { transform: translateY(20%); opacity: 0.6; }
            }
            
            @keyframes floatParticle {
                0%, 100% { 
                    transform: translateY(0) translateX(0); 
                    opacity: 0.2; 
                }
                25% { 
                    transform: translateY(-30px) translateX(10px); 
                    opacity: 0.5; 
                }
                50% { 
                    transform: translateY(-50px) translateX(-10px); 
                    opacity: 0.8; 
                }
                75% { 
                    transform: translateY(-30px) translateX(15px); 
                    opacity: 0.5; 
                }
            }
            
            @keyframes logoFloat {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-3px) rotate(1deg); }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.1); }
            }
            
            @keyframes shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            
            @keyframes shimmerLine {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 1; }
            }
            
            @keyframes slideInDown {
                0% { 
                    transform: translateY(-20px); 
                    opacity: 0; 
                }
                100% { 
                    transform: translateY(0); 
                    opacity: 1; 
                }
            }
            
            @keyframes fadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
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
        <div style={styles.sidebar}>
            {/* Animated background blobs */}
            <div style={styles.animatedBg1}></div>
            <div style={styles.animatedBg2}></div>
            <div style={styles.animatedBg3}></div>

            {/* Gradient overlay */}
            <div style={styles.gradientOverlay}></div>

            {/* Floating particles */}
            <div style={styles.particlesContainer}>
                {particles.map((particle, i) => (
                    <div key={i} style={styles.particle(particle)}></div>
                ))}
            </div>

            <div style={styles.logoContainer}>
                <div style={styles.logoWrapper}>
                    <div style={styles.logoGlow}></div>
                    <img src="/images/maxcap.png" alt="Logo" style={styles.logo} />
                    {!collapsed && <div style={styles.logoText}>MAXCAP</div>}
                </div>
            </div>

            <button
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setShowTooltip(null);
                    toggleSidebar();
                }}
                style={{
                    ...styles.toggleButton,
                    backgroundColor: hoveredItem === 'toggle' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={() => setHoveredItem('toggle')}
                onMouseLeave={() => setHoveredItem(null)}
                disabled={isLoggingOut}
            >
                <Menu size={20} />
            </button>
            {!isLoadingUser && (
                <div style={styles.navContainer}>
                    {navItems.map((item, idx) => {
                        const isActive =
                            (item.path === '/adminviewplan' && (
                                currentPath === '/adminviewplan' ||
                                currentPath === '/adminindividualplan' ||
                                currentPath === '/adminapprovals' ||
                                currentPath === '/adminaddplan' ||
                                currentPath === '/admineditplan' ||
                                currentPath === '/adminaddindividualplan' ||
                                currentPath === '/admineditindividualplan'
                            )) ||
                            (item.path === '/adminreports' && (
                                currentPath === '/adminreports' ||
                                currentPath === '/adminteamcapacity' ||
                                currentPath === '/adminutilization'
                            )) ||
                            (item.path === '/users' && (
                                currentPath === '/users' ||
                                currentPath === '/addusers'
                            )) ||
                            (item.path === '/adminactuals' && (
                                currentPath === '/adminactuals' ||
                                currentPath === '/adminviewlogs'
                            )) ||
                            currentPath === item.path;
                        const isHovered = hoveredItem === idx;

                        return (
                            <div
                                key={idx}
                                style={{
                                    position: 'relative',
                                    animation: playIntro
                                        ? `fadeIn 0.5s ease-out ${idx * 0.1}s both`
                                        : 'none'
                                }}
                            >
                                <button
                                    onClick={(event) => handleNavigation(item.path, event)}
                                    style={{
                                        ...styles.navItem,
                                        ...(isActive ? styles.activeItem : {}),
                                        ...(isHovered && !isActive ? styles.hoverItem : {}),
                                        pointerEvents: (isLoggingOut || isNavigating || isLoadingUser) ? 'none' : 'auto',
                                        opacity: (isLoggingOut || isNavigating || isLoadingUser) ? 0.5 : 1,
                                        cursor: (isLoggingOut || isNavigating || isLoadingUser) ? 'not-allowed' : 'pointer'
                                    }}
                                    onMouseEnter={() => handleMouseEnter(idx, item.label)}
                                    onMouseLeave={handleMouseLeave}
                                    disabled={isLoggingOut || isNavigating || isLoadingUser}
                                >
                                    <div style={{
                                        ...styles.iconContainer,
                                        transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)'
                                    }}>
                                        {item.icon}
                                    </div>
                                    <span style={styles.labelText}>
                                        {item.label}
                                    </span>
                                </button>

                                {collapsed && showTooltip === item.label && (
                                    <div style={styles.tooltip}>
                                        <div style={styles.tooltipArrow}></div>
                                        {item.label}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div style={styles.sectionDivider}></div>
                </div>
            )}

            {isLoadingUser && (
                <div style={{
                    ...styles.navContainer,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5
                }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        Loading...
                    </div>
                </div>
            )}

            {isNavigating && (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(2px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }}>
        <div style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        }}>
            <div style={styles.loadingSpinner}></div>
            Navigating...
        </div>
    </div>
)}

            <div style={styles.logoutContainer}>
                <button
                    onClick={(event) => handleLogout(event)}
                    style={{
                        ...styles.logoutButton(isLoggingOut),
                        ...(hoveredItem === 'logout' && !isLoggingOut ? styles.hoverItem : {})
                    }}
                    onMouseEnter={() => handleMouseEnter('logout', 'Logout')}
                    onMouseLeave={handleMouseLeave}
                    disabled={isLoggingOut}
                >
                    <div style={{
                        ...styles.iconContainer,
                        transform: (hoveredItem === 'logout' && !isLoggingOut) ? 'scale(1.1) rotate(-5deg)' : 'scale(1) rotate(0deg)'
                    }}>
                        {isLoggingOut ? (
                            <div style={styles.loadingSpinner}></div>
                        ) : (
                            <LogOut size={22} />
                        )}
                    </div>
                    <span style={styles.labelText}>
                        {isLoggingOut ? (collapsed ? 'Wait...' : 'Logging out...') : 'Logout'}
                    </span>
                </button>

                {collapsed && showTooltip === 'Logout' && !isLoggingOut && (
                    <div style={{
                        ...styles.tooltip,
                        position: 'absolute',
                        bottom: '20px',
                        left: '72px',
                        top: 'auto',
                        transform: 'none',
                        pointerEvents: 'none'
                    }}>
                        <div style={styles.tooltipArrow}></div>
                        Logout
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;