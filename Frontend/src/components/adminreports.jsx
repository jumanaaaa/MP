import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Clock,
  Target,
  Activity,
  Users,
  Bell,
  User,
  ChevronDown,
  Info
} from 'lucide-react';

const AdminReports = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  const [selectedDateRange, setSelectedDateRange] = useState('Last 30 Days');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [isGenerating, setIsGenerating] = useState(false);

  // Sample data for capacity utilization
  const capacityData = [
    { month: 'Jan', planned: 160, actual: 152, efficiency: 95 },
    { month: 'Feb', planned: 168, actual: 165, efficiency: 98 },
    { month: 'Mar', planned: 160, actual: 148, efficiency: 92.5 },
    { month: 'Apr', planned: 172, actual: 178, efficiency: 103.5 },
    { month: 'May', planned: 164, actual: 159, efficiency: 97 },
    { month: 'Jun', planned: 160, actual: 162, efficiency: 101.2 }
  ];

  const projectData = [
    {
      project: 'JRET Implementation',
      activityType: 'Development',
      plannedHours: 120,
      spentHours: 118,
      efficiency: 98.3,
      status: 'On Track',
      team: ['HK', 'SC', 'ML', 'AR']
    },
    {
      project: 'Database Migration',
      activityType: 'Infrastructure',
      plannedHours: 80,
      spentHours: 92,
      efficiency: 115,
      status: 'Ahead of Schedule',
      team: ['HK', 'JW']
    },
    {
      project: 'Security Enhancement',
      activityType: 'Security',
      plannedHours: 60,
      spentHours: 55,
      efficiency: 91.7,
      status: 'Efficient',
      team: ['SC', 'AR']
    },
    {
      project: 'API Integration',
      activityType: 'Integration',
      plannedHours: 40,
      spentHours: 38,
      efficiency: 95,
      status: 'On Track',
      team: ['ML', 'HK']
    }
  ];

  const dateRanges = ['Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last 6 Months', 'This Year'];
  const projects = ['All Projects', 'JRET Implementation', 'Database Migration', 'Security Enhancement', 'API Integration'];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95 && efficiency <= 105) return '#10b981'; // Green
    if (efficiency >= 90 && efficiency < 95) return '#f59e0b'; // Orange
    if (efficiency > 105) return '#8b5cf6'; // Purple (ahead of schedule)
    return '#ef4444'; // Red (needs attention)
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Track': return '#10b981';
      case 'Ahead of Schedule': return '#8b5cf6';
      case 'Efficient': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const calculateOverallEfficiency = () => {
    const totalPlanned = projectData.reduce((sum, item) => sum + item.plannedHours, 0);
    const totalSpent = projectData.reduce((sum, item) => sum + item.spentHours, 0);
    return ((totalSpent / totalPlanned) * 100).toFixed(1);
  };

  const getButtonStyle = (isHovered) => ({
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
    justifyContent: 'center',
    position: 'relative'
  });

  const getCardStyle = (isHovered) => ({
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: isHovered
      ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.1)'
      : '0 8px 25px rgba(0,0,0,0.08)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden'
  });

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
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Add CSS to cover parent containers
  useEffect(() => {
    // Inject CSS to cover parent containers
    const pageStyle = document.createElement('style');
    pageStyle.textContent = `
    /* Target common parent container classes */
    body, html, #root, .app, .main-content, .page-container, .content-wrapper {
      background: ${isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%) !important'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important'};
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Target any div that might be the white container */
    body > div, #root > div, .app > div {
      background: transparent !important;
    }
    
    /* Your existing animations here */
    @keyframes modalSlideIn { /* ... */ }
    @keyframes slideIn { /* ... */ }
    @keyframes float { /* ... */ }
    .floating { /* ... */ }
  `;
    document.head.appendChild(pageStyle);

    return () => {
      // Cleanup when component unmounts
      document.head.removeChild(pageStyle);
    };
  }, [isDarkMode]); // Re-run when theme changes

  return (
    <div style={{
      minHeight: '100vh',
      padding: '30px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <BarChart3 size={32} style={{ color: '#3b82f6' }} />
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Personal Reports
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            style={getButtonStyle(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => window.location.href = '/adminalerts'}
          >
            <Bell size={20} />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              border: '2px solid #fff'
            }}></div>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={getButtonStyle(hoveredCard === 'profile')}
              onMouseEnter={() => {
                setHoveredCard('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => window.location.href = '/adminprofile'}
            >
              <User size={20} />
            </button>

            {showProfileTooltip && (
              <div
                style={{
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
                  animation: 'slideIn 0.2s ease-out'
                }}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
              >
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '16px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
                  transform: 'rotate(45deg)',
                  border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
                  borderBottom: 'none',
                  borderRight: 'none'
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
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
                  }}>HK</div>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isDarkMode ? '#e2e8f0' : '#1e293b'
                    }}>Hasan Kamal</div>
                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }}>Admin • Engineering Lead</div>
                  </div>
                </div>

                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    color: '#3b82f6',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                  onClick={toggleTheme}
                >
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }} />
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b'
          }}>Date Range:</span>
          <select
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
              backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
              color: isDarkMode ? '#e2e8f0' : '#1e293b',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '150px'
            }}
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
          >
            {dateRanges.map(range => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={20} style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }} />
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b'
          }}>Project:</span>
          <select
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
              backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
              color: isDarkMode ? '#e2e8f0' : '#1e293b',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '180px'
            }}
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>

        <button
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: isGenerating
              ? '#6b7280'
              : hoveredItem === 'generate'
                ? '#2563eb'
                : '#3b82f6',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            transform: hoveredItem === 'generate' && !isGenerating ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: hoveredItem === 'generate' && !isGenerating ? '0 8px 25px rgba(59,130,246,0.3)' : '0 4px 12px rgba(59,130,246,0.2)'
          }}
          onMouseEnter={() => !isGenerating && setHoveredItem('generate')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          <RefreshCw size={16} style={{
            animation: isGenerating ? 'spin 1s linear infinite' : 'none'
          }} />
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div
          style={getCardStyle(hoveredCard === 'stat1')}
          onMouseEnter={() => setHoveredCard('stat1')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16,185,129,0.1)',
              color: '#10b981',
              position: 'relative'
            }}>
              <Target size={24} />
              <div style={{ position: 'relative' }}>
                <Info
                  size={14}
                  style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-8px',
                    cursor: 'pointer',
                    opacity: 0.6
                  }}
                  onMouseEnter={() => setShowFormulaTooltip(true)}
                  onMouseLeave={() => setShowFormulaTooltip(false)}
                />
                {showFormulaTooltip && (
                  <div style={{
                    position: 'absolute',
                    bottom: '40px',
                    right: '-50px',
                    backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                    padding: '12px',
                    minWidth: '200px',
                    border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
                    zIndex: 1000,
                    animation: 'slideIn 0.2s ease-out'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isDarkMode ? '#e2e8f0' : '#1e293b',
                      marginBottom: '6px'
                    }}>Efficiency Formula:</div>
                    <div style={{
                      fontSize: '11px',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      fontFamily: 'monospace'
                    }}>
                      (Actual Hours / Planned Hours) × 100
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      marginTop: '6px',
                      fontStyle: 'italic'
                    }}>
                      Optimal: 95-105%
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '24px',
                fontWeight: '800',
                color: isDarkMode ? '#e2e8f0' : '#1e293b'
              }}>{calculateOverallEfficiency()}%</div>
              <div style={{
                fontSize: '14px',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>Overall Efficiency</div>
            </div>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(parseFloat(calculateOverallEfficiency()), 100)}%`,
              height: '100%',
              backgroundColor: getEfficiencyColor(parseFloat(calculateOverallEfficiency())),
              borderRadius: '3px',
              transition: 'width 0.8s ease'
            }}></div>
          </div>
        </div>

        <div
          style={getCardStyle(hoveredCard === 'stat2')}
          onMouseEnter={() => setHoveredCard('stat2')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59,130,246,0.1)',
              color: '#3b82f6'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{
                fontSize: '24px',
                fontWeight: '800',
                color: isDarkMode ? '#e2e8f0' : '#1e293b'
              }}>{projectData.reduce((sum, item) => sum + item.plannedHours, 0)}</div>
              <div style={{
                fontSize: '14px',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>Total Planned Hours</div>
            </div>
          </div>
        </div>

        <div
          style={getCardStyle(hoveredCard === 'stat3')}
          onMouseEnter={() => setHoveredCard('stat3')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245,158,11,0.1)',
              color: '#f59e0b'
            }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{
                fontSize: '24px',
                fontWeight: '800',
                color: isDarkMode ? '#e2e8f0' : '#1e293b'
              }}>{projectData.reduce((sum, item) => sum + item.spentHours, 0)}</div>
              <div style={{
                fontSize: '14px',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>Total Actual Hours</div>
            </div>
          </div>
        </div>

        <div
          style={getCardStyle(hoveredCard === 'stat4')}
          onMouseEnter={() => setHoveredCard('stat4')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(139,92,246,0.1)',
              color: '#8b5cf6'
            }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{
                fontSize: '24px',
                fontWeight: '800',
                color: isDarkMode ? '#e2e8f0' : '#1e293b'
              }}>{projectData.length}</div>
              <div style={{
                fontSize: '14px',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>Active Projects</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Capacity Utilization Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={getCardStyle(hoveredCard === 'chart')}
          onMouseEnter={() => setHoveredCard('chart')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: isDarkMode ? '#e2e8f0' : '#1e293b',
              margin: 0
            }}>Capacity Utilization Overview</h3>
            <TrendingUp size={20} style={{ color: '#10b981' }} />
          </div>

          <div style={{ height: '400px', position: 'relative' }}>
            {/* Enhanced Chart with smoother lines */}
            <div style={{
              display: 'flex',
              alignItems: 'end',
              justifyContent: 'space-between',
              height: '320px',
              padding: '0 40px 20px 40px',
              borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
              position: 'relative'
            }}>
              {/* Y-axis labels */}
              <div style={{
                position: 'absolute',
                left: '0',
                top: '0',
                height: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>
                <span>200h</span>
                <span>150h</span>
                <span>100h</span>
                <span>50h</span>
                <span>0h</span>
              </div>

              {capacityData.map((data, index) => (
                <div key={data.month} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                  position: 'relative'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'end',
                    gap: '6px',
                    height: '280px',
                    position: 'relative'
                  }}>
                    {/* Planned Hours Bar */}
                    <div
                      style={{
                        width: '24px',
                        height: `${(data.planned / 200) * 260}px`,
                        backgroundColor: '#3b82f6',
                        borderRadius: '6px 6px 0 0',
                        transition: 'all 0.5s ease',
                        transform: hoveredCard === 'chart' ? 'scaleY(1.02)' : 'scaleY(1)',
                        opacity: hoveredCard === 'chart' ? 0.9 : 0.8,
                        position: 'relative'
                      }}
                      title={`Planned: ${data.planned}h`}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-25px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: '#3b82f6',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}>{data.planned}h</div>
                    </div>
                    {/* Actual Hours Bar */}
                    <div
                      style={{
                        width: '24px',
                        height: `${(data.actual / 200) * 260}px`,
                        backgroundColor: getEfficiencyColor(data.efficiency),
                        borderRadius: '6px 6px 0 0',
                        transition: 'all 0.5s ease',
                        transform: hoveredCard === 'chart' ? 'scaleY(1.02)' : 'scaleY(1)',
                        position: 'relative'
                      }}
                      title={`Actual: ${data.actual}h`}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-25px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: getEfficiencyColor(data.efficiency),
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}>{data.actual}h</div>
                    </div>
                  </div>

                  {/* Efficiency percentage indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: getEfficiencyColor(data.efficiency),
                    backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    border: `1px solid ${getEfficiencyColor(data.efficiency)}20`
                  }}>
                    {data.efficiency}%
                  </div>

                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}>{data.month}</div>
                </div>
              ))}

              {/* Trend line overlay */}
              <svg style={{
                position: 'absolute',
                top: '0',
                left: '40px',
                right: '40px',
                height: '280px',
                width: 'calc(100% - 80px)',
                pointerEvents: 'none'
              }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 ${280 - (capacityData[0].efficiency / 120) * 280} ${capacityData.map((data, index) =>
                    `L ${(index / (capacityData.length - 1)) * 100}% ${280 - (data.efficiency / 120) * 280}`
                  ).join(' ')}`}
                  stroke="url(#trendGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="0"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(59,130,246,0.2))'
                  }}
                />
              </svg>
            </div>

            {/* Enhanced Legend */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              marginTop: '20px',
              padding: '16px',
              backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.5)',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px'
                }}></div>
                <span style={{
                  fontSize: '13px',
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontWeight: '500'
                }}>Planned Hours</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)',
                  borderRadius: '4px'
                }}></div>
                <span style={{
                  fontSize: '13px',
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontWeight: '500'
                }}>Actual Hours (Color = Efficiency)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '3px',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                  borderRadius: '2px'
                }}></div>
                <span style={{
                  fontSize: '13px',
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontWeight: '500'
                }}>Efficiency Trend</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div
        style={getCardStyle(hoveredCard === 'table')}
        onMouseEnter={() => setHoveredCard('table')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            margin: 0
          }}>Project Performance</h3>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: hoveredItem === 'download' ? '#2563eb' : '#3b82f6',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setHoveredItem('download')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Download size={14} />
            Export
          </button>
        </div>

        <div style={{
          overflowX: 'auto',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)'
              }}>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                }}>Project</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                }}>Activity Type</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                }}>Planned Hours</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                }}>Spent Hours</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                }}>Efficiency</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                }}>Status</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                }}>Team</th>
              </tr>
            </thead>
            <tbody>
              {projectData.map((project, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: hoveredItem === `row-${index}`
                      ? isDarkMode ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.02)'
                      : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={() => setHoveredItem(`row-${index}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isDarkMode ? '#e2e8f0' : '#374151',
                    borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                  }}>{project.project}</td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                  }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: isDarkMode ? 'rgba(75,85,99,0.3)' : 'rgba(226,232,240,0.3)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {project.activityType}
                    </span>
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#3b82f6',
                    borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                  }}>{project.plannedHours}h</td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: getEfficiencyColor(project.efficiency),
                    borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                  }}>{project.spentHours}h</td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: getEfficiencyColor(project.efficiency),
                    borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      {project.efficiency}%
                      <div style={{
                        width: '40px',
                        height: '4px',
                        backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(project.efficiency, 100)}%`,
                          height: '100%',
                          backgroundColor: getEfficiencyColor(project.efficiency),
                          borderRadius: '2px',
                          transition: 'width 0.5s ease'
                        }}></div>
                      </div>
                    </div>
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                  }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: `${getStatusColor(project.status)}20`,
                      color: getStatusColor(project.status)
                    }}>
                      {project.status}
                    </span>
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      {project.team.slice(0, 3).map((member, memberIndex) => (
                        <div
                          key={memberIndex}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: '600',
                            border: '2px solid ' + (isDarkMode ? '#374151' : '#fff'),
                            marginLeft: memberIndex > 0 ? '-8px' : '0'
                          }}
                          title={member}
                        >
                          {member}
                        </div>
                      ))}
                      {project.team.length > 3 && (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDarkMode ? '#e2e8f0' : '#374151',
                          fontSize: '10px',
                          fontWeight: '600',
                          border: '2px solid ' + (isDarkMode ? '#374151' : '#fff'),
                          marginLeft: '-8px'
                        }}>
                          +{project.team.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Summary */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '14px',
            color: isDarkMode ? '#94a3b8' : '#64748b'
          }}>
            Showing {projectData.length} of {projectData.length} projects
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <span style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
              Total: {projectData.reduce((sum, item) => sum + item.plannedHours, 0)}h planned, {projectData.reduce((sum, item) => sum + item.spentHours, 0)}h spent
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;