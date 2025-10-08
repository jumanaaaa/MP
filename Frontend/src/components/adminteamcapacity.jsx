import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User } from 'lucide-react';

const AdminTeamCapacity = () => {
  const [projectFilter, setProjectFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [section, setSection] = useState('team');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  
  // Enhanced refs for better cleanup and tracking
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);
  const sectionToggleRef = useRef(null);
  
  // Debug state changes
  useEffect(() => {
    console.log('🔄 AdminTeamCapacity - isSectionOpen state changed to:', isSectionOpen);
  }, [isSectionOpen]);
  
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  // Enhanced background handling with better cleanup and fallbacks
  useEffect(() => {
    // Store original body styles
    if (!originalBodyStyleRef.current) {
      originalBodyStyleRef.current = {
        background: document.body.style.background,
        margin: document.body.style.margin,
        padding: document.body.style.padding
      };
    }

    // Remove any existing injected styles
    if (injectedStyleRef.current) {
      document.head.removeChild(injectedStyleRef.current);
    }

    // Create new style element
    const pageStyle = document.createElement('style');
    pageStyle.setAttribute('data-component', 'admin-team-capacity-background');
    
    const backgroundGradient = isDarkMode 
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      /* More specific targeting to avoid conflicts */
      .admin-team-capacity-page {
        min-height: 100vh;
        background: ${backgroundGradient};
      }
      
      /* Target common parent containers more carefully */
      body {
        background: ${backgroundGradient} !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Only target direct children of common containers */
      #root > div:first-child,
      .app > div:first-child,
      .main-content,
      .page-container {
        background: transparent !important;
        min-height: 100vh;
      }
      
      /* Fallback for nested containers */
      div[style*="background: white"],
      div[style*="background-color: white"],
      div[style*="background: #fff"],
      div[style*="background-color: #fff"] {
        background: transparent !important;
      }
      
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
      
      /* Smooth transitions for theme changes */
      * {
        transition: background-color 0.3s ease, background 0.3s ease;
      }
    `;
    
    document.head.appendChild(pageStyle);
    injectedStyleRef.current = pageStyle;

    return () => {
      // Enhanced cleanup
      if (injectedStyleRef.current && document.head.contains(injectedStyleRef.current)) {
        document.head.removeChild(injectedStyleRef.current);
        injectedStyleRef.current = null;
      }
      
      // Restore original body styles if this was the last instance
      if (originalBodyStyleRef.current) {
        const existingStyles = document.querySelectorAll('[data-component="admin-team-capacity-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (sectionToggleRef.current && isSectionOpen) {
      const rect = sectionToggleRef.current.getBoundingClientRect();
      setSectionDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isSectionOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sectionToggleRef.current && !sectionToggleRef.current.contains(event.target)) {
        setIsSectionOpen(false);
      }
    };

    if (isSectionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSectionOpen]);

  // Sample data - would come from backend
  const teamData = [
    { name: 'Jumana', utilization: 82, project: 'JRET', team: 'Engineering' },
    { name: 'Kai', utilization: 85, project: 'MaxCap', team: 'Engineering' },
    { name: 'Alisha', utilization: 80, project: 'JRET', team: 'Design' },
    { name: 'Jia Rong', utilization: 75, project: 'Analytics', team: 'Data' },
    { name: 'Zac', utilization: 78, project: 'MaxCap', team: 'Engineering' },
    { name: 'Tze Hui', utilization: 78, project: 'JRET', team: 'QA' },
    { name: 'Justin', utilization: 76, project: 'Analytics', team: 'Data' }
  ];

  const projects = ['all', ...new Set(teamData.map(emp => emp.project))];
  const teams = ['all', ...new Set(teamData.map(emp => emp.team))];

  const filteredData = teamData.filter(emp => {
    return (projectFilter === 'all' || emp.project === projectFilter) &&
           (teamFilter === 'all' || emp.team === teamFilter);
  });

  const totalHours = 400;
  const assignedHours = 360;
  const assignedPercentage = Math.round((assignedHours / totalHours) * 100);
  const availableCapacity = ((totalHours - assignedHours) / totalHours * 100).toFixed(1);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const handleSectionChange = (newSection) => {
    console.log('🔍 AdminTeamCapacity - handleSectionChange called with:', newSection);
    setSection(newSection);
    setIsSectionOpen(false);
    
    // Use window.location for navigation
    if (newSection === 'personal') {
      console.log('🚀 AdminTeamCapacity - Navigating to personal dashboard');
      console.log('🌐 Current location before navigation:', window.location.href);
      window.location.href = '/admindashboard';
    } else if (newSection === 'utilization') {
      console.log('🚀 AdminTeamCapacity - Navigating to utilization page');
      window.location.href = '/adminutilization';
    } else {
      console.log('📍 AdminTeamCapacity - Staying on current page for section:', newSection);
    }
  };

  const getSectionTitle = () => {
    switch(section) {
      case 'personal':
        return 'Welcome back, Hasan!';
      case 'team':
        return 'Team Capacity Summary';
      case 'utilization':
        return 'Utilization Overview';
      default:
        return 'Team Capacity Summary';
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '30px',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      overflowY: 'auto',
      fontFamily: '"Montserrat", sans-serif',
      position: 'relative',
      transition: 'all 0.3s ease'
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '32px',
      position: 'relative'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    header: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    },
    toggleViewContainer: {
      fontSize: '18px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      userSelect: 'none',
      padding: '8px 0',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    chevron: (isOpen, isHovered) => ({
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isOpen || isHovered ? 'rotate(-90deg) scale(1.1)' : 'rotate(0deg) scale(1)',
      color: isOpen || isHovered ? '#3b82f6' : isDarkMode ? '#94a3b8' : '#64748b'
    }),
    sectionOverlay: {
      position: 'fixed',
      top: sectionDropdownPosition.top,
      left: sectionDropdownPosition.left,
      zIndex: 999,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      padding: '12px 0',
      minWidth: '220px',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
      animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transition: 'all 0.3s ease'
    },
    blurOption: (isHovered) => ({
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      padding: '14px 20px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '8px',
      margin: '0 8px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
      borderLeft: isHovered ? '3px solid #3b82f6' : '3px solid transparent',
      pointerEvents: 'auto',
      userSelect: 'none'
    }),
    statsRow: {
      display: 'flex',
      gap: '24px',
      marginBottom: '32px',
      flexWrap: 'wrap'
    },
    statCard: (bgColor, isHovered) => ({
      flex: 1,
      minWidth: '200px',
      background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)`,
      borderRadius: '20px',
      padding: '24px',
      color: '#fff',
      boxShadow: isHovered ? '0 12px 24px rgba(0,0,0,0.15)' : '0 6px 16px rgba(0,0,0,0.1)',
      transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(10px)'
    }),
    statLabel: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '8px',
      opacity: 0.9
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '800',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    mainContent: {
      display: 'flex',
      gap: '32px',
      flexWrap: 'wrap'
    },
    tableSection: {
      flex: '2',
      minWidth: '400px'
    },
    chartSection: {
      flex: '1',
      minWidth: '300px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    filtersContainer: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    filterLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transition: 'all 0.3s ease'
    },
    filterSelect: {
      padding: '8px 12px',
      borderRadius: '8px',
      border: isDarkMode ? '2px solid rgba(75,85,99,0.3)' : '2px solid rgba(226,232,240,0.5)',
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '120px',
      backdropFilter: 'blur(10px)'
    },
    employeeTable: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(30,41,59,0.95)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.1)'
    },
    tableHeader: {
      backgroundColor: isDarkMode ? 'rgba(75,85,99,0.9)' : 'rgba(51,65,85,0.9)',
      padding: '20px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    tableHeaderText: {
      color: '#fff',
      fontSize: '18px',
      fontWeight: '700'
    },
    tableBody: {
      padding: '8px 0'
    },
    employeeRow: (isHovered) => ({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      transition: 'all 0.2s ease',
      backgroundColor: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
      borderLeft: isHovered ? '4px solid #3b82f6' : '4px solid transparent',
      cursor: 'pointer'
    }),
    employeeName: {
      color: isDarkMode ? '#e2e8f0' : '#f1f5f9',
      fontSize: '16px',
      fontWeight: '500',
      flex: 1,
      transition: 'all 0.3s ease'
    },
    utilizationPercent: (utilization) => ({
      color: utilization >= 85 ? '#f59e0b' : utilization >= 80 ? '#10b981' : '#64748b',
      fontSize: '16px',
      fontWeight: '700'
    }),
    pieChart: {
      width: '200px',
      height: '200px',
      borderRadius: '50%',
      background: `conic-gradient(${isDarkMode ? '#4b5563' : '#1e293b'} 0deg ${assignedPercentage * 3.6}deg, ${isDarkMode ? '#6b7280' : '#e5e7eb'} ${assignedPercentage * 3.6}deg 360deg)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginBottom: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease'
    },
    pieChartInner: {
      width: '140px',
      height: '140px',
      borderRadius: '50%',
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.95)' : 'rgba(255,255,255,0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    pieChartLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      transition: 'all 0.3s ease'
    },
    pieChartValue: {
      fontSize: '24px',
      fontWeight: '800',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      transition: 'all 0.3s ease'
    },
    capacityInfo: {
      textAlign: 'center'
    },
    freePercentage: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#10b981',
      marginBottom: '8px'
    },
    capacityText: {
      fontSize: '16px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
      lineHeight: '1.4',
      transition: 'all 0.3s ease'
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
    avatar: {
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
    }
  };

  return (
    <div className="admin-team-capacity-page" style={styles.page}>
      {/* Header with Dropdown */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <div
            ref={sectionToggleRef}
            style={styles.toggleViewContainer}
            onClick={() => {
              console.log('🖱️ AdminTeamCapacity - Header dropdown clicked, current state:', isSectionOpen);
              setIsSectionOpen((prev) => !prev);
            }}
            onMouseEnter={() => setIsSectionHovered(true)}
            onMouseLeave={() => setIsSectionHovered(false)}
            className="floating"
          >
            <span style={styles.header}>{getSectionTitle()}</span>
            <ChevronDown style={styles.chevron(isSectionOpen, isSectionHovered)} size={20} />
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Alerts Button */}
          <button
            style={styles.topButton(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => {
              console.log('🔔 Alerts clicked - Navigating to alerts page');
              window.location.href = '/adminalerts';
            }}
          >
            <Bell size={20} />
            <div style={styles.notificationBadge}></div>
          </button>

          {/* Profile Button */}
          <div style={{ position: 'relative' }}>
            <button
              style={styles.topButton(hoveredCard === 'profile')}
              onMouseEnter={() => {
                setHoveredCard('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => {
                setHoveredCard(null);
                // Don't immediately hide tooltip - let the tooltip's own mouse events handle it
              }}
              onClick={() => {
                console.log('👤 Profile clicked - Navigating to profile page');
                window.location.href = '/adminprofile';
              }}
            >
              <User size={20} />
            </button>

            {/* Profile Tooltip */}
            {showProfileTooltip && (
              <div 
                style={styles.profileTooltip}
                onMouseEnter={() => {
                  setShowProfileTooltip(true);
                }}
                onMouseLeave={() => {
                  setShowProfileTooltip(false);
                }}
              >
                <div style={styles.tooltipArrow}></div>
                <div style={styles.userInfo}>
                  <div style={styles.avatar}>HK</div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>Hasan Kamal</div>
                    <div style={styles.userRole}>Admin • Engineering Lead</div>
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
                  onClick={toggleTheme}
                >
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Dropdown */}
      {isSectionOpen && (
        <div 
          style={styles.sectionOverlay}
          onMouseDown={(e) => {
            console.log('🛡️ AdminTeamCapacity - Dropdown container mousedown');
            e.stopPropagation();
          }}
          onClick={(e) => {
            console.log('🛡️ AdminTeamCapacity - Dropdown container click');
            e.stopPropagation();
          }}
        >
          <div>
            {console.log('🎨 AdminTeamCapacity - Dropdown menu is rendering')}
            {['personal', 'team', 'utilization'].map((sectionKey, idx) => (
              <div 
                key={sectionKey}
                style={styles.blurOption(hoveredCard === `section-${idx}`)} 
                onClick={(e) => {
                  console.log('🖱️ AdminTeamCapacity - Dropdown option clicked:', sectionKey);
                  console.log('🎯 Click event details:', e);
                  e.preventDefault();
                  e.stopPropagation();
                  handleSectionChange(sectionKey);
                }}
                onMouseDown={(e) => {
                  console.log('🖱️ AdminTeamCapacity - Dropdown option mousedown:', sectionKey);
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseEnter={() => {
                  console.log('🐭 AdminTeamCapacity - Mouse enter:', sectionKey);
                  setHoveredCard(`section-${idx}`);
                }}
                onMouseLeave={() => {
                  console.log('🐭 AdminTeamCapacity - Mouse leave:', sectionKey);
                  setHoveredCard(null);
                }}
              >
                {sectionKey === 'personal' ? 'Personal Dashboard' : 
                 sectionKey === 'team' ? 'Team Capacity' : 'Utilization Overview'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.statsRow}>
        <div 
          style={styles.statCard('#10b981', hoveredEmployee === 'available')}
          onMouseEnter={() => setHoveredEmployee('available')}
          onMouseLeave={() => setHoveredEmployee(null)}
        >
          <div style={styles.statLabel}>Available Hours:</div>
          <div style={styles.statValue}>400 hrs</div>
        </div>
        <div 
          style={styles.statCard('#f59e0b', hoveredEmployee === 'assigned')}
          onMouseEnter={() => setHoveredEmployee('assigned')}
          onMouseLeave={() => setHoveredEmployee(null)}
        >
          <div style={styles.statLabel}>Assigned hours:</div>
          <div style={styles.statValue}>360 Hrs</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Table Section */}
        <div style={styles.tableSection}>
          {/* Filters */}
          <div style={styles.filtersContainer}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Filter by Project:</label>
              <select 
                value={projectFilter} 
                onChange={(e) => setProjectFilter(e.target.value)}
                style={styles.filterSelect}
              >
                {projects.map(project => (
                  <option key={project} value={project}>
                    {project === 'all' ? 'All Projects' : project}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Filter by Team:</label>
              <select 
                value={teamFilter} 
                onChange={(e) => setTeamFilter(e.target.value)}
                style={styles.filterSelect}
              >
                {teams.map(team => (
                  <option key={team} value={team}>
                    {team === 'all' ? 'All Teams' : team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Employee Table */}
          <div style={styles.employeeTable}>
            <div style={styles.tableHeader}>
              <span style={styles.tableHeaderText}>Employee</span>
              <span style={styles.tableHeaderText}>Utilization(%)</span>
            </div>
            <div style={styles.tableBody}>
              {filteredData.map((employee, index) => (
                <div 
                  key={index}
                  style={styles.employeeRow(hoveredEmployee === `emp-${index}`)}
                  onMouseEnter={() => setHoveredEmployee(`emp-${index}`)}
                  onMouseLeave={() => setHoveredEmployee(null)}
                >
                  <span style={styles.employeeName}>{employee.name}</span>
                  <span style={styles.utilizationPercent(employee.utilization)}>
                    {employee.utilization}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div style={styles.chartSection}>
          <div style={styles.pieChart}>
            <div style={styles.pieChartInner}>
              <div style={styles.pieChartLabel}>Assigned</div>
              <div style={styles.pieChartValue}>90%</div>
            </div>
          </div>
          <div style={styles.capacityInfo}>
            <div style={styles.freePercentage}>Free 10%</div>
            <div style={styles.capacityText}>
              {availableCapacity}% of team Capacity<br/>
              is still available
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTeamCapacity;