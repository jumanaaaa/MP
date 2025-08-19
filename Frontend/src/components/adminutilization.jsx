import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User } from 'lucide-react';

const AdminUtilization = () => {
  const [section, setSection] = useState('utilization');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const utilizationData = [
    { day: 'Mon', value: 75 },
    { day: 'Tue', value: 88 },
    { day: 'Wed', value: 78 },
    { day: 'Thu', value: 92 },
    { day: 'Fri', value: 70 },
    { day: 'Sat', value: 0 },
    { day: 'Sun', value: 0 }
  ];

  const employeeData = [
    { name: 'Jumana', utilization: 82, project: 'JRET', team: 'Engineering' },
    { name: 'Kai', utilization: 85, project: 'MaxCap', team: 'Engineering' },
    { name: 'Alisha', utilization: 80, project: 'JRET', team: 'Design' },
    { name: 'Jia Rong', utilization: 75, project: 'Analytics', team: 'Data' },
    { name: 'Zac', utilization: 78, project: 'MaxCap', team: 'Engineering' },
    { name: 'Tze Hui', utilization: 78, project: 'JRET', team: 'QA' },
    { name: 'Justin', utilization: 76, project: 'Analytics', team: 'Data' }
  ];

  const projects = ['all', ...new Set(employeeData.map(emp => emp.project))];
  const teams = ['all', ...new Set(employeeData.map(emp => emp.team))];

  const filteredEmployeeData = employeeData.filter(emp => {
    return (projectFilter === 'all' || emp.project === projectFilter) &&
           (teamFilter === 'all' || emp.team === teamFilter);
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const handleSectionChange = (newSection) => {
    setSection(newSection);
    setIsSectionOpen(false);
    
    if (newSection === 'personal') {
      window.location.href = '/admindashboard';
    } else if (newSection === 'team') {
      window.location.href = '/adminteamcapacity';
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
        return 'Utilization Overview';
    }
  };

  const createChartPath = () => {
    const width = 100;
    const height = 100;
    const points = utilizationData.map((data, index) => {
      const x = (index / (utilizationData.length - 1)) * width;
      const y = height - (data.value / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
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
    chartSection: {
      flex: '1',
      minWidth: '400px'
    },
    chartTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '24px',
      transition: 'all 0.3s ease'
    },
    chartContainer: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      height: '300px',
      position: 'relative',
      transition: 'all 0.3s ease'
    },
    chart: {
      width: '100%',
      height: '100%',
      position: 'relative'
    },
    chartGrid: {
      position: 'absolute',
      top: '0',
      left: '60px',
      right: '20px',
      bottom: '40px',
      borderLeft: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
      borderBottom: isDarkMode ? '2px solid #4b5563' : '2px solid #e5e7eb',
      transition: 'all 0.3s ease'
    },
    yAxisLabels: {
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '40px',
      width: '50px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
    },
    xAxisLabels: {
      position: 'absolute',
      bottom: '0',
      left: '60px',
      right: '20px',
      height: '30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
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
              onMouseLeave={() => {
                setHoveredCard(null);
              }}
              onClick={() => window.location.href = '/adminprofile'}
            >
              <User size={20} />
            </button>

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

      {isSectionOpen && (
        <div 
          style={styles.sectionOverlay}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {['personal', 'team', 'utilization'].map((sectionKey, idx) => (
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
                {sectionKey === 'personal' ? 'Personal Dashboard' : 
                 sectionKey === 'team' ? 'Team Capacity' : 'Utilization Overview'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.mainContent}>
        <div 
          style={styles.avgUtilizationCard}
          onMouseEnter={() => setHoveredCard('avg-util')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.avgUtilizationLabel}>Average Utilization</div>
          <div style={styles.avgUtilizationValue}>78%</div>
        </div>

        <div style={styles.chartSection}>
          <div style={styles.chartTitle}>Utilization by Day</div>
          <div style={styles.chartContainer}>
            <div style={styles.chart}>
              <div style={styles.yAxisLabels}>
                <div>100%</div>
                <div>80%</div>
                <div>60%</div>
                <div>40%</div>
                <div>20%</div>
              </div>

              <div style={styles.chartGrid}>
                {[20, 40, 60, 80].map(percent => (
                  <div 
                    key={percent} 
                    style={{
                      position: 'absolute',
                      left: '0',
                      right: '0',
                      top: `${100 - percent}%`,
                      height: '1px',
                      backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
                      transition: 'all 0.3s ease'
                    }} 
                  />
                ))}
                
                <svg style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%'
                }}>
                  <path
                    d={createChartPath()}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      transform: 'scale(0.85, 0.8) translate(8%, 10%)'
                    }}
                  />
                  {utilizationData.map((data, index) => {
                    const x = (index / (utilizationData.length - 1)) * 85 + 8;
                    const y = 90 - (data.value / 100) * 80;
                    return (
                      <circle
                        key={index}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="4"
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
              </div>

              <div style={styles.xAxisLabels}>
                {utilizationData.map((data, index) => (
                  <div key={index}>{data.day}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <span style={styles.tableHeaderText}>Utilization(%)</span>
          </div>
          <div style={styles.tableBody}>
            {filteredEmployeeData.map((employee, index) => (
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
    </div>
  );
};

export default AdminUtilization;