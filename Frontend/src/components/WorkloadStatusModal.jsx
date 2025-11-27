import React from 'react';
import { X, User, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const WorkloadStatusModal = ({ isOpen, onClose, statusData, isDarkMode }) => {
  if (!isOpen) return null;

  const { title, users, color, darkColor } = statusData;

  const getStatusIcon = () => {
    switch (title) {
      case 'Overworked':
        return <TrendingUp size={24} style={{ color: '#ef4444' }} />;
      case 'Underutilized':
        return <TrendingDown size={24} style={{ color: '#eab308' }} />;
      case 'Optimal':
        return <Activity size={24} style={{ color: '#22c55e' }} />;
      default:
        return <User size={24} />;
    }
  };

  const getStatusColor = () => {
    switch (title) {
      case 'Overworked':
        return '#ef4444';
      case 'Underutilized':
        return '#eab308';
      case 'Optimal':
        return '#22c55e';
      default:
        return '#3b82f6';
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-out',
      padding: '20px'
    },
    modal: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
      width: '90%',
      maxWidth: '700px',
      maxHeight: '85vh',
      overflow: 'hidden',
      animation: 'slideUp 0.3s ease-out',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)'
    },
    header: {
      padding: '24px 28px',
      borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    headerSubtitle: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
      marginTop: '4px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    content: {
      padding: '24px 28px',
      maxHeight: 'calc(85vh - 100px)',
      overflowY: 'auto'
    },
    noUsers: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    noUsersIcon: {
      fontSize: '48px',
      marginBottom: '16px',
      opacity: 0.5
    },
    userCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      borderLeft: `4px solid ${getStatusColor()}`,
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    },
    userHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '12px'
    },
    avatar: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: getStatusColor(),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: '700',
      fontSize: '18px',
      flexShrink: 0
    },
    userInfo: {
      flex: 1
    },
    userName: {
      fontSize: '18px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px'
    },
    userDepartment: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)'
    },
    statItem: {
      textAlign: 'center'
    },
    statValue: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '11px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600'
    },
    utilizationBar: {
      marginTop: '16px',
      height: '8px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.5)',
      borderRadius: '4px',
      overflow: 'hidden',
      position: 'relative'
    },
    utilizationFill: (percentage) => ({
      height: '100%',
      width: `${Math.min(percentage, 100)}%`,
      backgroundColor: getStatusColor(),
      borderRadius: '4px',
      transition: 'width 0.5s ease'
    }),
    categoryBreakdown: {
      marginTop: '12px',
      display: 'flex',
      gap: '12px',
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    categoryItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    categoryDot: (color) => ({
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: color
    }),
    summaryCard: {
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '20px',
      border: `2px solid ${getStatusColor()}20`
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      textAlign: 'center'
    },
    summaryItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    summaryValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: getStatusColor()
    },
    summaryLabel: {
      fontSize: '11px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600'
    }
  };

  // Calculate summary statistics
  const totalHours = users.reduce((sum, u) => sum + u.totalHours, 0);
  const avgHours = users.length > 0 ? (totalHours / users.length).toFixed(1) : 0;
  const avgManDays = users.length > 0 ? (users.reduce((sum, u) => sum + u.totalManDays, 0) / users.length).toFixed(1) : 0;
  const avgUtilization = users.length > 0 ? (users.reduce((sum, u) => sum + u.utilizationPercentage, 0) / users.length).toFixed(1) : 0;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .user-card:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
      `}</style>
      
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              {getStatusIcon()}
              <div>
                <div style={styles.headerTitle}>
                  {title} Users
                </div>
                <div style={styles.headerSubtitle}>
                  {users.length} {users.length === 1 ? 'user' : 'users'} in this category
                </div>
              </div>
            </div>
            <button 
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={24} />
            </button>
          </div>
          
          <div style={styles.content}>
            {users.length === 0 ? (
              <div style={styles.noUsers}>
                <div style={styles.noUsersIcon}>👥</div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  No users in this category
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  All users are in other workload categories
                </div>
              </div>
            ) : (
              <>
                {/* Summary Card */}
                <div style={styles.summaryCard}>
                  <div style={styles.summaryGrid}>
                    <div style={styles.summaryItem}>
                      <div style={styles.summaryValue}>{users.length}</div>
                      <div style={styles.summaryLabel}>Users</div>
                    </div>
                    <div style={styles.summaryItem}>
                      <div style={styles.summaryValue}>{avgHours}</div>
                      <div style={styles.summaryLabel}>Avg Hours</div>
                    </div>
                    <div style={styles.summaryItem}>
                      <div style={styles.summaryValue}>{avgManDays}</div>
                      <div style={styles.summaryLabel}>Avg Days</div>
                    </div>
                    <div style={styles.summaryItem}>
                      <div style={styles.summaryValue}>{avgUtilization}%</div>
                      <div style={styles.summaryLabel}>Avg Capacity</div>
                    </div>
                  </div>
                </div>

                {/* User Cards */}
                {users.map((user, index) => (
                  <div 
                    key={index}
                    className="user-card"
                    style={styles.userCard}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={styles.userHeader}>
                      <div style={styles.avatar}>
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div style={styles.userInfo}>
                        <div style={styles.userName}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={styles.userDepartment}>
                          <span>{user.department}</span>
                          <span>•</span>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Statistics Grid */}
                    <div style={styles.statsGrid}>
                      <div style={styles.statItem}>
                        <div style={styles.statValue}>{user.totalHours.toFixed(0)}</div>
                        <div style={styles.statLabel}>Hours</div>
                      </div>
                      <div style={styles.statItem}>
                        <div style={styles.statValue}>{user.totalManDays.toFixed(1)}</div>
                        <div style={styles.statLabel}>Man-Days</div>
                      </div>
                      <div style={styles.statItem}>
                        <div style={styles.statValue}>{user.utilizationPercentage.toFixed(1)}%</div>
                        <div style={styles.statLabel}>Capacity</div>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div style={styles.utilizationBar}>
                      <div style={styles.utilizationFill(user.utilizationPercentage)}></div>
                    </div>

                    {/* Category Breakdown */}
                    {(user.projectHours > 0 || user.operationsHours > 0 || user.adminHours > 0) && (
                      <div style={styles.categoryBreakdown}>
                        {user.projectHours > 0 && (
                          <div style={styles.categoryItem}>
                            <div style={styles.categoryDot('#3b82f6')}></div>
                            <span>Project: {user.projectHours.toFixed(0)}h</span>
                          </div>
                        )}
                        {user.operationsHours > 0 && (
                          <div style={styles.categoryItem}>
                            <div style={styles.categoryDot('#8b5cf6')}></div>
                            <span>Operations: {user.operationsHours.toFixed(0)}h</span>
                          </div>
                        )}
                        {user.adminHours > 0 && (
                          <div style={styles.categoryItem}>
                            <div style={styles.categoryDot('#f59e0b')}></div>
                            <span>Admin: {user.adminHours.toFixed(0)}h</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkloadStatusModal;