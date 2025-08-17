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
  Search,
  MoreHorizontal,
  Eye,
  Check,
  X,
  FileText,
  UserCheck
} from 'lucide-react';

const AdminApprovals = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('Approvals');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pending Approval');
  const [showGanttPopup, setShowGanttPopup] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
  
  // Refs for better cleanup
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);
  const statusDropdownRef = useRef(null);

  // Sample approvals data
  const approvals = [
    {
      id: 1,
      title: "JRET Master Plan",
      type: "Master Plan",
      createdBy: "Monica",
      createdDate: "2025-06-15",
      status: "Pending Approval",
      description: "Comprehensive project plan for JRET implementation with timeline and resource allocation",
      submittedDate: "2025-07-15",
      deadline: "2025-07-20",
      reviewers: ["Sarah Chen", "Alex Rodriguez"],
      priority: "high"
    },
    {
      id: 2,
      title: "Q1 Marketing Strategy",
      type: "Individual Plan",
      createdBy: "James Wilson",
      createdDate: "2025-06-10",
      status: "Pending Approval",
      description: "Marketing campaign strategy for Q1 2025 including budget allocation and target metrics",
      submittedDate: "2025-07-12",
      deadline: "2025-07-18",
      reviewers: ["Monica Liu"],
      priority: "medium"
    },
    {
      id: 3,
      title: "Database Migration Plan",
      type: "Master Plan",
      createdBy: "Sarah Chen",
      createdDate: "2025-06-05",
      status: "Approved",
      description: "Complete database migration strategy with rollback procedures and testing phases",
      submittedDate: "2025-07-08",
      deadline: "2025-07-15",
      reviewers: ["Hasan Kamal", "Monica Liu"],
      approvedBy: "Hasan Kamal",
      approvedDate: "2025-07-14",
      priority: "high"
    },
    {
      id: 4,
      title: "Security Enhancement Proposal",
      type: "Individual Plan",
      createdBy: "Alex Rodriguez",
      createdDate: "2025-06-20",
      status: "Rejected",
      description: "Security improvements for user authentication and data protection protocols",
      submittedDate: "2025-07-10",
      deadline: "2025-07-16",
      reviewers: ["Sarah Chen"],
      rejectedBy: "Sarah Chen",
      rejectedDate: "2025-07-12",
      rejectionReason: "Insufficient budget allocation and timeline too aggressive",
      priority: "low"
    }
  ];

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
    pageStyle.setAttribute('data-component', 'admin-approvals-background');
    
    const backgroundGradient = isDarkMode 
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      /* More specific targeting to avoid conflicts */
      .admin-approvals-page {
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
        const existingStyles = document.querySelectorAll('[data-component="admin-approvals-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(null);
      }
    };

    if (statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusDropdownOpen]);

  const handleTabChange = (tab) => {
    console.log(`🚀 AdminApprovals - Navigating to ${tab} tab`);

    if (tab === 'Master Plan') {
      console.log('🌐 Navigating to master plan page');
      window.location.href = '/adminviewplan';
    } else if (tab === 'Individual Plan') {
      console.log('🌐 Navigating to individual plan page');
      window.location.href = '/adminindividualplan';
    } else {
      console.log('📍 Staying on approvals page');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending Approval': return '#ef4444';
      case 'Under Review': return '#f59e0b';
      case 'Approved': return '#10b981';
      case 'Rejected': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Fixed: Added missing getPriorityColor function
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const handleStatusChange = (approvalId, newStatus) => {
    console.log(`Changing approval ${approvalId} status to ${newStatus}`);
    setStatusDropdownOpen(null);
    // Here you would update the approval status in your backend
  };

  const handleViewDetails = (approval) => {
    setSelectedApproval(approval);
    setShowGanttPopup(true);
  };

  const closeGanttPopup = () => {
    setShowGanttPopup(false);
    setSelectedApproval(null);
  };

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = approval.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    'Pending Approval': approvals.filter(a => a.status === 'Pending Approval').length,
    'Under Review': approvals.filter(a => a.status === 'Under Review').length,
    'Approved': approvals.filter(a => a.status === 'Approved').length,
    'Rejected': approvals.filter(a => a.status === 'Rejected').length
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
    controlsRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      gap: '16px'
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      maxWidth: '400px'
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px 12px 44px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.8)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      fontWeight: '500',
      outline: 'none',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      fontFamily: '"Montserrat", sans-serif'
    },
    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
    },
    filterContainer: {
      display: 'flex',
      gap: '8px'
    },
    filterButton: (isActive, isHovered) => ({
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: isActive
        ? '#3b82f6'
        : isHovered
          ? isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)'
          : isDarkMode
            ? 'rgba(51,65,85,0.5)'
            : 'rgba(255,255,255,0.8)',
      color: isActive
        ? '#fff'
        : isDarkMode ? '#e2e8f0' : '#64748b',
      backdropFilter: 'blur(10px)'
    }),
    approvalsGrid: {
      display: 'grid',
      gap: '24px',
      marginBottom: '32px'
    },
    approvalCard: (isHovered) => ({
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: isHovered
        ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.1)'
        : '0 8px 25px rgba(0,0,0,0.08)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }),
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px',
      transition: 'all 0.3s ease'
    },
    cardMeta: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '8px'
    },
    statusDropdown: (status) => ({
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: `${getStatusColor(status)}20`,
      color: getStatusColor(status),
      border: `1px solid ${getStatusColor(status)}30`,
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }),
    statusDropdownMenu: {
      position: 'absolute',
      top: '100%',
      right: 0,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '12px',
      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
      padding: '8px 0',
      minWidth: '180px',
      zIndex: 1000,
      animation: 'slideIn 0.2s ease-out',
      marginTop: '4px'
    },
    statusDropdownItem: (isHovered) => ({
      padding: '12px 16px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      transition: 'all 0.2s ease'
    }),
    priorityBadge: (priority) => ({
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      backgroundColor: `${getPriorityColor(priority)}20`,
      color: getPriorityColor(priority),
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }),
    cardDescription: {
      fontSize: '14px',
      color: isDarkMode ? '#d1d5db' : '#4b5563',
      lineHeight: '1.5',
      marginBottom: '16px'
    },
    cardInfo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    infoLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    infoValue: {
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151'
    },
    cardActions: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '16px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)'
    },
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: (variant, isHovered) => {
      const variants = {
        approve: { bg: '#10b981', hover: '#059669' },
        reject: { bg: '#ef4444', hover: '#dc2626' },
        view: { bg: '#3b82f6', hover: '#2563eb' }
      };
      const colors = variants[variant] || variants.view;

      return {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: isHovered ? colors.hover : colors.bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: isHovered ? `0 4px 12px ${colors.bg}40` : 'none'
      };
    },
    lastActivity: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontStyle: 'italic'
    },
    ganttPopup: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    },
    ganttPopupContent: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.95)' : 'rgba(255,255,255,0.95)',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      backdropFilter: 'blur(20px)'
    },
    popupHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
      paddingBottom: '16px'
    },
    popupTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    closeButton: (isHovered) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(239,68,68,0.1)' : 'transparent',
      color: isHovered ? '#ef4444' : isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    ganttChart: {
      minHeight: '400px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '16px',
      fontStyle: 'italic',
      flexDirection: 'column',
      textAlign: 'center'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '28px'
    },
    statCard: (isHovered) => ({
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
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

  return (
    <div className="admin-approvals-page" style={styles.page}>
      {/* Header */}
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

      {/* Tab Navigation */}
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

      {/* Approvals Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#1e293b', margin: 0 }}>Approvals</h2>
        <p style={{ fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b', margin: '4px 0 0 0' }}>
          Review and manage plan approvals
        </p>
      </div>

      {/* Search and Filters */}
      <div style={styles.controlsRow}>
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search approvals by title or creator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.filterContainer}>
          {['Pending Approval', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              style={styles.filterButton(
                filterStatus === status,
                hoveredItem === `filter-${status}`
              )}
              onMouseEnter={() => setHoveredItem(`filter-${status}`)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => setFilterStatus(status)}
            >
              {status} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Approvals List */}
      <div style={styles.approvalsGrid}>
        {filteredApprovals.map((approval) => (
          <div
            key={approval.id}
            style={styles.approvalCard(hoveredCard === `approval-${approval.id}`)}
            onMouseEnter={() => setHoveredCard(`approval-${approval.id}`)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardHeader}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={styles.cardTitle}>{approval.title}</div>
                  <div style={styles.priorityBadge(approval.priority)}>
                    {approval.priority}
                  </div>
                </div>
                <div style={styles.cardMeta}>
                  Created by: {approval.createdBy} • {approval.type} • Created: {new Date(approval.createdDate).toLocaleDateString()}
                </div>
              </div>
              <div style={{ position: 'relative' }} ref={statusDropdownOpen === approval.id ? statusDropdownRef : null}>
                <div
                  style={styles.statusDropdown(approval.status)}
                  onClick={() => setStatusDropdownOpen(statusDropdownOpen === approval.id ? null : approval.id)}
                >
                  {approval.status}
                  <ChevronDown size={16} />
                </div>

                {statusDropdownOpen === approval.id && (
                  <div style={styles.statusDropdownMenu}>
                    {['Pending Approval', 'Approved', 'Rejected']
                      .filter(status => status !== approval.status)
                      .map((status) => (
                        <div
                          key={status}
                          style={styles.statusDropdownItem(hoveredItem === `status-${status}`)}
                          onMouseEnter={() => setHoveredItem(`status-${status}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(approval.id, status);
                          }}
                        >
                          {status}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.cardDescription}>
              {approval.description}
            </div>

            <div style={styles.cardInfo}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Submitted</div>
                <div style={styles.infoValue}>{new Date(approval.submittedDate).toLocaleDateString()}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Deadline</div>
                <div style={styles.infoValue}>{new Date(approval.deadline).toLocaleDateString()}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Reviewers</div>
                <div style={styles.infoValue}>{approval.reviewers.join(', ')}</div>
              </div>
              {approval.status === 'Approved' && (
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Approved By</div>
                  <div style={styles.infoValue}>{approval.approvedBy} on {new Date(approval.approvedDate).toLocaleDateString()}</div>
                </div>
              )}
              {approval.status === 'Rejected' && (
                <>
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>Rejected By</div>
                    <div style={styles.infoValue}>{approval.rejectedBy} on {new Date(approval.rejectedDate).toLocaleDateString()}</div>
                  </div>
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>Rejection Reason</div>
                    <div style={styles.infoValue}>{approval.rejectionReason}</div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.cardActions}>
              <div style={styles.actionButtons}>
                <button
                  style={styles.actionButton('view', hoveredItem === `view-${approval.id}`)}
                  onMouseEnter={() => setHoveredItem(`view-${approval.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => handleViewDetails(approval)}
                >
                  <Eye size={14} />
                  View Gantt Chart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredApprovals.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: isDarkMode ? '#94a3b8' : '#64748b'
        }}>
          <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            {searchTerm ? 'No approvals found' : 'No approvals in this status'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {searchTerm ? 'Try adjusting your search terms' : `No ${filterStatus.toLowerCase()} approvals at the moment`}
          </p>
        </div>
      )}

      {/* Gantt Chart Popup */}
      {showGanttPopup && selectedApproval && (
        <div style={styles.ganttPopup} onClick={closeGanttPopup}>
          <div style={styles.ganttPopupContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popupHeader}>
              <div>
                <div style={styles.popupTitle}>{selectedApproval.title}</div>
                <div style={{ fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '4px' }}>
                  {selectedApproval.type} • Created by {selectedApproval.createdBy}
                </div>
              </div>
              <button
                style={styles.closeButton(hoveredItem === 'close')}
                onMouseEnter={() => setHoveredItem('close')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={closeGanttPopup}
              >
                <X size={24} />
              </button>
            </div>

            <div style={styles.ganttChart}>
              <div>Gantt Chart for "{selectedApproval.title}" will be displayed here</div>
              <small style={{ marginTop: '8px', display: 'block', opacity: 0.7 }}>
                This will show the project timeline and milestones when connected to backend
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
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
          <div style={styles.statNumber}>{statusCounts['Pending Approval']}</div>
          <div style={styles.statLabel}>Pending Approval</div>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovals;