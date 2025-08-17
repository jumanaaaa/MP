import React, { useState, useEffect } from 'react';
import { CirclePlus, LayoutDashboard, Menu, LogOut, Calendar, BarChart3, Users } from 'lucide-react';
import { useSidebar } from '../context/sidebarcontext';

const Sidebar = () => {
    const { collapsed, toggleSidebar } = useSidebar();

    const [hoveredItem, setHoveredItem] = useState(null);
    const [showTooltip, setShowTooltip] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [currentPath, setCurrentPath] = useState(window.location.pathname);

    // Track current path for active states
    useEffect(() => {
        const handleLocationChange = () => {
            setCurrentPath(window.location.pathname);
        };
        
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    // Fetch user data to determine role
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/user/profile', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setUserData(data);
                } else {
                    // Fallback for development
                    setUserData({
                        firstName: 'Test',
                        lastName: 'Admin',
                        role: 'admin',
                        email: 'admin@example.com',
                        department: 'Engineering'
                    });
                }
            } catch (error) {
                // Fallback for development
                setUserData({
                    firstName: 'Test',
                    lastName: 'Admin',
                    role: 'admin',
                    email: 'admin@example.com',
                    department: 'Engineering'
                });
            }
        };

        fetchUserData();
    }, []);

    // All navigation items
    const allNavItems = [
        { label: 'Home', icon: <LayoutDashboard size={22} />, path: '/admindashboard', roles: ['admin', 'member'] },
        { label: 'Actuals', icon: <CirclePlus size={22} />, path: '/adminactuals', roles: ['admin', 'member'] },
        { label: 'Plan', icon: <Calendar size={22} />, path: '/adminviewplan', roles: ['admin', 'member'] },
        { label: 'Reports', icon: <BarChart3 size={22} />, path: '/adminreports', roles: ['admin', 'member'] },
        { label: 'Users', icon: <Users size={22} />, path: '/users', roles: ['admin'] }, // Only admins
    ];

    // Filter navigation items based on user role
    const navItems = userData ? allNavItems.filter(item => item.roles.includes(userData.role)) : allNavItems;

    // Handle navigation
    const handleNavigation = (path, event) => {
        if (!isLoggingOut) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            setShowTooltip(null);
            setHoveredItem(null);
            
            // Force save current state as backup
            try {
                localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
            } catch (error) {
                console.error('Error saving sidebar state:', error);
            }
            
            setTimeout(() => {
                window.location.href = path;
            }, 50);
        }
    };

    // Handle logout with proper token clearing
    const handleLogout = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        setIsLoggingOut(true);
        setShowTooltip(null);

        try {
            const response = await fetch('http://localhost:3000/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn('Server logout failed, but proceeding with client logout');
            }

            // Only clear auth-related localStorage, preserve sidebar state
            // If you have specific auth keys, clear them here instead
            // localStorage.removeItem('authToken');
            
            window.location.href = '/';
            
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/';
        } finally {
            setIsLoggingOut(false);
        }
    };

    const styles = {
        sidebar: {
            height: '100vh',
            width: collapsed ? '80px' : '220px',
            backgroundColor: '#1e293b',
            color: 'white',
            transition: 'width 0.3s ease',
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
            boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)'
        },
        logoContainer: {
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '0px',
            paddingBottom: '0px'
        },
        logo: {
            height: collapsed ? '48px' : '56px',
            transition: 'height 0.3s ease',
            filter: 'brightness(1.1)'
        },
        logoText: {
            fontSize: '12px',
            fontWeight: 'bold',
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 0.3s ease'
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
            transition: 'all 0.2s ease'
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
            transition: 'all 0.2s ease',
            position: 'relative',
            border: 'none',
            cursor: 'pointer'
        },
        activeItem: {
            backgroundColor: '#334155',
            borderLeft: '4px solid #3b82f6',
            marginLeft: collapsed ? '12px' : '8px',
            paddingLeft: collapsed ? '8px' : '12px'
        },
        hoverItem: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            transform: 'translateX(2px)'
        },
        navContainer: {
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            paddingTop: '8px'
        },
        logoutContainer: {
            width: '100%',
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch'
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
            transition: 'all 0.2s ease',
            position: 'relative',
            border: 'none',
            cursor: isLoggingOut ? 'not-allowed' : 'pointer'
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
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            pointerEvents: 'none'
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
            minWidth: '22px'
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
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            marginTop: '12px',
            marginBottom: '16px',
            marginLeft: '12px',
            marginRight: '12px'
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
        <div style={styles.sidebar}>
            <div style={styles.logoContainer}>
                <img src="/images/maxcap.png" alt="Logo" style={styles.logo} />
                {!collapsed && <div style={styles.logoText}>MAXCAP</div>}
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

            <div style={styles.navContainer}>
                {navItems.map((item, idx) => {
                    const isActive = currentPath === item.path;
                    const isHovered = hoveredItem === idx;
                    
                    return (
                        <div key={idx} style={{ position: 'relative' }}>
                            <button
                                onClick={(event) => handleNavigation(item.path, event)}
                                style={{
                                    ...styles.navItem,
                                    ...(isActive ? styles.activeItem : {}),
                                    ...(isHovered && !isActive ? styles.hoverItem : {}),
                                    pointerEvents: isLoggingOut ? 'none' : 'auto',
                                    opacity: isLoggingOut ? 0.5 : 1
                                }}
                                onMouseEnter={() => handleMouseEnter(idx, item.label)}
                                onMouseLeave={handleMouseLeave}
                                disabled={isLoggingOut}
                            >
                                <div style={styles.iconContainer}>
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
                    <div style={styles.iconContainer}>
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