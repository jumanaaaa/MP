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
  UserCheck,
  AlertCircle
} from 'lucide-react';

const AdminApprovals = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('Approvals');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pending Approval');
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
  
  // Data states
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({
    pendingApproval: 0,
    underReview: 0,
    approved: 0,
    rejected: 0
  });
  const [isApprover, setIsApprover] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalToReject, setApprovalToReject] = useState(null);
  
  // Refs for better cleanup
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);
  const statusDropdownRef = useRef(null);

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:3000/user/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch approvals data
  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching approvals...');

      const response = await fetch('http://localhost:3000/api/approvals', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      console.log('✅ Approvals data received:', data);

      setApprovals(data.approvals);
      setStats(data.stats);
      setIsApprover(data.isApprover);
      setUserEmail(data.userEmail);

    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
      alert('Failed to load approvals. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle approval
  const handleApprove = async (planId, currentStatus) => {
    if (!isApprover) {
      alert('You are not authorized to approve plans. Only designated approvers (muhammad.hasan@ihrp.sg and jumana.haseen@ihrp.sg) can approve.');
      return;
    }

    // Different confirmation messages based on current status
    let confirmMessage = 'Are you sure you want to approve this master plan?';
    if (currentStatus === 'Approved') {
      confirmMessage = 'This plan is already approved. Do you want to re-approve it? (This will update the approval timestamp)';
    } else if (currentStatus === 'Rejected') {
      confirmMessage = 'This plan was previously rejected. Are you sure you want to approve it now?';
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log(`✅ Approving plan ${planId}...`);

      const response = await fetch(`http://localhost:3000/api/approvals/${planId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comments: ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve plan');
      }

      console.log('✅ Plan approved successfully');
      alert('Master plan approved successfully!');
      
      // Refresh approvals
      await fetchApprovals();

    } catch (error) {
      console.error('❌ Error approving plan:', error);
      alert(error.message || 'Failed to approve plan. Please try again.');
    }
  };

  // Handle rejection - open modal
  const openRejectionModal = (planId, currentStatus) => {
    if (!isApprover) {
      alert('You are not authorized to reject plans. Only designated approvers (muhammad.hasan@ihrp.sg and jumana.haseen@ihrp.sg) can reject.');
      return;
    }

    setApprovalToReject({ planId, currentStatus });
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  // Handle rejection - submit
  const handleReject = async () => {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      console.log(`❌ Rejecting plan ${approvalToReject.planId}...`);

      const response = await fetch(`http://localhost:3000/api/approvals/${approvalToReject.planId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: rejectionReason.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject plan');
      }

      console.log('✅ Plan rejected successfully');
      alert('Master plan rejected successfully!');
      
      // Close modal and refresh
      setShowRejectionModal(false);
      setApprovalToReject(null);
      setRejectionReason('');
      await fetchApprovals();

    } catch (error) {
      console.error('❌ Error rejecting plan:', error);
      alert(error.message || 'Failed to reject plan. Please try again.');
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchApprovals();
    fetchUserProfile();
  }, []);

  // Background handling
  useEffect(() => {
    if (!originalBodyStyleRef.current) {
      originalBodyStyleRef.current = {
        background: document.body.style.background,
        margin: document.body.style.margin,
        padding: document.body.style.padding
      };
    }

    if (injectedStyleRef.current) {
      document.head.removeChild(injectedStyleRef.current);
    }

    const pageStyle = document.createElement('style');
    pageStyle.setAttribute('data-component', 'admin-approvals-background');
    
    const backgroundGradient = isDarkMode 
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      .admin-approvals-page {
        min-height: 100vh;
        background: ${backgroundGradient};
      }
      
      body {
        background: ${backgroundGradient} !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      #root > div:first-child,
      .app > div:first-child,
      .main-content,
      .page-container {
        background: transparent !important;
        min-height: 100vh;
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
      
      * {
        transition: background-color 0.3s ease, background 0.3s ease;
      }
    `;
    
    document.head.appendChild(pageStyle);
    injectedStyleRef.current = pageStyle;

    return () => {
      if (injectedStyleRef.current && document.head.contains(injectedStyleRef.current)) {
        document.head.removeChild(injectedStyleRef.current);
        injectedStyleRef.current = null;
      }
      
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
      window.location.href = '/adminviewplan';
    } else if (tab === 'Individual Plan') {
      window.location.href = '/adminindividualplan';
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', !isDarkMode);
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

  const handleViewDetails = (approval) => {
    setSelectedApproval(approval);
    setShowDetailPopup(true);
  };

  const closeDetailPopup = () => {
    setShowDetailPopup(false);
    setSelectedApproval(null);
  };

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = approval.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
    approverBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '12px',
      backgroundColor: isApprover ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
      border: `1px solid ${isApprover ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
      fontSize: '13px',
      fontWeight: '600',
      color: isApprover ? '#10b981' : '#6b7280',
      marginBottom: '16px'
    },
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
    statusBadge: (status) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: `${getStatusColor(status)}20`,
      color: getStatusColor(status),
      border: `1px solid ${getStatusColor(status)}30`
    }),
    cardInfo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginBottom: '16px',
      marginTop: '16px'
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
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingTop: '16px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
      gap: '8px'
    },
    actionButton: (variant, isHovered, disabled) => {
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
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: disabled ? '#9ca3af' : (isHovered ? colors.hover : colors.bg),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transform: isHovered && !disabled ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: isHovered && !disabled ? `0 4px 12px ${colors.bg}40` : 'none',
        opacity: disabled ? 0.5 : 1
      };
    },
    modal: {
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
    modalContent: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.95)' : 'rgba(255,255,255,0.95)',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '500px',
      width: '100%',
      position: 'relative',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      backdropFilter: 'blur(20px)'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
      paddingBottom: '16px'
    },
    modalTitle: {
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
    textarea: {
      width: '100%',
      minHeight: '120px',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.8)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      fontWeight: '500',
      outline: 'none',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      fontFamily: '"Montserrat", sans-serif',
      resize: 'vertical'
    },
    modalActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '24px'
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
    },
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    }
  };

  if (isLoading) {
    return (
      <div className="admin-approvals-page" style={styles.page}>
        <div style={styles.loadingContainer}>
          <div style={{ textAlign: 'center' }}>
            <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>Loading approvals...</p>
          </div>
        </div>
      </div>
    );
  }

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
                    {(userData.firstName?.[0] || '').toUpperCase()}
                    {(userData.lastName?.[0] || '').toUpperCase()}
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
                <button style={styles.themeToggle} onClick={toggleTheme}>
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
            style={styles.tab(activeTab === tab, hoveredItem === `tab-${tab}`)}
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
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#1e293b', margin: 0 }}>
          Approvals
        </h2>
        <p style={{ fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b', margin: '4px 0 0 0' }}>
          Review and manage master plan approvals
        </p>
        
        {/* Approver Status Badge */}
        <div style={styles.approverBadge}>
          {isApprover ? (
            <>
              <UserCheck size={16} />
              Authorized Approver ({userEmail})
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              View Only ({userEmail})
            </>
          )}
        </div>
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
              {status} ({stats[status.toLowerCase().replace(' ', '')] || 0})
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
                <div style={styles.cardTitle}>{approval.title}</div>
                <div style={styles.cardMeta}>
                  Created by: {approval.createdBy} ({approval.createdByEmail}) • {approval.department} • {new Date(approval.createdDate).toLocaleDateString()}
                </div>
              </div>
              <div style={styles.statusBadge(approval.status)}>
                {approval.status}
              </div>
            </div>

            <div style={styles.cardInfo}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Start Date</div>
                <div style={styles.infoValue}>{new Date(approval.startDate).toLocaleDateString()}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>End Date</div>
                <div style={styles.infoValue}>{new Date(approval.endDate).toLocaleDateString()}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Milestones</div>
                <div style={styles.infoValue}>{approval.milestoneCount}</div>
              </div>
              {approval.approvedBy && (
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Approved By</div>
                  <div style={styles.infoValue}>{approval.approvedBy} on {new Date(approval.approvedAt).toLocaleDateString()}</div>
                </div>
              )}
              {approval.rejectedBy && (
                <>
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>Rejected By</div>
                    <div style={styles.infoValue}>{approval.rejectedBy} on {new Date(approval.rejectedAt).toLocaleDateString()}</div>
                  </div>
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>Rejection Reason</div>
                    <div style={styles.infoValue}>{approval.rejectionReason}</div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.cardActions}>
              <button
                style={styles.actionButton('view', hoveredItem === `view-${approval.id}`, false)}
                onMouseEnter={() => setHoveredItem(`view-${approval.id}`)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => handleViewDetails(approval)}
              >
                <Eye size={14} />
                View Details
              </button>
              
              {approval.canApprove && (
                <button
                  style={styles.actionButton('approve', hoveredItem === `approve-${approval.id}`, !approval.canApprove)}
                  onMouseEnter={() => setHoveredItem(`approve-${approval.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => handleApprove(approval.id, approval.status)}
                  disabled={!approval.canApprove}
                  title={approval.status === 'Approved' ? 'Re-approve this plan' : 
                         approval.status === 'Rejected' ? 'Approve (overrides rejection)' : 
                         'Approve this plan'}
                >
                  <Check size={14} />
                  {approval.status === 'Approved' ? 'Re-Approve' : 'Approve'}
                </button>
              )}
              
              {approval.canReject && (
                <button
                  style={styles.actionButton('reject', hoveredItem === `reject-${approval.id}`, !approval.canReject)}
                  onMouseEnter={() => setHoveredItem(`reject-${approval.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => openRejectionModal(approval.id, approval.status)}
                  disabled={!approval.canReject}
                  title={approval.status === 'Rejected' ? 'Update rejection reason' : 
                         approval.status === 'Approved' ? 'Reject (overrides approval)' : 
                         'Reject this plan'}
                >
                  <X size={14} />
                  {approval.status === 'Rejected' ? 'Re-Reject' : 'Reject'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredApprovals.length === 0 && (
        <div style={styles.emptyState}>
          <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            {searchTerm ? 'No approvals found' : 'No approvals in this status'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {searchTerm ? 'Try adjusting your search terms' : `No ${filterStatus.toLowerCase()} approvals at the moment`}
          </p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div style={styles.modal} onClick={() => setShowRejectionModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                {approvalToReject?.currentStatus === 'Rejected' ? 'Update Rejection' : 'Reject Master Plan'}
              </div>
              <button
                style={styles.closeButton(hoveredItem === 'close-modal')}
                onMouseEnter={() => setHoveredItem('close-modal')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => setShowRejectionModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              {approvalToReject?.currentStatus === 'Approved' && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#ef4444'
                }}>
                  ⚠️ This plan is currently <strong>Approved</strong>. Rejecting it will override the approval.
                </div>
              )}
              {approvalToReject?.currentStatus === 'Rejected' && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#3b82f6'
                }}>
                  ℹ️ This plan is already rejected. You can update the rejection reason.
                </div>
              )}
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: isDarkMode ? '#d1d5db' : '#374151',
                marginBottom: '8px',
                display: 'block'
              }}>
                Rejection Reason *
              </label>
              <textarea
                style={styles.textarea}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejection..."
              />
              <small style={{
                fontSize: '12px',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                display: 'block',
                marginTop: '8px'
              }}>
                This reason will be visible to the plan creator.
              </small>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.actionButton('view', hoveredItem === 'cancel-reject', false)}
                onMouseEnter={() => setHoveredItem('cancel-reject')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => setShowRejectionModal(false)}
              >
                Cancel
              </button>
              <button
                style={styles.actionButton('reject', hoveredItem === 'confirm-reject', false)}
                onMouseEnter={() => setHoveredItem('confirm-reject')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleReject}
              >
                <X size={14} />
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Popup (same as before, simplified) */}
      {showDetailPopup && selectedApproval && (
        <div style={styles.modal} onClick={closeDetailPopup}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>{selectedApproval.title}</div>
                <div style={{ fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '4px' }}>
                  {selectedApproval.type} • Created by {selectedApproval.createdBy}
                </div>
              </div>
              <button
                style={styles.closeButton(hoveredItem === 'close')}
                onMouseEnter={() => setHoveredItem('close')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={closeDetailPopup}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{
              minHeight: '200px',
              backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              <div>
                <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>Detailed plan information and milestones will be displayed here</p>
              </div>
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
          <div style={styles.statNumber}>{stats.pendingApproval}</div>
          <div style={styles.statLabel}>Pending Approval</div>
        </div>

        <div
          style={styles.statCard(hoveredCard === 'stat2')}
          onMouseEnter={() => setHoveredCard('stat2')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statNumber}>{stats.approved}</div>
          <div style={styles.statLabel}>Approved</div>
        </div>

        <div
          style={styles.statCard(hoveredCard === 'stat3')}
          onMouseEnter={() => setHoveredCard('stat3')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statNumber}>{stats.rejected}</div>
          <div style={styles.statLabel}>Rejected</div>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovals;