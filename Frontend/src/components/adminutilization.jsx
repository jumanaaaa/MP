import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, RefreshCw, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

const AdminUtilization = () => {
  const [section, setSection] = useState('utilization');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
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

  const sectionToggleRef = useRef(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  // Data states
  const [employeeData, setEmployeeData] = useState([]);
  const [averageUtilization, setAverageUtilization] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

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

  // 🆕 Fetch utilization data based on period
  useEffect(() => {
    const fetchUtilizationData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`🔵 Fetching utilization data for ${period}...`);

        // Fetch team workload status with period parameter
        const teamResponse = await apiFetch(`/api/workload-status?period=${period}`,
          { credentials: 'include' }
        );

        if (!teamResponse.ok) {
          throw new Error('Failed to fetch team data');
        }

        const teamData = await teamResponse.json();
        console.log('👥 Team workload data:', teamData);
        console.log('👥 Users array:', teamData.users);

        // Transform data for display - FIXED: Use utilizationPercentage
        const transformedEmployees = (teamData.users || []).map(user => {
          console.log('📝 Processing user:', user);
          return {
            name: `${user.firstName} ${user.lastName || ''}`.trim(),
            utilization: user.utilizationPercentage || 0,
            project: user.project || 'Various',
            team: user.department || 'Unknown'
          };
        });

        console.log('✅ Transformed employees:', transformedEmployees);
        setEmployeeData(transformedEmployees);

        // Calculate average utilization
        const avgUtil = transformedEmployees.length > 0
          ? Math.round(transformedEmployees.reduce((sum, emp) => sum + emp.utilization, 0) / transformedEmployees.length)
          : 0;
        
        setAverageUtilization(avgUtil);

      } catch (err) {
        console.error('❌ Error fetching utilization data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUtilizationData();
  }, [period]); // Re-fetch when period changes

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

  const projects = ['all', ...new Set(employeeData.map(emp => emp.project))];
  const teams = ['all', ...new Set(employeeData.map(emp => emp.team))];

  const filteredEmployeeData = employeeData.filter(emp => {
    return (projectFilter === 'all' || emp.project === projectFilter) &&
           (teamFilter === 'all' || emp.team === teamFilter);
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
    } else if (newSection === 'team') {
      window.location.href = '/adminteamcapacity';
    }
  };

  const getSectionTitle = () => {
    switch(section) {
      case 'reports':
        return 'Personal Reports';
      case 'team':
        return 'Team Capacity Summary';
      case 'utilization':
        return 'Utilization Overview';
      default:
        return 'Utilization Overview';
    }
  };

  const getAvatarInitials = (firstName, lastName) => {
    if (!firstName) return '?';
    if (!lastName || lastName.trim() === '') {
      return firstName[0].toUpperCase();
    }
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
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
    mainContent: {
      display: 'flex',
      gap: '32px',
      marginBottom: '32px',
      flexWrap: 'wrap'
    },
    avgUtilizationCard: {
      flex: '0 0 300px',
      backgroundColor: isDarkMode ? '#374151' : '#1e293b',
      borderRadius: '20px',
      padding: '32px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    avgUtilizationLabel: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      opacity: 0.9
    },
    avgUtilizationValue: {
      fontSize: '48px',
      fontWeight: '800',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    periodToggleContainer: {
      flex: '1',
      minWidth: '400px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    periodToggle: {
      display: 'flex',
      gap: '12px',
      padding: '8px',
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.6)' : 'rgba(255,255,255,0.6)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
      width: 'fit-content'
    },
    periodButton: (isActive) => ({
      padding: '8px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isActive 
        ? (isDarkMode ? '#3b82f6' : '#3b82f6')
        : 'transparent',
      color: isActive ? '#fff' : (isDarkMode ? '#94a3b8' : '#64748b'),
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: isActive ? 'scale(1.05)' : 'scale(1)'
    }),
    summaryText: {
      fontSize: '16px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px'
    },
    employeeTable: {
      backgroundColor: isDarkMode ? '#374151' : '#1e293b',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease'
    },
    tableHeader: {
      backgroundColor: isDarkMode ? '#4b5563' : '#334155',
      padding: '20px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.3s ease'
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
      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '120px'
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
        <>
          {/* Summary Section with Period Toggle */}
          <div style={styles.mainContent}>
            <div 
              style={styles.avgUtilizationCard}
              onMouseEnter={() => setHoveredCard('avg-util')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.avgUtilizationLabel}>Average Utilization</div>
              <div style={styles.avgUtilizationValue}>{averageUtilization}%</div>
            </div>

            <div style={styles.periodToggleContainer}>
              <div style={styles.summaryText}>
                Team utilization for this {period === 'week' ? 'week' : 'month'}
              </div>
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
            </div>
          </div>

          {/* Employee Table */}
          <div>
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

            <div style={styles.employeeTable}>
              <div style={styles.tableHeader}>
                <span style={styles.tableHeaderText}>Employee</span>
                <span style={styles.tableHeaderText}>Utilization (%)</span>
              </div>
              <div style={styles.tableBody}>
                {filteredEmployeeData.length > 0 ? (
                  filteredEmployeeData.map((employee, index) => (
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
        </>
      )}
    </div>
  );
};

export default AdminUtilization;