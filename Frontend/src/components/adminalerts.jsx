import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Mail, User, Calendar, CheckCircle,
  AlertTriangle, Info, XCircle, Eye, Trash2, ArrowLeft
} from 'lucide-react';

const AdminAlertsPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);

  // Keep track of injected styles for better cleanup
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);

  // Sample admin user data for profile
  const [userData, setUserData] = useState({
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    email: 'admin@example.com',
    department: 'Engineering'
  });

  // Sample alerts data
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      subject: 'Welcome to MaxCap Admin Panel',
      content: 'Welcome to the MaxCap Capacity Planner admin panel. You now have administrative access to manage users and system settings.',
      sentDate: '2025-04-01T09:30:00Z',
      status: 'delivered'
    },
    {
      id: 2,
      subject: 'New User Registration',
      content: 'A new user "Jumana Haseen" has registered and requires approval. Please review their account in the Users Management section.',
      sentDate: '2025-04-01T14:15:00Z',
      status: 'delivered'
    },
    {
      id: 3,
      subject: 'System Update Completed',
      content: 'The MaxCap system has been successfully updated to version 2.1.0. New features include enhanced capacity tracking and improved reporting.',
      sentDate: '2025-04-01T16:45:00Z',
      status: 'delivered'
    },
    {
      id: 4,
      subject: 'Weekly Admin Report',
      content: 'Your weekly admin summary: 3 new users registered, 12 projects updated, system uptime 99.8%. Download detailed report from the dashboard.',
      sentDate: '2025-04-02T10:20:00Z',
      status: 'delivered'
    }
  ]);

  // Improved background handling with better cleanup and fallbacks
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
    pageStyle.setAttribute('data-component', 'admin-alerts-background');

    const backgroundGradient = isDarkMode
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      /* More specific targeting to avoid conflicts */
      .admin-alerts-page {
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
      
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
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
        const existingStyles = document.querySelectorAll('[data-component="admin-alerts-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

  const handleViewAlert = (alert) => {
    setSelectedAlert(alert);
    setShowDetailModal(true);
  };

  const handleDeleteAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return CheckCircle;
      case 'pending': return AlertTriangle;
      case 'failed': return XCircle;
      default: return Info;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '0',
      margin: '0',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif',
      transition: 'all 0.3s ease'
    },
    contentContainer: {
      padding: '30px',
      minHeight: '100vh',
      background: 'inherit'
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
    infoCard: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    infoIcon: {
      padding: '12px',
      borderRadius: '12px',
      backgroundColor: 'rgba(59,130,246,0.1)',
      color: '#3b82f6'
    },
    infoContent: {
      flex: 1
    },
    infoTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px'
    },
    infoText: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    alertsContainer: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)'
    },
    alertItem: (isHovered) => ({
      padding: '20px 24px',
      borderBottom: isDarkMode ? '1px solid #4b5563' : '1px solid #f1f5f9',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.05)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }),
    alertIcon: (status) => ({
      padding: '12px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${getStatusColor(status)}20`
    }),
    alertContent: {
      flex: 1
    },
    alertSubject: {
      fontSize: '16px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px'
    },
    alertDetails: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '8px'
    },
    alertMeta: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    statusChip: (status) => ({
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      backgroundColor: `${getStatusColor(status)}20`,
      color: getStatusColor(status),
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }),
    alertActions: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: (variant, isHovered) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      ...(variant === 'view' && {
        backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
        color: '#3b82f6'
      }),
      ...(variant === 'delete' && {
        backgroundColor: isHovered ? 'rgba(239,68,68,0.1)' : 'transparent',
        color: '#ef4444'
      })
    }),
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(4px)'
    },
    modalContent: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.95)' : 'rgba(255,255,255,0.95)',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)',
      animation: 'modalSlideIn 0.3s ease-out'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    },
    modalBody: {
      lineHeight: '1.6',
      color: isDarkMode ? '#e2e8f0' : '#374151'
    },
    closeButton: {
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }
  };

  return (
    <div className="admin-alerts-page" style={styles.page}>
      <div style={styles.contentContainer}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              style={styles.backButton}
              onClick={() => window.history.back()}
              className="floating"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 style={styles.title}>My Notifications</h1>
          </div>

          <div style={styles.headerRight}>
            {/* Admin Profile Button */}
            <div style={{ position: 'relative' }}>
              <button
                style={styles.topButton(hoveredButton === 'profile')}
                onMouseEnter={() => {
                  setHoveredButton('profile');
                  setShowProfileTooltip(true);
                }}
                onMouseLeave={() => {
                  setHoveredButton(null);
                }}
                onClick={() => {
                  window.location.href = '/adminprofile';
                }}
              >
                <User size={20} />
              </button>

              {/* Profile Tooltip */}
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

        {/* Info Card */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            <Mail size={24} />
          </div>
          <div style={styles.infoContent}>
            <div style={styles.infoTitle}>Your Notifications</div>
            <div style={styles.infoText}>
              Messages sent to you from the MaxCap system
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div style={styles.alertsContainer}>
          {alerts.map((alert) => {
            const StatusIcon = getStatusIcon(alert.status);

            return (
              <div
                key={alert.id}
                style={styles.alertItem(hoveredCard === `alert-${alert.id}`)}
                onMouseEnter={() => setHoveredCard(`alert-${alert.id}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={styles.alertIcon(alert.status)}>
                  <Mail size={20} color={getStatusColor(alert.status)} />
                </div>

                <div style={styles.alertContent}>
                  <div style={styles.alertSubject}>{alert.subject}</div>
                  <div style={styles.alertDetails}>
                    From: MaxCap System
                  </div>
                  <div style={styles.alertMeta}>
                    <span>{formatDate(alert.sentDate)}</span>
                    <span style={styles.statusChip(alert.status)}>
                      <StatusIcon size={12} />
                      {alert.status}
                    </span>
                  </div>
                </div>

                <div style={styles.alertActions}>
                  <button
                    style={styles.actionButton('view', hoveredButton === `view-${alert.id}`)}
                    onMouseEnter={() => setHoveredButton(`view-${alert.id}`)}
                    onMouseLeave={() => setHoveredButton(null)}
                    onClick={() => handleViewAlert(alert)}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    style={styles.actionButton('delete', hoveredButton === `delete-${alert.id}`)}
                    onMouseEnter={() => setHoveredButton(`delete-${alert.id}`)}
                    onMouseLeave={() => setHoveredButton(null)}
                    onClick={() => handleDeleteAlert(alert.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alert Detail Modal */}
        {showDetailModal && selectedAlert && (
          <div style={styles.modal} onClick={() => setShowDetailModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div style={styles.modalTitle}>{selectedAlert.subject}</div>
                <button
                  style={styles.closeButton}
                  onClick={() => setShowDetailModal(false)}
                >
                  ✕
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={{ marginBottom: '16px' }}>
                  <strong>From:</strong> MaxCap System
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Sent:</strong> {formatDate(selectedAlert.sentDate)}
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <strong>Status:</strong>
                  <span style={{ ...styles.statusChip(selectedAlert.status), marginLeft: '8px' }}>
                    {selectedAlert.status}
                  </span>
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${getStatusColor(selectedAlert.status)}`
                }}>
                  {selectedAlert.content}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAlertsPage;