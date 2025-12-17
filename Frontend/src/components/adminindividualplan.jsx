import React, { useState, useRef, useEffect } from 'react';
import html2canvas from "html2canvas";
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
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  Search
} from 'lucide-react';

const AdminIndividualPlan = () => {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('Individual Plan');
  const [hoveredMilestone, setHoveredMilestone] = useState(null);
  const tooltipTimeoutRef = useRef(null);
  const [showMonthBoxes, setShowMonthBoxes] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'timeline'
  const [planScope, setPlanScope] = useState('my'); // 'my' | 'supervised'
  const ganttRef = useRef(null);
  const fullCardRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  const [searchTerm, setSearchTerm] = useState('');

  const [masterPlansCount, setMasterPlansCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const OPERATIONS = ["L1", "L2"];
  const [supervisedPlans, setSupervisedPlans] = useState([]);

  const hasSupervisedPlans = supervisedPlans.length > 0;

  // Refs for better cleanup and tracking
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);

  const calculateProgress = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (today <= start) return 0;
    if (today >= end) return 100;

    const totalDuration = end - start;
    const elapsed = today - start;
    return Math.round((elapsed / totalDuration) * 100);
  };

  const safeDaysDiff = (from, to) => {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (!fromDate || !toDate || isNaN(fromDate) || isNaN(toDate)) {
      return 0;
    }

    return Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));
  };

  // Parse date utility
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === "number") return new Date(dateStr);

    dateStr = String(dateStr).trim();

    // Handle ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.split("T")[0].split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    }

    // Handle DD/MM/YYYY format
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split(/[\/\-]/);
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    console.warn("⚠️ Unrecognized date format:", dateStr);
    return null;
  };

  // Simple color palette for milestones
  const getMilestoneColor = (index) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return colors[index % colors.length];
  };

  // Add this after getMilestoneColor (around line 98)
  const getStatusColor = (status) => {
    if (status?.includes('Progress')) return '#10b981';
    if (status?.includes('Complete')) return '#3b82f6';
    if (status?.includes('Risk')) return '#f59e0b';
    return '#64748b';
  };

  // Sample individual plans data - personal projects for the logged-in user
  const individualPlans = plans.map(plan => ({
    id: plan.Id,
    title: plan.Fields?.title || "Untitled Plan",
    project: plan.Project,
    status: plan.Fields?.status || "In Progress",
    progress: calculateProgress(plan.StartDate, plan.EndDate),
    startDate: plan.StartDate,
    endDate: plan.EndDate,
    lastUpdated: plan.CreatedAt
      ? new Date(plan.CreatedAt).toLocaleString()
      : "N/A",
    fields: plan.Fields // Store all fields for milestone extraction
  }));

  const supervisedIndividualPlans = supervisedPlans.map(plan => ({
    id: plan.planId,
    title: plan.project,
    project: plan.project,
    status: plan.status,
    progress: calculateProgress(plan.startDate, plan.endDate),
    startDate: plan.startDate,
    endDate: plan.endDate,
    lastUpdated: "N/A",
    ownerName: plan.name,
    fields: {} // read-only, no milestones yet
  }));


  // Enhanced background handling with better cleanup and fallbacks
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
    pageStyle.setAttribute('data-component', 'admin-individual-plan-background');

    const backgroundGradient = isDarkMode
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      /* More specific targeting to avoid conflicts */
      .admin-individual-plan-page {
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
        const existingStyles = document.querySelectorAll('[data-component="admin-individual-plan-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

  useEffect(() => {
    const fetchIndividualPlans = async () => {
      try {
        console.log("📡 Fetching individual plans...");
        const res = await fetch("http://localhost:3000/plan/individual", {
          method: "GET",
          credentials: "include", // ✅ use cookie-based auth
        });

        if (!res.ok) {
          throw new Error(`Fetch failed: ${res.status}`);
        }

        const data = await res.json();
        console.log("✅ Plans received:", data);

        setPlans(data);
      } catch (err) {
        console.error("❌ Error fetching individual plans:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIndividualPlans();
  }, []);

  useEffect(() => {
    const fetchSupervisedPlans = async () => {
      try {
        console.log("📡 Fetching supervised individual plans...");
        const res = await fetch(
          "http://localhost:3000/plan/individual/supervised",
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!res.ok) return;

        const data = await res.json();
        console.log("✅ Supervised plans received:", data);

        setSupervisedPlans(data);
      } catch (err) {
        console.error("❌ Error fetching supervised plans:", err);
      }
    };

    fetchSupervisedPlans();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("📡 Fetching user profile...");
        const res = await fetch("http://localhost:3000/user/profile", {
          method: "GET",
          credentials: "include", // ✅ send JWT cookie
        });

        if (!res.ok) {
          throw new Error(`Profile fetch failed: ${res.status}`);
        }

        const data = await res.json();
        console.log("✅ User data received:", data);
        setUser(data);
      } catch (err) {
        console.error("❌ Error fetching user profile:", err);
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchMasterPlansCount = async () => {
      try {
        console.log("📡 Fetching master plans count...");
        const res = await fetch("http://localhost:3000/plan/master", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          // Filter only plans created by this user
          const userPlans = data.filter(plan => plan.createdBy === user?.id);
          setMasterPlansCount(userPlans.length);

          // Count pending approvals
          const pending = userPlans.filter(plan =>
            plan.approvalStatus === 'Pending Approval'
          ).length;
          setPendingApprovalsCount(pending);

          console.log(`✅ Master Plans: ${userPlans.length}, Pending: ${pending}`);
        }
      } catch (err) {
        console.error("❌ Error fetching master plans count:", err);
      }
    };

    if (user?.id) {
      fetchMasterPlansCount();
    }
  }, [user]);


  const handleTabChange = (tab) => {
    console.log(`🚀 AdminIndividualPlan - Navigating to ${tab} tab`);

    if (tab === 'Master Plan') {
      console.log('🌐 Navigating to master plan page');
      window.location.href = '/adminviewplan';
    } else if (tab === 'Approvals') {
      console.log('🌐 Navigating to approvals page');
      window.location.href = '/adminapprovals';
    } else {
      console.log('📍 Staying on individual plan page');
    }
  };

  const handleCreateIndividualPlan = () => {
    console.log('🚀 AdminIndividualPlan - Creating new individual plan');
    window.location.href = '/adminaddindividualplan';
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#10b981';
    if (progress >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const activePlans =
    planScope === 'my'
      ? individualPlans
      : supervisedIndividualPlans;

  const filteredPlans = activePlans.filter(plan => {
    const title = plan.title || '';
    const project = plan.project || '';

    return (
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
    createButton: (isHovered) => ({
      backgroundColor: isHovered ? '#059669' : '#10b981',
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
      boxShadow: isHovered ? '0 8px 25px rgba(16,185,129,0.3)' : '0 4px 12px rgba(16,185,129,0.2)'
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
    searchContainer: {
      position: 'relative',
      marginBottom: '24px',
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
      fontFamily: '"Montserrat", sans-serif',
      boxSizing: 'border-box'
    },
    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
    },
    viewModeToggle: {
      display: 'flex',
      gap: '4px',
      padding: '4px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      marginBottom: '24px',
      maxWidth: 'fit-content'
    },
    viewModeButton: (isActive) => ({
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: isActive ? '#3b82f6' : 'transparent',
      color: isActive ? '#fff' : (isDarkMode ? '#e2e8f0' : '#64748b'),
      boxShadow: isActive ? '0 2px 8px rgba(59,130,246,0.3)' : 'none'
    }),
    plansGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    },
    planCard: (isHovered) => ({
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
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
      overflow: 'hidden',
      cursor: 'pointer'
    }),
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    planTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px',
      transition: 'all 0.3s ease'
    },
    planOwner: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
    },
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: (isHovered, color = '#64748b') => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? `${color}15` : 'transparent',
      color: isHovered ? color : isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }),
    statusBadge: (status) => ({
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: `${getStatusColor(status)}20`,
      color: getStatusColor(status),
      marginBottom: '16px'
    }),
    progressContainer: {
      marginBottom: '16px'
    },
    progressLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    },
    progressText: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transition: 'all 0.3s ease'
    },
    progressPercentage: (progress) => ({
      fontSize: '14px',
      fontWeight: '700',
      color: getProgressColor(progress)
    }),
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    progressFill: (progress) => ({
      width: `${progress}%`,
      height: '100%',
      backgroundColor: getProgressColor(progress),
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    }),
    planStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      marginBottom: '16px'
    },
    statItem: {
      textAlign: 'center',
      padding: '12px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    statNumber: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px',
      transition: 'all 0.3s ease'
    },
    statLabel: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
      transition: 'all 0.3s ease'
    },
    planFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '16px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)'
    },
    dateRange: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
    },
    lastUpdated: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontStyle: 'italic',
      transition: 'all 0.3s ease'
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
    statCardNumber: {
      fontSize: '36px',
      fontWeight: '800',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px',
      transition: 'all 0.3s ease'
    },
    statCardLabel: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      transition: 'all 0.3s ease'
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      margin: 0,
      transition: 'all 0.3s ease'
    },
    sectionSubtitle: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      margin: '4px 0 0 0',
      transition: 'all 0.3s ease'
    },
    planTypeBadge: (isOperation) => ({
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      marginBottom: '8px',
      backgroundColor: isOperation
        ? 'rgba(168,85,247,0.15)'   // purple
        : 'rgba(59,130,246,0.15)', // blue
      color: isOperation
        ? '#a855f7'
        : '#3b82f6'
    }),
    // Gantt Chart Styles (copied from Master Plan)
    ganttContainer: {
      marginTop: '24px',
      overflowX: 'auto',
      overflowY: 'visible',
      position: 'relative',
      paddingTop: '60px',
      paddingBottom: '30px',
      minHeight: '300px',
      maxWidth: '100%'
    },
    ganttCard: (isHovered) => ({
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
      overflow: 'visible'
    }),
    taskHeader: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      padding: '8px 12px',
      transition: 'all 0.3s ease'
    },
    monthHeader: {
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      padding: '8px 4px',
      transition: 'all 0.3s ease',
      borderBottom: isDarkMode ? '2px solid #4b5563' : '2px solid #cbd5e1'
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
      transition: 'all 0.3s ease'
    },
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
    milestoneTooltip: {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '8px',
      maxWidth: '300px',
      minWidth: '200px',
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)',
      zIndex: 9999,
      pointerEvents: 'auto',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      wordBreak: 'break-word'
    },
    checkbox: (isChecked) => ({
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      border: isChecked ? '2px solid #3b82f6' : isDarkMode ? '2px solid #64748b' : '2px solid #cbd5e1',
      backgroundColor: isChecked ? '#3b82f6' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '700',
      transition: 'all 0.2s ease'
    })
  };

  // Render Gantt Chart Timeline
  const renderTimelineView = () => {
    if (filteredPlans.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
          <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            No assignments found
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {searchTerm ? 'Try adjusting your search terms' : 'You have no project assignments at the moment'}
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {filteredPlans.map(plan => {
          // Extract milestones for this plan
          const milestones = [];
          if (plan.fields) {
            Object.entries(plan.fields).forEach(([key, value]) => {
              if (key !== 'title' && key !== 'status' && typeof value === 'string') {
                const dateRange = value.split(' - ');
                if (dateRange.length === 2) {
                  const startDate = parseLocalDate(dateRange[0].trim());
                  const endDate = parseLocalDate(dateRange[1].trim());
                  if (startDate && endDate) {
                    milestones.push({
                      name: key,
                      startDate,
                      endDate,
                      color: getMilestoneColor(milestones.length)
                    });
                  }
                }
              }
            });
          }

          // Calculate timeline range for this plan
          const allDates = milestones.flatMap(m => [m.startDate, m.endDate]);
          if (allDates.length === 0) return null;

          const earliestStart = new Date(Math.min(...allDates));
          const latestEnd = new Date(Math.max(...allDates));
          const totalMonths = Math.ceil((latestEnd - earliestStart) / (1000 * 60 * 60 * 24 * 30)) + 1;

          const months = [];
          for (let i = 0; i < totalMonths; i++) {
            const monthDate = new Date(earliestStart);
            monthDate.setMonth(earliestStart.getMonth() + i);
            months.push({
              label: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              date: new Date(monthDate)
            });
          }

          return (
            <div
              key={plan.id}
              style={styles.ganttCard(hoveredCard === `timeline-${plan.id}`)}
              onMouseEnter={() => setHoveredCard(`timeline-${plan.id}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Card Header */}
              <div style={{ marginBottom: '20px' }}>
                <div style={styles.planTypeBadge(OPERATIONS.includes(plan.project))}>
                  {OPERATIONS.includes(plan.project) ? 'OPERATION' : 'PROJECT'}
                </div>
                <div style={styles.planTitle}>{plan.title}</div>
                <div style={styles.planOwner}>Project: {plan.project}</div>
              </div>

              {/* Mini Gantt Chart for this plan */}
              <div style={{ position: 'relative', overflowX: 'auto', minHeight: '120px' }}>
                {/* Month Headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${months.length}, 1fr)`,
                  gap: '0',
                  marginBottom: '12px',
                  backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
                  borderRadius: '8px',
                  padding: '8px 0'
                }}>
                  {months.map((month, idx) => (
                    <div key={idx} style={{
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: isDarkMode ? '#e2e8f0' : '#475569'
                    }}>
                      {month.label}
                    </div>
                  ))}
                </div>

                {/* Milestones */}
                <div style={{ position: 'relative', height: `${milestones.length * 32}px` }}>
                  {milestones.map((milestone, mIdx) => {
                    const getMonthIndex = (date) => {
                      for (let i = 0; i < months.length; i++) {
                        const m = months[i].date;
                        if (date.getFullYear() === m.getFullYear() && date.getMonth() === m.getMonth()) {
                          return i;
                        }
                      }
                      return -1;
                    };

                    const startMonthIdx = getMonthIndex(milestone.startDate);
                    const endMonthIdx = getMonthIndex(milestone.endDate);

                    if (startMonthIdx === -1 || endMonthIdx === -1) return null;

                    const daysInStartMonth = new Date(
                      milestone.startDate.getFullYear(),
                      milestone.startDate.getMonth() + 1,
                      0
                    ).getDate();

                    const daysInEndMonth = new Date(
                      milestone.endDate.getFullYear(),
                      milestone.endDate.getMonth() + 1,
                      0
                    ).getDate();

                    const startOffset = (milestone.startDate.getDate() / daysInStartMonth) * 100;
                    const endOffset = (milestone.endDate.getDate() / daysInEndMonth) * 100;

                    const left = `calc((100% * (${startMonthIdx} / ${months.length})) + (100% * (${startOffset} / 100 / ${months.length})))`;
                    const width = `calc(((100% * ((${endMonthIdx} - ${startMonthIdx}) / ${months.length}))) + ((100% * ((${endOffset} - ${startOffset}) / 100 / ${months.length}))))`;

                    return (
                      <div
                        key={mIdx}
                        style={{
                          position: 'absolute',
                          left: left,
                          width: width,
                          top: `${mIdx * 32}px`,
                          height: '24px',
                          backgroundColor: milestone.color,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={() => setHoveredMilestone(`${plan.id}-${mIdx}`)}
                        onMouseLeave={() => setHoveredMilestone(null)}
                      >
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          padding: '0 8px'
                        }}>
                          {milestone.name}
                        </span>

                        {/* Tooltip */}
                        {hoveredMilestone === `${plan.id}-${mIdx}` && (
                          <div style={styles.milestoneTooltip}>
                            <div style={{ marginBottom: '4px', fontWeight: '700' }}>
                              {milestone.name}
                            </div>
                            <div style={{ fontSize: '11px', opacity: 0.9 }}>
                              {milestone.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {milestone.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="admin-individual-plan-page" style={styles.page}>
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
                  <div style={styles.avatar}>
                    {user
                      ? user.firstName?.[0]?.toUpperCase() + user.lastName?.[0]?.toUpperCase()
                      : "?"}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
                    </div>
                    <div style={styles.userRole}>
                      {user
                        ? `${user.role || "User"} • ${user.department || "Department"}`
                        : ""}
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

      {/* Individual Plan Header */}
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>My Individual Plan</h2>
          <p style={styles.sectionSubtitle}>
            Your assigned projects and personal timeline
          </p>
        </div>
        <button
          style={styles.createButton(hoveredItem === 'create')}
          onMouseEnter={() => setHoveredItem('create')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={() => {
            window.location.href = '/adminaddindividualplan';
          }}
        >
          <Plus size={16} />
          Add New Assignment
        </button>
      </div>

      {/* Search and View Mode Toggle */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>

        {/* Search */}
        <div style={styles.searchContainer}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder={
              planScope === 'my'
                ? 'Search your assignments by title or project...'
                : 'Search supervised assignments...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Plan Scope Toggle */}
        <div style={styles.viewModeToggle}>
          <button
            style={styles.viewModeButton(planScope === 'my')}
            onClick={() => setPlanScope('my')}
          >
            My Plans
          </button>

          {hasSupervisedPlans && (
            <button
              style={styles.viewModeButton(planScope === 'supervised')}
              onClick={() => setPlanScope('supervised')}
            >
              Supervised Plans
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div style={styles.viewModeToggle}>
          <button
            style={styles.viewModeButton(viewMode === 'cards')}
            onClick={() => setViewMode('cards')}
          >
            Progress View
          </button>
          <button
            style={styles.viewModeButton(viewMode === 'timeline')}
            onClick={() => setViewMode('timeline')}
          >
            Timeline View
          </button>
        </div>

      </div>

      {/* Conditional Rendering: Cards or Timeline */}
      {viewMode === 'cards' ? (
        <>
          {/* Plans Grid */}
          <div style={styles.plansGrid}>
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                style={styles.planCard(hoveredCard === `plan-${plan.id}`)}
                onMouseEnter={() => setHoveredCard(`plan-${plan.id}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.planTypeBadge(OPERATIONS.includes(plan.project))}>
                      {OPERATIONS.includes(plan.project) ? 'OPERATION' : 'PROJECT'}
                    </div>

                    <div style={styles.planTitle}>{plan.title}</div>
                    <div style={styles.planOwner}>Project: {plan.project}</div>

                    {planScope === 'supervised' && plan.ownerName && (
                      <div style={styles.planOwner}>
                        Owner: {plan.ownerName}
                      </div>
                    )}
                  </div>
                  {planScope === 'my' && (
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.actionButton(hoveredItem === `view-${plan.id}`, '#3b82f6')}
                        onMouseEnter={() => setHoveredItem(`view-${plan.id}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        style={styles.actionButton(hoveredItem === `status-${plan.id}`, '#10b981')}
                        onMouseEnter={() => setHoveredItem(`status-${plan.id}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        title="Update Status"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        style={styles.actionButton(hoveredItem === `edit-${plan.id}`, '#f59e0b')}
                        onMouseEnter={() => setHoveredItem(`edit-${plan.id}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => {
                          window.location.href = '/admineditindividualplan';
                        }}
                        title="Edit Plan"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={styles.statusBadge(plan.status)}>
                  {plan.status}
                </div>

                <div style={styles.progressContainer}>
                  <div style={styles.progressLabel}>
                    <span style={styles.progressText}>Progress</span>
                    <span style={styles.progressPercentage(plan.progress)}>{plan.progress}%</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={styles.progressFill(plan.progress)}></div>
                  </div>
                </div>

                <div style={styles.planStats}>
                  <div style={styles.statItem}>
                    {/* <div style={styles.statNumber}>{Math.max(0, Math.floor((new Date(plan.endDate) - new Date()) / (1000 * 60 * 60 * 24)))}</div> */}
                    <div style={styles.statNumber}>
                      {Math.max(0, safeDaysDiff(new Date(), plan.endDate))}
                    </div>
                    <div style={styles.statLabel}>Days Left</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>
                      {Math.max(0, safeDaysDiff(plan.startDate, new Date()))}
                    </div>
                    <div style={styles.statLabel}>Days Elapsed</div>
                  </div>
                </div>

                <div style={styles.planFooter}>
                  <div style={styles.dateRange}>
                    {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                  </div>
                  <div style={styles.lastUpdated}>
                    Updated {plan.lastUpdated}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredPlans.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: isDarkMode ? '#94a3b8' : '#64748b'
            }}>
              <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                {searchTerm ? 'No assignments found' : 'No assignments yet'}
              </h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {searchTerm ? 'Try adjusting your search terms' : 'You have no project assignments at the moment'}
              </p>
            </div>
          )}
        </>
      ) : (
        renderTimelineView()
      )}

      {/* Statistics */}
      <div style={styles.statsContainer}>
        <div
          style={styles.statCard(hoveredCard === 'stat1')}
          onMouseEnter={() => setHoveredCard('stat1')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>
          <div style={styles.statCardNumber}>{masterPlansCount}</div>
          <div style={styles.statCardLabel}>Master Plans</div>
        </div>

        <div
          style={styles.statCard(hoveredCard === 'stat2')}
          onMouseEnter={() => setHoveredCard('stat2')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>
          <div style={styles.statCardNumber}>{individualPlans.length}</div>
          <div style={styles.statCardLabel}>Individual Plans</div>
        </div>

        <div
          style={styles.statCard(hoveredCard === 'stat3')}
          onMouseEnter={() => setHoveredCard('stat3')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>
          <div style={styles.statCardNumber}>{pendingApprovalsCount}</div>
          <div style={styles.statCardLabel}>Pending Approval</div>
        </div>
      </div>
    </div>
  );
};

export default AdminIndividualPlan;