import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, Trash2, Edit, Calendar, FolderOpen, Activity, Clock, MessageSquare, TrendingUp } from 'lucide-react';

const AdminViewLogs = () => {
  const [section, setSection] = useState('view-logs');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  const [filterProject, setFilterProject] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');

  const sectionToggleRef = useRef(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  useEffect(() => {
    if (sectionToggleRef.current && isSectionOpen) {
      const rect = sectionToggleRef.current.getBoundingClientRect();
      setSectionDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isSectionOpen]);

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

  // Enhanced logs data with more realistic content
  const logsData = [
    {
      id: 1,
      date: '1/4/2025',
      project: 'JRET',
      projectColor: '#3b82f6',
      activityType: 'Meeting',
      expectedManDays: 0.125,
      actualManDays: 0.25,
      remarks: 'Initial project kickoff meeting with stakeholders',
      status: 'over',
      priority: 'high'
    },
    {
      id: 2,
      date: '2/4/2025',
      project: 'MaxCap',
      projectColor: '#10b981',
      activityType: 'Development',
      expectedManDays: 1.0,
      actualManDays: 0.75,
      remarks: 'Completed core functionality ahead of schedule',
      status: 'under',
      priority: 'medium'
    },
    {
      id: 3,
      date: '3/4/2025',
      project: 'Analytics',
      projectColor: '#f59e0b',
      activityType: 'Testing',
      expectedManDays: 0.5,
      actualManDays: 0.6,
      remarks: 'Found minor UI issues that needed additional testing',
      status: 'over',
      priority: 'low'
    },
    {
      id: 4,
      date: '4/4/2025',
      project: 'JRET',
      projectColor: '#3b82f6',
      activityType: 'Documentation',
      expectedManDays: 0.25,
      actualManDays: 0.3,
      remarks: 'Added comprehensive API documentation and user guides',
      status: 'over',
      priority: 'medium'
    },
    {
      id: 5,
      date: '5/4/2025',
      project: 'MaxCap',
      projectColor: '#10b981',
      activityType: 'Planning',
      expectedManDays: 0.5,
      actualManDays: 0.5,
      remarks: 'Sprint planning session completed as scheduled',
      status: 'on-track',
      priority: 'high'
    },
    {
      id: 6,
      date: '6/4/2025',
      project: 'Analytics',
      projectColor: '#f59e0b',
      activityType: 'Development',
      expectedManDays: 1.5,
      actualManDays: 1.2,
      remarks: 'Optimized database queries for better performance',
      status: 'under',
      priority: 'high'
    }
  ];

  const projects = ['all', ...new Set(logsData.map(log => log.project))];
  const activities = ['all', ...new Set(logsData.map(log => log.activityType))];

  const filteredLogs = logsData.filter(log => {
    return (filterProject === 'all' || log.project === filterProject) &&
           (filterActivity === 'all' || log.activityType === filterActivity);
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const handleSectionChange = (newSection) => {
    setSection(newSection);
    setIsSectionOpen(false);
    
    if (newSection === 'actuals') {
      window.location.href = '/adminactuals';
    }
  };

  const getSectionTitle = () => {
    return section === 'actuals' ? 'Actuals' : 'Logs';
  };

  const handleEdit = (id) => {
    console.log('Edit log entry:', id);
  };

  const handleDelete = (id) => {
    console.log('Delete log entry:', id);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'over': return '#ef4444';
      case 'under': return '#10b981';
      case 'on-track': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'over': return 'Over Estimate';
      case 'under': return 'Under Estimate';
      case 'on-track': return 'On Track';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
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
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }
      
      .floating {
        animation: float 3s ease-in-out infinite;
      }
      
      .priority-pulse {
        animation: pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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
      marginBottom: '40px',
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
      fontSize: '32px',
      fontWeight: '800',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    },
    toggleViewContainer: {
      fontSize: '20px',
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
    filtersContainer: {
      display: 'flex',
      gap: '20px',
      marginBottom: '32px',
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
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e2e8f0',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '150px',
      outline: 'none'
    },
    statsRow: {
      display: 'flex',
      gap: '20px',
      marginBottom: '32px',
      flexWrap: 'wrap'
    },
    statCard: (color, isHovered) => ({
      flex: '1',
      minWidth: '200px',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: isHovered ? '0 12px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)',
      transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)',
      borderLeft: `4px solid ${color}`
    }),
    statIcon: {
      marginBottom: '12px',
      color: '#3b82f6'
    },
    statLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '800',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    logsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
      gap: '24px'
    },
    logCard: (isHovered) => ({
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: isHovered ? '0 12px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)',
      transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)',
      position: 'relative',
      overflow: 'hidden'
    }),
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    cardNumber: {
      fontSize: '12px',
      fontWeight: '700',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
      padding: '4px 8px',
      borderRadius: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    cardActions: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: (isHovered, color) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? `${color}20` : 'transparent',
      color: color,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    projectInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    },
    projectBadge: (color) => ({
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0
    }),
    projectName: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    activityType: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    dateInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '16px'
    },
    timeComparison: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      padding: '16px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '12px'
    },
    timeItem: {
      textAlign: 'center',
      flex: 1
    },
    timeLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    timeValue: (color) => ({
      fontSize: '16px',
      fontWeight: '700',
      color: color || (isDarkMode ? '#e2e8f0' : '#1e293b')
    }),
    timeDivider: {
      width: '1px',
      height: '30px',
      backgroundColor: isDarkMode ? '#6b7280' : '#d1d5db',
      margin: '0 16px'
    },
    statusBadge: (status) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: `${getStatusColor(status)}20`,
      color: getStatusColor(status),
      border: `1px solid ${getStatusColor(status)}40`
    }),
    priorityDot: (priority) => ({
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: getPriorityColor(priority),
      className: priority === 'high' ? 'priority-pulse' : ''
    }),
    remarksSection: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: isDarkMode ? '#4b556350' : '#f8fafc50',
      borderRadius: '8px',
      borderLeft: `3px solid ${isDarkMode ? '#6b7280' : '#d1d5db'}`
    },
    remarksLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    remarksText: {
      fontSize: '14px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      lineHeight: '1.4'
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
    <div style={styles.page}>
      {/* Header with Dropdown */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <div
            ref={sectionToggleRef}
            style={styles.toggleViewContainer}
            onClick={() => setIsSectionOpen((prev) => !prev)}
            onMouseEnter={() => setIsSectionHovered(true)}
            onMouseLeave={() => setIsSectionHovered(false)}
            className="floating"
          >
            <span style={styles.header}>{getSectionTitle()}</span>
            <ChevronDown style={styles.chevron(isSectionOpen, isSectionHovered)} size={22} />
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Alerts Button */}
          <button
            style={styles.topButton(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => window.location.href = '/adminalerts'}
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
              }}
              onClick={() => window.location.href = '/adminprofile'}
            >
              <User size={20} />
            </button>

            {/* Profile Tooltip */}
            {showProfileTooltip && (
              <div 
                style={styles.profileTooltip}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
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
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {['actuals', 'view-logs'].map((sectionKey, idx) => (
              <div 
                key={sectionKey}
                style={styles.blurOption(hoveredCard === `section-${idx}`)} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSectionChange(sectionKey);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseEnter={() => setHoveredCard(`section-${idx}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {sectionKey === 'actuals' ? 'Actuals' : 'View Logs'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Project:</label>
          <select 
            value={filterProject} 
            onChange={(e) => setFilterProject(e.target.value)}
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
          <label style={styles.filterLabel}>Filter by Activity:</label>
          <select 
            value={filterActivity} 
            onChange={(e) => setFilterActivity(e.target.value)}
            style={styles.filterSelect}
          >
            {activities.map(activity => (
              <option key={activity} value={activity}>
                {activity === 'all' ? 'All Activities' : activity}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={styles.statsRow}>
        <div 
          style={styles.statCard('#3b82f6', hoveredCard === 'total')}
          onMouseEnter={() => setHoveredCard('total')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <Activity size={24} />
          </div>
          <div style={styles.statLabel}>Total Entries</div>
          <div style={styles.statValue}>{filteredLogs.length}</div>
        </div>
        <div 
          style={styles.statCard('#10b981', hoveredCard === 'under')}
          onMouseEnter={() => setHoveredCard('under')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div style={styles.statLabel}>Under Estimate</div>
          <div style={styles.statValue}>{filteredLogs.filter(log => log.status === 'under').length}</div>
        </div>
        <div 
          style={styles.statCard('#ef4444', hoveredCard === 'over')}
          onMouseEnter={() => setHoveredCard('over')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <Clock size={24} />
          </div>
          <div style={styles.statLabel}>Over Estimate</div>
          <div style={styles.statValue}>{filteredLogs.filter(log => log.status === 'over').length}</div>
        </div>
      </div>

      {/* Logs Grid */}
      <div style={styles.logsGrid}>
        {filteredLogs.map((log, index) => (
          <div
            key={log.id}
            style={styles.logCard(hoveredRow === index)}
            onMouseEnter={() => setHoveredRow(index)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            {/* Card Header */}
            <div style={styles.cardHeader}>
              <div style={styles.cardNumber}>#{log.id}</div>
              <div style={styles.cardActions}>
                <button
                  style={styles.actionButton(hoveredCard === `edit-${index}`, '#3b82f6')}
                  onMouseEnter={() => setHoveredCard(`edit-${index}`)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleEdit(log.id)}
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  style={styles.actionButton(hoveredCard === `delete-${index}`, '#ef4444')}
                  onMouseEnter={() => setHoveredCard(`delete-${index}`)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleDelete(log.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Project Info */}
            <div style={styles.projectInfo}>
              <div style={styles.projectBadge(log.projectColor)}></div>
              <div style={styles.projectName}>{log.project}</div>
              <div 
                style={styles.priorityDot(log.priority)}
                className={log.priority === 'high' ? 'priority-pulse' : ''}
              ></div>
            </div>

            {/* Activity Type */}
            <div style={styles.activityType}>
              <FolderOpen size={16} />
              {log.activityType}
            </div>

            {/* Date */}
            <div style={styles.dateInfo}>
              <Calendar size={14} />
              {log.date}
            </div>

            {/* Time Comparison */}
            <div style={styles.timeComparison}>
              <div style={styles.timeItem}>
                <div style={styles.timeLabel}>Expected</div>
                <div style={styles.timeValue()}>{log.expectedManDays} days</div>
              </div>
              <div style={styles.timeDivider}></div>
              <div style={styles.timeItem}>
                <div style={styles.timeLabel}>Actual</div>
                <div style={styles.timeValue(getStatusColor(log.status))}>{log.actualManDays} days</div>
              </div>
              <div style={styles.timeDivider}></div>
              <div style={styles.timeItem}>
                <div style={styles.statusBadge(log.status)}>
                  {getStatusText(log.status)}
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div style={styles.remarksSection}>
              <div style={styles.remarksLabel}>
                <MessageSquare size={14} />
                Remarks
              </div>
              <div style={styles.remarksText}>{log.remarks}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminViewLogs;