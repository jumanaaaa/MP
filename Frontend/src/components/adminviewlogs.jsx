import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, Calendar, FolderOpen, Activity, Clock, TrendingUp, Loader } from 'lucide-react';
import { apiFetch } from '../utils/api';
import Dropdown from '../components/Dropdown';

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
      return false;
    }
  });
  const [filterProject, setFilterProject] = useState('All Projects');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [actuals, setActuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    weeklyHours: 0,
    capacityUtilization: 0,
    projectHours: 0
  });
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    department: ''
  });

  const sectionToggleRef = useRef(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  // Fetch actuals data
  useEffect(() => {
    const fetchActuals = async () => {
      try {
        setLoading(true);
        const response = await apiFetch('/actuals', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch actuals');
        }
        
        const data = await response.json();
        setActuals(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching actuals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActuals();
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch('/user/profile', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, []);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiFetch('/actuals/stats', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

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

  // Helper function to assign colors to projects
  const getProjectColor = (project) => {
    const colors = {
      'JRET': '#3b82f6',
      'MaxCap': '#10b981',
      'Analytics': '#f59e0b',
      'Training': '#8b5cf6',
      'Research': '#ec4899',
      'Development': '#06b6d4',
      'default': '#64748b'
    };
    return colors[project] || colors.default;
  };

  // Helper function to get category icon color
  const getCategoryColor = (category) => {
    const colors = {
      'Project': '#3b82f6',
      'Admin': '#10b981',
      'Training': '#f59e0b',
      'Meeting': '#8b5cf6',
      'Leave': '#ef4444',
      'default': '#64748b'
    };
    return colors[category] || colors.default;
  };

  // Transform actuals to display format
  const transformedActuals = actuals.map(actual => ({
    id: actual.Id,
    date: new Date(actual.StartDate).toLocaleDateString('en-GB'),
    dateEnd: new Date(actual.EndDate).toLocaleDateString('en-GB'),
    project: actual.Project || actual.Category,
    projectColor: actual.Project ? getProjectColor(actual.Project) : getCategoryColor(actual.Category),
    category: actual.Category,
    hours: Number(actual.Hours) || 0,
    manDays: (parseFloat(actual.Hours) / 8).toFixed(2),
    createdAt: new Date(actual.CreatedAt).toLocaleString('en-GB')
  }));

  const projects = ['All Projects', ...new Set(transformedActuals.map(log => log.project).filter(Boolean))];
  const categories = ['All Categories', ...new Set(transformedActuals.map(log => log.category))];

  const filteredLogs = transformedActuals.filter(log => {
    return (filterProject === 'All Projects' || log.project === filterProject) &&
      (filterCategory === 'All Categories' || log.category === filterCategory);
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
    try {
      localStorage.setItem('darkMode', (!isDarkMode).toString());
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
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
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      
      .floating {
        animation: float 3s ease-in-out infinite;
      }
      
      .spinning {
        animation: spin 1s linear infinite;
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
      justifyContent: 'flex-start',
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
    categoryBadge: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
      padding: '4px 8px',
      borderRadius: '6px',
      marginLeft: 'auto'
    },
    dateInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '16px'
    },
    hoursDisplay: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      padding: '16px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '12px'
    },
    hoursItem: {
      textAlign: 'center',
      flex: 1
    },
    hoursLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    hoursValue: (color) => ({
      fontSize: '20px',
      fontWeight: '700',
      color: color || '#3b82f6'
    }),
    hoursDivider: {
      width: '1px',
      height: '30px',
      backgroundColor: isDarkMode ? '#6b7280' : '#d1d5db',
      margin: '0 16px'
    },
    createdInfo: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: isDarkMode ? '#4b556350' : '#f8fafc50',
      borderRadius: '8px',
      borderLeft: `3px solid ${isDarkMode ? '#6b7280' : '#d1d5db'}`
    },
    createdLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    createdText: {
      fontSize: '13px',
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
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: '20px'
    },
    loadingText: {
      fontSize: '18px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    errorContainer: {
      backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
      color: isDarkMode ? '#fca5a5' : '#991b1b',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '20px',
      border: isDarkMode ? '1px solid #991b1b' : '1px solid #fca5a5'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    emptyStateIcon: {
      marginBottom: '16px',
      opacity: 0.5
    },
    emptyStateText: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '8px'
    },
    emptyStateSubtext: {
      fontSize: '14px',
      opacity: 0.8
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingContainer}>
          <Loader size={48} className="spinning" style={{ color: '#3b82f6' }} />
          <div style={styles.loadingText}>Loading actuals data...</div>
        </div>
      </div>
    );
  }

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
                  <div style={styles.avatar}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}` 
                      : '??'}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : 'Loading...'}
                    </div>
                    <div style={styles.userRole}>
                      {user.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` : 'User'} • {user.department || 'Loading...'}
                    </div>
                  </div>
                </div>
                <div style={styles.userStats}>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>{stats.totalHours || 0}</div>
                    <div style={styles.tooltipStatLabel}>Hours</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {stats.projectHours > 0 ? Math.ceil(stats.projectHours / 40) : 0}
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

      {/* Error Display */}
      {error && (
        <div style={styles.errorContainer}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Project:</label>
          <Dropdown
  value={filterProject}
  onChange={(value) => setFilterProject(value)}
  options={projects}
  placeholder="Select project..."
  isDarkMode={isDarkMode}
  searchable={projects.length > 5}
  compact={true}
/>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Category:</label>
          <Dropdown
  value={filterCategory}
  onChange={(value) => setFilterCategory(value)}
  options={categories}
  placeholder="Select category..."
  isDarkMode={isDarkMode}
  searchable={categories.length > 5}
  compact={true}
/>
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
          style={styles.statCard('#10b981', hoveredCard === 'hours')}
          onMouseEnter={() => setHoveredCard('hours')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <Clock size={24} />
          </div>
          <div style={styles.statLabel}>Total Hours</div>
          <div style={styles.statValue}>
            {filteredLogs.reduce((sum, log) => sum + (log.hours || 0), 0).toFixed(1)}
          </div>
        </div>
        <div 
          style={styles.statCard('#f59e0b', hoveredCard === 'mandays')}
          onMouseEnter={() => setHoveredCard('mandays')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div style={styles.statLabel}>Total Man-Days</div>
          <div style={styles.statValue}>
            {(filteredLogs.reduce((sum, log) => sum + (log.hours || 0), 0) / 8).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>
            <FolderOpen size={64} />
          </div>
          <div style={styles.emptyStateText}>No logs found</div>
          <div style={styles.emptyStateSubtext}>
            {actuals.length === 0 
              ? 'Start tracking your actuals to see them here'
              : 'Try adjusting your filters'}
          </div>
        </div>
      )}

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
            </div>

            {/* Project/Category Info */}
            <div style={styles.projectInfo}>
              <div style={styles.projectBadge(log.projectColor)}></div>
              <div style={styles.projectName}>{log.project}</div>
              <div style={styles.categoryBadge}>{log.category}</div>
            </div>

            {/* Date Range */}
            <div style={styles.dateInfo}>
              <Calendar size={14} />
              {log.date === log.dateEnd ? log.date : `${log.date} - ${log.dateEnd}`}
            </div>

            {/* Hours Display */}
            <div style={styles.hoursDisplay}>
              <div style={styles.hoursItem}>
                <div style={styles.hoursLabel}>Hours</div>
                <div style={styles.hoursValue('#3b82f6')}>{log.hours.toFixed(1)}</div>
              </div>
              <div style={styles.hoursDivider}></div>
              <div style={styles.hoursItem}>
                <div style={styles.hoursLabel}>Man-Days</div>
                <div style={styles.hoursValue('#10b981')}>{log.manDays}</div>
              </div>
            </div>

            {/* Created At */}
            <div style={styles.createdInfo}>
              <div style={styles.createdLabel}>
                <Clock size={14} />
                Created
              </div>
              <div style={styles.createdText}>{log.createdAt}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminViewLogs;