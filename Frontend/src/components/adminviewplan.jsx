import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Filter,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Calendar,
  TrendingUp,
  Users,
  Bell,
  User,
  Edit,
  Trash2
} from 'lucide-react';

const AdminViewPlan = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedProject, setSelectedProject] = useState('Project Overview');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('Master Plan');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const projects = [
    'Project Overview',
    'JRET Implementation',
    'Security Enhancement',
    'Data Migration'
  ];

  const ganttData = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    phases: [
      {
        name: 'Requirements & Analysis',
        color: '#3b82f6',
        start: 1,
        duration: 2,
        status: 'completed'
      },
      {
        name: 'Design & Planning',
        color: '#06b6d4',
        start: 2,
        duration: 3,
        status: 'completed'
      },
      {
        name: 'Development Phase 1',
        color: '#10b981',
        start: 4,
        duration: 2,
        status: 'in-progress'
      },
      {
        name: 'Testing & QA',
        color: '#f59e0b',
        start: 5,
        duration: 2,
        status: 'pending'
      },
      {
        name: 'Deployment',
        color: '#ef4444',
        start: 7,
        duration: 1,
        status: 'delayed'
      },
      {
        name: 'Go-Live & Support',
        color: '#8b5cf6',
        start: 8,
        duration: 2,
        status: 'pending'
      }
    ],
    milestones: [
      { name: 'Design Sign-off', month: 3, type: 'completed' },
      { name: 'Alpha Release', month: 5, type: 'in-progress' },
      { name: 'Beta Testing', month: 6, type: 'pending' },
      { name: 'Production Release', month: 8, type: 'pending' }
    ]
  };

  const statusLegend = [
    { label: 'On Track', color: '#10b981', count: 3 },
    { label: 'Delayed', color: '#ef4444', count: 1 },
    { label: 'Completed', color: '#3b82f6', count: 2 }
  ];

  const handleTabChange = (tab) => {
    console.log(`🚀 AdminViewPlan - Navigating to ${tab} tab`);
    setActiveTab(tab);
    
    // Route to different pages based on tab selection
    if (tab === 'Individual Plan') {
      console.log('🌐 Navigating to individual plan page');
      window.location.href = '/adminindividualplan';
    } else if (tab === 'Approvals') {
      console.log('🌐 Navigating to approvals page');
      window.location.href = '/adminapprovals';
    } else {
      console.log('📍 Staying on master plan page');
      // Master Plan tab - stay on current page
    }
  };

  const handleCreateMasterPlan = () => {
    console.log('🚀 AdminViewPlan - Creating new master plan');
    window.location.href = '/adminaddplan';
  };

  const handleEditPlan = () => {
    console.log('✏️ AdminViewPlan - Editing plan:', selectedProject);
    window.location.href = '/admineditplan';
  };

  const handleDeletePlan = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePlan = () => {
    console.log('🗑️ AdminViewPlan - Deleting plan:', selectedProject);
    alert(`Plan "${selectedProject}" has been deleted successfully!`);
    setShowDeleteConfirmation(false);
    // In a real app, you would make an API call here and refresh the data
  };

  const cancelDeletePlan = () => {
    setShowDeleteConfirmation(false);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
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
    createButton: (isHovered) => ({
      backgroundColor: isHovered ? '#f59e0b' : '#fbbf24',
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 8px 25px rgba(251,191,36,0.3)' : '0 4px 12px rgba(251,191,36,0.2)'
    }),
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
    tabContainer: {
      display: 'flex',
      gap: '8px',
      marginBottom: '32px',
      padding: '4px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,0.8)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
      maxWidth: 'fit-content'
    },
    tab: (isActive, isHovered) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: 'none',
      outline: 'none',
      backgroundColor: isActive 
        ? '#3b82f6' 
        : isHovered 
          ? isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)'
          : 'transparent',
      color: isActive 
        ? '#fff' 
        : isDarkMode ? '#e2e8f0' : '#64748b',
      transform: isHovered && !isActive ? 'translateY(-1px)' : 'translateY(0)',
      boxShadow: isActive 
        ? '0 4px 12px rgba(59,130,246,0.3)' 
        : isHovered && !isActive 
          ? '0 2px 8px rgba(0,0,0,0.1)' 
          : 'none'
    }),
    card: (isHovered) => ({
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '28px',
      marginBottom: '28px',
      boxShadow: isHovered 
        ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.1)' 
        : '0 8px 25px rgba(0,0,0,0.08)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }),
    cardGlow: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)',
      opacity: 0,
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none'
    },
    projectTitle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      position: 'relative'
    },
    projectTitleLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'relative'
    },
    projectTitleRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    projectName: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease'
    },
    actionButton: (isHovered, type) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered 
        ? type === 'edit' 
          ? 'rgba(59,130,246,0.1)' 
          : 'rgba(239,68,68,0.1)'
        : isDarkMode 
          ? 'rgba(51,65,85,0.5)' 
          : 'rgba(248,250,252,0.8)',
      color: isHovered 
        ? type === 'edit' 
          ? '#3b82f6' 
          : '#ef4444'
        : isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }),
    projectDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
      padding: '12px 0',
      minWidth: '250px',
      zIndex: 1000,
      animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transition: 'all 0.3s ease'
    },
    dropdownItem: (isHovered) => ({
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
      borderLeft: isHovered ? '3px solid #3b82f6' : '3px solid transparent'
    }),
    projectMeta: {
      display: 'flex',
      gap: '24px',
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
    },
    deleteConfirmation: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    },
    deleteModal: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      position: 'relative',
      zIndex: 10000
    },
    deleteModalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '12px'
    },
    deleteModalText: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '24px',
      lineHeight: '1.5'
    },
    deleteModalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center'
    },
    modalButton: (isHovered, type) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: type === 'danger' 
        ? (isHovered ? '#dc2626' : '#ef4444')
        : (isHovered ? isDarkMode ? '#4b5563' : '#e5e7eb' : isDarkMode ? '#6b7280' : '#f3f4f6'),
      color: type === 'danger' 
        ? '#fff' 
        : isDarkMode ? '#e2e8f0' : '#374151',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
    }),
    ganttContainer: {
      marginTop: '24px',
      overflowX: 'auto'
    },
    ganttHeader: {
      display: 'grid',
      gridTemplateColumns: '200px repeat(12, 1fr)',
      gap: '1px',
      marginBottom: '16px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.3s ease'
    },
    monthHeader: {
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      padding: '8px 4px',
      transition: 'all 0.3s ease'
    },
    taskHeader: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      padding: '8px 12px',
      transition: 'all 0.3s ease'
    },
    ganttRow: {
      display: 'grid',
      gridTemplateColumns: '200px repeat(12, 1fr)',
      gap: '1px',
      marginBottom: '8px',
      alignItems: 'center'
    },
    taskName: {
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      padding: '12px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '8px',
      transition: 'all 0.3s ease'
    },
    ganttCell: {
      height: '40px',
      position: 'relative',
      border: isDarkMode ? '1px solid #4b5563' : '1px solid #f1f5f9',
      borderRadius: '4px',
      transition: 'all 0.3s ease'
    },
    ganttBar: (color, start, duration, status) => ({
      position: 'absolute',
      left: '0%',
      width: '100%',
      height: '24px',
      top: '8px',
      backgroundColor: color,
      borderRadius: '6px',
      opacity: status === 'completed' ? 0.8 : status === 'delayed' ? 0.9 : 1,
      border: status === 'delayed' ? '2px solid #ef4444' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '10px',
      fontWeight: '600',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease'
    }),
    milestone: (month, type) => ({
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: '12px',
      height: '12px',
      backgroundColor: type === 'completed' ? '#10b981' : type === 'in-progress' ? '#f59e0b' : '#94a3b8',
      borderRadius: '50%',
      border: '2px solid #fff',
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease'
    }),
    legend: {
      display: 'flex',
      gap: '24px',
      marginTop: '20px',
      padding: '20px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '12px',
      transition: 'all 0.3s ease'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      transition: 'all 0.3s ease'
    },
    legendColor: (color) => ({
      width: '16px',
      height: '16px',
      borderRadius: '4px',
      backgroundColor: color,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }),
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '28px'
    },
    statCard: (isHovered) => ({
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '28px',
      textAlign: 'center',
      boxShadow: isHovered 
        ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.1)' 
        : '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      cursor: 'pointer',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }),
    statNumber: {
      fontSize: '36px',
      fontWeight: '800',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px',
      transition: 'all 0.3s ease'
    },
    statLabel: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      transition: 'all 0.3s ease'
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
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <h1 style={styles.header}>Plan</h1>
        </div>
        <div style={styles.headerRight}>
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
              onClick={() => {
                console.log('👤 Profile clicked - Navigating to profile page');
                window.location.href = '/adminprofile';
              }}
            >
              <User size={20} />
            </button>

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

      <div style={styles.tabContainer}>
        {['Master Plan', 'Individual Plan', 'Approvals'].map((tab) => (
          <button
            key={tab}
            style={styles.tab(
              activeTab === tab, 
              hoveredItem === `tab-${tab}`
            )}
            onMouseEnter={() => setHoveredItem(`tab-${tab}`)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#1e293b', margin: 0 }}>Master Plan</h2>
        <button
          style={styles.createButton(hoveredItem === 'create')}
          onMouseEnter={() => setHoveredItem('create')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={handleCreateMasterPlan}
        >
          <Plus size={16} />
          Create a Master Plan
        </button>
      </div>

      <div 
        style={styles.card(hoveredCard === 'project')}
        onMouseEnter={() => setHoveredCard('project')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.cardGlow}></div>
        
        <div style={styles.projectTitle}>
          <div style={styles.projectTitleLeft}>
            <div
              style={styles.projectName}
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            >
              {selectedProject}
              <ChevronDown size={20} />
            </div>
            
            {isProjectDropdownOpen && (
              <div style={styles.projectDropdown}>
                {projects.map((project) => (
                  <div
                    key={project}
                    style={styles.dropdownItem(hoveredItem === project)}
                    onMouseEnter={() => setHoveredItem(project)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      setSelectedProject(project);
                      setIsProjectDropdownOpen(false);
                    }}
                  >
                    {project}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.projectTitleRight}>
            <button
              style={styles.actionButton(hoveredItem === 'edit', 'edit')}
              onMouseEnter={() => setHoveredItem('edit')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={handleEditPlan}
              title="Edit this plan"
            >
              <Edit size={16} />
            </button>
            <button
              style={styles.actionButton(hoveredItem === 'delete', 'delete')}
              onMouseEnter={() => setHoveredItem('delete')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={handleDeletePlan}
              title="Delete this plan"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div style={styles.projectMeta}>
          <span><strong>Created by:</strong> Monica</span>
          <span><strong>Created:</strong> 2025-06-15</span>
        </div>

        <div style={styles.ganttContainer}>
          <div style={styles.ganttHeader}>
            <div style={styles.taskHeader}>2024 Q4 2025</div>
            {ganttData.months.map((month) => (
              <div key={month} style={styles.monthHeader}>{month}</div>
            ))}
          </div>

          {ganttData.phases.map((phase, index) => (
            <div key={index} style={styles.ganttRow}>
              <div style={styles.taskName}>{phase.name}</div>
              {ganttData.months.map((month, monthIndex) => (
                <div key={monthIndex} style={styles.ganttCell}>
                  {monthIndex >= phase.start - 1 && monthIndex < phase.start - 1 + phase.duration && (
                    <div style={styles.ganttBar(phase.color, 1, 1, phase.status)}>
                      {monthIndex === phase.start - 1 && (
                        <>
                          {phase.status === 'delayed' && <AlertTriangle size={12} />}
                          {phase.status === 'completed' && <CheckCircle size={12} />}
                          {phase.status === 'in-progress' && <Clock size={12} />}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div style={styles.ganttRow}>
            <div style={styles.taskName}>Milestones</div>
            {ganttData.months.map((month, monthIndex) => (
              <div key={monthIndex} style={styles.ganttCell}>
                {ganttData.milestones
                  .filter(milestone => milestone.month === monthIndex + 1)
                  .map((milestone, idx) => (
                    <div
                      key={idx}
                      style={styles.milestone(1, milestone.type)}
                      title={milestone.name}
                    />
                  ))}
              </div>
            ))}
          </div>

          <div style={styles.legend}>
            {statusLegend.map((item, index) => (
              <div key={index} style={styles.legendItem}>
                <div style={styles.legendColor(item.color)} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.statsContainer}>
        <div
          style={styles.statCard(hoveredCard === 'stat1')}
          onMouseEnter={() => setHoveredCard('stat1')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>
          <div style={styles.statNumber}>2</div>
          <div style={styles.statLabel}>Master Plans</div>
        </div>
        
        <div
          style={styles.statCard(hoveredCard === 'stat2')}
          onMouseEnter={() => setHoveredCard('stat2')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>
          <div style={styles.statNumber}>2</div>
          <div style={styles.statLabel}>Individual Plans</div>
        </div>
        
        <div
          style={styles.statCard(hoveredCard === 'stat3')}
          onMouseEnter={() => setHoveredCard('stat3')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>
          <div style={styles.statNumber}>0</div>
          <div style={styles.statLabel}>Pending Approval</div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div style={styles.deleteConfirmation}>
          <div style={styles.deleteModal}>
            <h3 style={styles.deleteModalTitle}>Delete Plan</h3>
            <p style={styles.deleteModalText}>
              Are you sure you want to delete "{selectedProject}"? This action cannot be undone and will permanently remove all associated data.
            </p>
            <div style={styles.deleteModalActions}>
              <button
                style={styles.modalButton(hoveredItem === 'cancel', 'cancel')}
                onMouseEnter={() => setHoveredItem('cancel')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={cancelDeletePlan}
              >
                Cancel
              </button>
              <button
                style={styles.modalButton(hoveredItem === 'confirm-delete', 'danger')}
                onMouseEnter={() => setHoveredItem('confirm-delete')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={confirmDeletePlan}
              >
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminViewPlan;