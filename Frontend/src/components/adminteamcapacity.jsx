import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, RefreshCw, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import Dropdown from '../components/Dropdown';

const AdminTeamCapacity = () => {
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [section, setSection] = useState('team');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [period, setPeriod] = useState('week'); // 🆕 Week or Month toggle
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });
  const sectionToggleRef = useRef(null);

  // Data states
  const [teamData, setTeamData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [capacityMetrics, setCapacityMetrics] = useState({
    availableHours: 0,
    assignedHours: 0,
    assignedPercentage: 0,
    availableCapacity: 0
  });

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

  // 🆕 Fetch team capacity data based on period
  useEffect(() => {
    const fetchTeamCapacity = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`🔵 Fetching team capacity for ${period}...`);

        const response = await apiFetch(`/api/workload-status?period=${period}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch team capacity');
        }

        const data = await response.json();
        console.log('👥 Team data:', data);

        // ✅ Filter by current user's department only
        const filteredUsers = (data.users || []).filter(user =>
          userData && user.department === userData.department
        );

        const transformedData = filteredUsers.map(user => ({
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          utilization: user.utilizationPercentage || 0,
          project: user.projects?.[0]?.name || 'Not assigned',
          team: user.team || 'No team',
          department: user.department
        }));

        setTeamData(transformedData);

        // Calculate metrics only for filtered users
        const totalTarget = filteredUsers.reduce((sum, u) => sum + u.targetHours, 0);
        const totalActual = filteredUsers.reduce((sum, u) => sum + u.totalHours, 0);
        const assignedPerc = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
        const availablePerc = totalTarget > 0 ? ((totalTarget - totalActual) / totalTarget * 100).toFixed(1) : 0;

        setCapacityMetrics({
          availableHours: totalTarget,
          assignedHours: totalActual,
          assignedPercentage: assignedPerc,
          availableCapacity: availablePerc
        });

      } catch (err) {
        console.error('❌ Error fetching team capacity:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userData) {
      fetchTeamCapacity();
    }
  }, [period, userData]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiFetch('/user/profile', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Get unique projects and teams from data
  const projects = ['all', ...new Set(teamData.map(emp => emp.project).filter(Boolean))];
  const teams = ['all', ...new Set(teamData.map(emp => emp.team).filter(Boolean))];

  const filteredData = teamData.filter(emp => {
    return (projectFilter === 'All Projects' || emp.project === projectFilter) &&
      (teamFilter === 'All Teams' || emp.team === teamFilter);
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    try {
      localStorage.setItem('darkMode', (!isDarkMode).toString());
    } catch (error) {
      console.log('LocalStorage not available');
    }
    setShowProfileTooltip(false);
  };

  const handleSectionChange = (newSection) => {
    setSection(newSection);
    setIsSectionOpen(false);

    if (newSection === 'reports') {
      window.location.href = '/adminreports';
    } else if (newSection === 'utilization') {
      window.location.href = '/adminutilization';
    }
  };

  const getSectionTitle = () => {
    switch (section) {
      case 'reports':
        return 'Personal Reports';
      case 'team':
        return 'Team Capacity Summary';
      case 'utilization':
        return 'Utilization Overview';
      default:
        return 'Team Capacity Summary';
    }
  };

  const getAvatarInitials = (firstName, lastName) => {
    if (!firstName) return '?';
    if (!lastName || lastName.trim() === '') {
      return firstName[0].toUpperCase();
    }
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
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
    periodToggle: {
      display: 'flex',
      gap: '12px',
      padding: '8px',
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.6)' : 'rgba(255,255,255,0.6)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
      width: 'fit-content',
      marginBottom: '24px'
    },
    periodButton: (isActive) => ({
      padding: '8px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isActive
        ? '#3b82f6'
        : 'transparent',
      color: isActive ? '#fff' : (isDarkMode ? '#94a3b8' : '#64748b'),
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: isActive ? 'scale(1.05)' : 'scale(1)'
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
      background: `conic-gradient(${isDarkMode ? '#4b5563' : '#1e293b'} 0deg ${capacityMetrics.assignedPercentage * 3.6}deg, ${isDarkMode ? '#6b7280' : '#e5e7eb'} ${capacityMetrics.assignedPercentage * 3.6}deg 360deg)`,
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
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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
            <ChevronDown style={styles.chevron(isSectionOpen, isSectionHovered)} size={20} />
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            style={styles.topButton(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => window.location.href = '/adminalerts'}
          >
            <Bell size={20} />
            <div style={styles.notificationBadge}></div>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={styles.topButton(hoveredCard === 'profile')}
              onMouseEnter={() => {
                setHoveredCard('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => window.location.href = '/adminprofile'}
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
                  <div style={styles.avatar}>
                    {getAvatarInitials(userData.firstName, userData.lastName)}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {userData.firstName} {userData.lastName || ''}
                    </div>
                    <div style={styles.userRole}>
                      {userData.role === 'admin' ? 'Admin' : 'Member'} • {userData.department}
                    </div>
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
            {['reports', 'team', 'utilization'].map((sectionKey, idx) => (
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
                {sectionKey === 'reports' ? 'Personal Reports' :
                  sectionKey === 'team' ? 'Team Capacity' : 'Utilization Overview'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ef4444'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Period Toggle */}
      <div style={styles.periodToggle}>
        <button
          style={styles.periodButton(period === 'week')}
          onClick={() => setPeriod('week')}
        >
          Week
        </button>
        <button
          style={styles.periodButton(period === 'month')}
          onClick={() => setPeriod('month')}
        >
          Month
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsRow}>
        <div
          style={styles.statCard('#10b981', hoveredEmployee === 'available')}
          onMouseEnter={() => setHoveredEmployee('available')}
          onMouseLeave={() => setHoveredEmployee(null)}
        >
          <div style={styles.statLabel}>Available Hours:</div>
          <div style={styles.statValue}>
            {loading ? '...' : `${capacityMetrics.availableHours.toFixed(0)}h`}
          </div>
        </div>
        <div
          style={styles.statCard('#f59e0b', hoveredEmployee === 'assigned')}
          onMouseEnter={() => setHoveredEmployee('assigned')}
          onMouseLeave={() => setHoveredEmployee(null)}
        >
          <div style={styles.statLabel}>Assigned Hours:</div>
          <div style={styles.statValue}>
            {loading ? '...' : `${capacityMetrics.assignedHours.toFixed(0)}h`}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          color: isDarkMode ? '#94a3b8' : '#64748b'
        }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={styles.mainContent}>
          {/* Table Section */}
          <div style={styles.tableSection}>
            {/* Filters */}
            {/* Filters */}
            <div style={styles.filtersContainer}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Filter by Project:</label>
                <Dropdown
                  value={projectFilter}
                  onChange={(value) => setProjectFilter(value)}
                  options={['All Projects', ...projects.filter(p => p !== 'all')]}
                  placeholder="Select project..."
                  isDarkMode={isDarkMode}
                  searchable={false}
                  compact={true}
                />
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Filter by Team (within {userData?.department}):</label>
                <Dropdown
                  value={teamFilter}
                  onChange={(value) => setTeamFilter(value)}
                  options={['All Teams', ...teams.filter(t => t !== 'all')]}
                  placeholder="Select team..."
                  isDarkMode={isDarkMode}
                  searchable={false}
                  compact={true}
                />
              </div>
            </div>

            {/* Employee Table */}
            <div style={styles.employeeTable}>
              <div style={styles.tableHeader}>
                <span style={styles.tableHeaderText}>Employee</span>
                <span style={styles.tableHeaderText}>Utilization (%)</span>
              </div>
              <div style={styles.tableBody}>
                {filteredData.length > 0 ? (
                  filteredData.map((employee, index) => (
                    <div
                      key={index}
                      style={styles.employeeRow(hoveredEmployee === `emp-${index}`)}
                      onMouseEnter={() => setHoveredEmployee(`emp-${index}`)}
                      onMouseLeave={() => setHoveredEmployee(null)}
                    >
                      <span style={styles.employeeName}>{employee.name}</span>
                      <span style={styles.utilizationPercent(employee.utilization)}>
                        {employee.utilization}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}>
                    No team members found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div style={styles.chartSection}>
            <div style={styles.pieChart}>
              <div style={styles.pieChartInner}>
                <div style={styles.pieChartLabel}>Assigned</div>
                <div style={styles.pieChartValue}>{capacityMetrics.assignedPercentage}%</div>
              </div>
            </div>
            <div style={styles.capacityInfo}>
              <div style={styles.freePercentage}>Free {capacityMetrics.availableCapacity}%</div>
              <div style={styles.capacityText}>
                {capacityMetrics.availableCapacity}% of team capacity<br />
                is still available
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeamCapacity;