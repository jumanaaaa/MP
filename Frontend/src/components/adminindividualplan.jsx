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
import { apiFetch } from '../utils/api';
import Dropdown from '../components/Dropdown';

const AdminIndividualPlan = () => {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('Individual Plan');
  const tooltipTimeoutRef = useRef(null);
  const [showMonthBoxes, setShowMonthBoxes] = useState(false);
  const [planScope, setPlanScope] = useState('my'); // 'my' | 'supervised'
  const ganttRefs = useRef({});
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'waterfall'
  const fullCardRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState('All Types');
  const [masterPlansCount, setMasterPlansCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const OPERATIONS = ["L1", "L2"];
  const [supervisedPlans, setSupervisedPlans] = useState([]);

  const [subtitleIndex, setSubtitleIndex] = useState(0);

  const hasSupervisedPlans = supervisedPlans.length > 0;

  // Refs for better cleanup and tracking
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);

  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const milestoneRefs = useRef({});

  const tooltipHoverRef = useRef(false);


  const [activeTooltip, setActiveTooltip] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

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

  //   after getMilestoneColor (around line 98)
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
    projectType: plan.ProjectType || 'custom',
    status: plan.Fields?.status || "In Progress",
    progress: calculateProgress(plan.StartDate, plan.EndDate),
    startDate: plan.StartDate,
    endDate: plan.EndDate,
    lastUpdated: plan.CreatedAt
      ? new Date(plan.CreatedAt).toLocaleString()
      : "N/A",
    fields: plan.Fields // Store all fields for milestone extraction
  }));

  const subtitleMessages = [
    'Your assigned projects and personal timeline',
    () => `${individualPlans.length} active individual plans`,
    () => planScope === 'my'
      ? 'Currently viewing: My Plans'
      : 'Currently viewing: Supervised Plans'
  ];

  const supervisedIndividualPlans = supervisedPlans.map(plan => ({
    id: plan.id,
    title: plan.project,
    project: plan.project,
    projectType: plan.projectType || 'custom', // 🆕  
    status: plan.status,
    progress: calculateProgress(plan.startDate, plan.endDate),
    startDate: plan.startDate,
    endDate: plan.endDate,
    lastUpdated: "N/A",
    ownerName: plan.ownerName,
    fields: plan.fields // read-only, no milestones yet
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

      @keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
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
    const fetchAllData = async () => {
      try {
        console.log("📡 Fetching individual plans and weekly allocations...");

        // Fetch structure plans
        const plansRes = await apiFetch('/plan/individual', {
          method: "GET",
          credentials: "include",
        });

        if (!plansRes.ok) {
          throw new Error(`Plans fetch failed: ${plansRes.status}`);
        }

        const plansData = await plansRes.json();
        console.log("✅ Plans received:", plansData);
        setPlans(plansData);

        // Fetch MY weekly allocations
        const weeklyRes = await apiFetch('/api/weekly-allocations/all', {
          method: "GET",
          credentials: "include",
        });

        if (weeklyRes.ok) {
          const weeklyData = await weeklyRes.json();
          console.log("✅ Weekly allocations received:", weeklyData);

          // Convert weekly allocations to timeline format
          const weeklyPlans = convertWeeklyToTimeline(weeklyData || []);
          console.log("✅ Converted weekly plans:", weeklyPlans);

          // Merge with individual plans
          setPlans(prevPlans => [...prevPlans, ...weeklyPlans]);
        }

      } catch (err) {
        console.error("❌ Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    const fetchSupervisedData = async () => {
      if (planScope !== 'supervised') return; // Only fetch when on supervised tab

      try {
        console.log("📡 Fetching supervised data...");

        // Fetch supervised individual plans (already exists)
        const supervisedPlansRes = await apiFetch('/plan/individual/supervised', {
          method: "GET",
          credentials: "include",
        });

        if (supervisedPlansRes.ok) {
          const supervisedPlansData = await supervisedPlansRes.json();
          console.log("✅ Supervised individual plans received:", supervisedPlansData);
          setSupervisedPlans(supervisedPlansData);
        }

        // Fetch supervised weekly allocations
        const supervisedWeeklyRes = await apiFetch('/api/weekly-allocations/supervised', {
          method: "GET",
          credentials: "include",
        });

        if (supervisedWeeklyRes.ok) {
          const supervisedWeeklyData = await supervisedWeeklyRes.json();
          console.log("✅ Supervised weekly allocations:", supervisedWeeklyData);

          // Convert to timeline format and merge with supervised plans
          const supervisedWeeklyPlans = convertWeeklyToTimeline(supervisedWeeklyData || []);

          // Add these to supervisedPlans state (not to plans state)
          setSupervisedPlans(prevPlans => {
            // First, add the structured plans
            const structuredPlans = supervisedPlansData || [];

            // Then merge with weekly allocations
            return [...structuredPlans, ...supervisedWeeklyPlans.map(wp => ({
              id: wp.Id,
              project: wp.Project,
              projectType: wp.ProjectType,
              startDate: wp.StartDate,
              endDate: wp.EndDate,
              status: 'Ongoing',
              fields: wp.Fields,
              ownerName: 'Supervised User' // You might want to add ownerName to the backend response
            }))];
          });
        }

      } catch (err) {
        console.error("❌ Error fetching supervised data:", err);
      }
    };

    fetchSupervisedData();
  }, [planScope]);

  // Helper function to convert WeeklyAllocations to timeline format
  const convertWeeklyToTimeline = (allocations) => {
    const grouped = {};

    allocations.forEach(alloc => {
      const key = `${alloc.ProjectName}-${alloc.ProjectType}`;

      if (!grouped[key]) {
        grouped[key] = {
          Id: `weekly-${alloc.ProjectName}-${Date.now()}`,
          Project: alloc.ProjectName,
          ProjectType: alloc.ProjectType,
          StartDate: alloc.WeekStart,
          EndDate: alloc.WeekEnd,
          CreatedAt: alloc.CreatedAt,
          Fields: {
            title: `${alloc.ProjectName} (Weekly Allocation)`,
            status: 'Ongoing'
          },
          isWeeklyAllocation: true,
          weeks: []
        };
      }

      // Add this week to the project
      grouped[key].weeks.push({
        name: `Week of ${new Date(alloc.WeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        startDate: alloc.WeekStart,
        endDate: alloc.WeekEnd,
        status: 'Ongoing',
        allocatedHours: alloc.PlannedHours,
        tasks: alloc.Tasks || []
      });

      // Update overall date range
      const allocStart = new Date(alloc.WeekStart);
      const allocEnd = new Date(alloc.WeekEnd);
      const groupStart = new Date(grouped[key].StartDate);
      const groupEnd = new Date(grouped[key].EndDate);

      if (allocStart < groupStart) grouped[key].StartDate = alloc.WeekStart;
      if (allocEnd > groupEnd) grouped[key].EndDate = alloc.WeekEnd;
    });

    // Convert grouped object to array and add weeks to Fields
    return Object.values(grouped).map(group => {
      group.weeks.forEach(week => {
        group.Fields[week.name] = {
          startDate: week.startDate,
          endDate: week.endDate,
          status: week.status
        };
      });
      return group;
    });
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log("📡 Fetching user profile...");
        const res = await apiFetch('/user/profile', {
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
        const res = await apiFetch('/plan/master', {
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

  useEffect(() => {
    const interval = setInterval(() => {
      setSubtitleIndex(prev => (prev + 1) % subtitleMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [individualPlans.length, planScope]);

  useEffect(() => {
    const styleId = 'individual-plan-scrollbar-style';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = styleId;

    style.innerHTML = isDarkMode
      ? `
      /* Dark mode scrollbar */
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      ::-webkit-scrollbar-track {
        background: #1e293b;
      }
      ::-webkit-scrollbar-thumb {
        background-color: #475569;
        border-radius: 10px;
        border: 2px solid #1e293b;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: #64748b;
      }
      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: #475569 #1e293b;
      }
    `
      : `
      /* Light mode scrollbar */
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      ::-webkit-scrollbar-track {
        background: #f1f5f9;
      }
      ::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
        border-radius: 10px;
        border: 2px solid #f1f5f9;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: #94a3b8;
      }
      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f1f5f9;
      }
    `;

    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [isDarkMode]);


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

  const activePlans =
    planScope === 'my'
      ? individualPlans
      : supervisedIndividualPlans;

  const filteredPlans = activePlans.filter(plan => {
    const title = plan.title || '';
    const project = plan.project || '';

    // Search filter
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.toLowerCase().includes(searchTerm.toLowerCase());

    // Project type filter - map display name to actual value
    const typeMapping = {
      'All Types': 'all',
      'Master Plan': 'master-plan',
      'Operations': 'operation',
      'Custom Projects': 'custom',
      'Planned Leave': 'planned-leave'
    };

    const actualType = typeMapping[projectTypeFilter] || projectTypeFilter;
    const matchesType = projectTypeFilter === 'All Types' || actualType === 'all' || plan.projectType === actualType;

    return matchesSearch && matchesType;
  });

  const isProjectFiltered = filteredPlans.length === 1;

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
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 1
    },
    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease',
      zIndex: 2,
      pointerEvents: 'none'
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
      display: 'block',   // or flex
      width: '100%',
      marginTop: '32px'
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
      zIndex: 1
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
      zIndex: 99999,
      pointerEvents: 'auto',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      wordBreak: 'break-word'
    },
    rulerTick: {
      position: 'absolute',
      bottom: 0,
      width: '1px',
      height: '8px',
      backgroundColor: isDarkMode ? '#64748b' : '#cbd5e1'
    },
    rulerMajorTick: {
      position: 'absolute',
      bottom: 0,
      width: '2px',
      height: '12px',
      backgroundColor: isDarkMode ? '#94a3b8' : '#94a3b8'
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

    // Calculate timeline boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allDates = [];
    filteredPlans.forEach((plan) => {
      if (plan.startDate) allDates.push(parseLocalDate(plan.startDate));
      if (plan.endDate) allDates.push(parseLocalDate(plan.endDate));

      if (plan.fields) {
        Object.values(plan.fields).forEach((field) => {
          if (field.startDate) allDates.push(parseLocalDate(field.startDate));
          if (field.endDate) allDates.push(parseLocalDate(field.endDate));
        });
      }
    });

    const validDates = allDates.filter((d) => d && !isNaN(d));
    const earliestStart = new Date(Math.min(...validDates));
    const latestEnd = new Date(Math.max(...validDates));

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

    const getMonthIndex = (date) => {
      for (let i = 0; i < months.length; i++) {
        const m = months[i].date;
        if (date.getFullYear() === m.getFullYear() && date.getMonth() === m.getMonth()) {
          return i;
        }
      }
      return -1;
    };

    // Find today's position
    let todayMonthIndex = -1;
    let todayPercentInMonth = 0;

    for (let i = 0; i < months.length; i++) {
      const monthStart = new Date(months[i].date);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      if (today >= monthStart && today <= monthEnd) {
        todayMonthIndex = i;
        const daysInMonth = monthEnd.getDate();
        const dayOfMonth = today.getDate();
        todayPercentInMonth = (dayOfMonth / daysInMonth) * 100;
        break;
      }
    }

    // Group plans: Separate individual plans from weekly allocations
    const individualPlansOnly = filteredPlans.filter(p => !p.isWeeklyAllocation);
    const weeklyAllocationsOnly = filteredPlans.filter(p => p.isWeeklyAllocation);

    // Group weekly allocations by project
    const weeklyByProject = {};
    weeklyAllocationsOnly.forEach(weekly => {
      const key = `${weekly.Project}-${weekly.ProjectType}`;
      if (!weeklyByProject[key]) {
        weeklyByProject[key] = [];
      }
      weeklyByProject[key].push(weekly);
    });

    return (
      <>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: isDarkMode ? '#e2e8f0' : '#1e293b',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Calendar size={20} />
          {planScope === 'my' ? 'My Assignments Timeline' : 'Supervised Assignments Timeline'}
        </div>

        <div
          ref={fullCardRef}
          style={{
            ...styles.ganttCard(hoveredCard === 'gantt'),
            marginTop: '24px'
          }}
          onMouseEnter={() => setHoveredCard('gantt')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.ganttContainer}>
            {/* Month Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
              gap: '0',
              marginBottom: '16px',
              backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
              borderRadius: '12px',
              position: 'relative'
            }}>
              <div style={styles.taskHeader}>Assignment</div>
              {months.map((month, idx) => (
                <div key={idx} style={{
                  ...styles.monthHeader,
                  minWidth: 0,
                  width: '100%',
                  position: 'relative'
                }}>
                  {month.label}
                  {[0, 25, 50, 75, 100].map((percent, tickIdx) => (
                    <div
                      key={tickIdx}
                      style={{
                        ...(tickIdx === 0 || tickIdx === 4 ? styles.rulerMajorTick : styles.rulerTick),
                        left: `calc(${percent}% - 1px)`
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Plan Rows with Nested Weekly Allocations */}
            {individualPlansOnly.map((plan, planIndex) => {
              const projectKey = `${plan.Project}-${plan.ProjectType}`;
              const weeklyAllocations = weeklyByProject[projectKey] || [];

              // Extract milestones from individual plan
              const milestones = [];
              const isLeave = plan.fields?.leaveType || plan.projectType === 'leave';

              if (plan.fields) {
                Object.entries(plan.fields).forEach(([key, value]) => {
                  if (['title', 'status', 'leaveType', 'leaveReason'].includes(key)) return;

                  let startDate, endDate, status;

                  if (typeof value === 'string') {
                    const [s, e] = value.split(' - ');
                    startDate = parseLocalDate(s);
                    endDate = parseLocalDate(e);
                    status = 'Ongoing';
                  } else if (value?.startDate && value?.endDate) {
                    startDate = parseLocalDate(value.startDate);
                    endDate = parseLocalDate(value.endDate);
                    status = value.status || 'Ongoing';
                  }

                  if (startDate && endDate) {
                    milestones.push({
                      name: key,
                      startDate,
                      endDate,
                      status,
                      color: isLeave ? '#8b5cf6' : (status?.toLowerCase().includes('complete') ? '#3b82f6' : '#10b981')
                    });
                  }
                });
              }

              milestones.sort((a, b) => {
                if (!a.startDate && !b.startDate) return 0;
                if (!a.startDate) return 1;
                if (!b.startDate) return -1;
                return a.startDate - b.startDate;
              });

              const totalMilestones = milestones.length;
              const completedMilestones = milestones.filter(m =>
                m.status?.toLowerCase().includes('complete')
              ).length;
              const progressPercent = totalMilestones > 0
                ? Math.round((completedMilestones / totalMilestones) * 100)
                : 0;

              return (
                <React.Fragment key={plan.id}>
                  {/* ========== PARENT ROW: Individual Plan ========== */}
                  <div style={{ position: 'relative', marginBottom: '4px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                      gap: '0',
                      alignItems: 'center'
                    }}>
                      {/* Plan Name Column */}
                      <div style={{
                        ...styles.taskName,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '80px',
                        justifyContent: 'center',
                        borderLeft: '3px solid #3b82f6'
                      }}>
                        <div style={styles.planTypeBadge(OPERATIONS.includes(plan.project))}>
                          {OPERATIONS.includes(plan.project) ? 'OPERATION' : plan.projectType?.toUpperCase() || 'PROJECT'}
                        </div>

                        {planScope === 'supervised' && (
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: '700',
                            marginBottom: '6px',
                            backgroundColor: 'rgba(239,68,68,0.15)',
                            color: '#ef4444',
                            width: 'fit-content'
                          }}>
                            READ-ONLY
                          </div>
                        )}

                        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>
                          {plan.title}
                        </div>
                        <div style={{ fontSize: '11px', color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '6px' }}>
                          {plan.project}
                        </div>

                        {/* Action Buttons */}
                        {planScope === 'my' && (
                          <div style={styles.actionButtons}>
                            <button
                              style={styles.actionButton(hoveredItem === `edit-${plan.id}`, '#3b82f6')}
                              onMouseEnter={() => setHoveredItem(`edit-${plan.id}`)}
                              onMouseLeave={() => setHoveredItem(null)}
                              title="Edit Plan"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/admineditindividualplan/${plan.id}`;
                              }}
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div style={{ marginTop: '4px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '2px'
                          }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              color: isDarkMode ? '#94a3b8' : '#64748b'
                            }}>
                              {completedMilestones}/{totalMilestones}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              color: progressPercent === 100 ? '#10b981' : '#3b82f6'
                            }}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div style={{
                            height: '4px',
                            backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${progressPercent}%`,
                              backgroundColor: progressPercent === 100 ? '#10b981' : '#3b82f6',
                              borderRadius: '2px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Month Grid Cells */}
                      {months.map((month, monthIdx) => (
                        <div key={monthIdx} style={{
                          ...styles.ganttCell,
                          position: 'relative',
                          minWidth: 0,
                          width: '100%'
                        }} />
                      ))}
                    </div>

                    {/* Milestone Bars */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '100%',
                      display: 'grid',
                      gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                      gap: '0',
                      pointerEvents: 'none'
                    }}>
                      <div />
                      {milestones.map((milestone, mIdx) => {
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

                        const left = `calc(200px + ((100% - 200px) / ${months.length}) * ${startMonthIdx} + ((100% - 200px) / ${months.length}) * ${startOffset / 100})`;
                        const width = `calc(((100% - 200px) / ${months.length}) * ${endMonthIdx - startMonthIdx} + ((100% - 200px) / ${months.length}) * ${(endOffset - startOffset) / 100})`;

                        return (
                          <div
                            key={mIdx}
                            style={{
                              position: 'absolute',
                              left,
                              width,
                              top: '50%',
                              transform: 'translateY(-50%)',
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
                              cursor: 'pointer',
                              zIndex: 999,
                              pointerEvents: 'auto'
                            }}
                            onMouseEnter={(e) => {
                              const barRect = e.currentTarget.getBoundingClientRect();
                              const cardRect = fullCardRef.current.getBoundingClientRect();
                              setActiveTooltip({ planId: plan.id, milestone, barRect, cardRect, isTopRow: planIndex === 0 });
                            }}
                            onMouseLeave={() => {
                              requestAnimationFrame(() => {
                                if (!tooltipHoverRef.current) {
                                  setActiveTooltip(null);
                                }
                              });
                            }}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              padding: '0 8px'
                            }}>
                              {milestone.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ========== CHILD ROWS: Weekly Allocations ========== */}
                  {weeklyAllocations.length > 0 && weeklyAllocations.map((weeklyPlan, weekIdx) => {
                    // Extract weeks from weekly allocation
                    const weeks = [];
                    if (weeklyPlan.fields) {
                      Object.entries(weeklyPlan.fields).forEach(([key, value]) => {
                        if (['title', 'status'].includes(key)) return;

                        if (value?.startDate && value?.endDate) {
                          weeks.push({
                            name: key,
                            startDate: parseLocalDate(value.startDate),
                            endDate: parseLocalDate(value.endDate),
                            status: value.status || 'Ongoing',
                            allocatedHours: value.allocatedHours || 0
                          });
                        }
                      });
                    }

                    return weeks.map((week, wIdx) => {
                      const startMonthIdx = getMonthIndex(week.startDate);
                      const endMonthIdx = getMonthIndex(week.endDate);

                      if (startMonthIdx === -1 || endMonthIdx === -1) return null;

                      const daysInStartMonth = new Date(
                        week.startDate.getFullYear(),
                        week.startDate.getMonth() + 1,
                        0
                      ).getDate();

                      const daysInEndMonth = new Date(
                        week.endDate.getFullYear(),
                        week.endDate.getMonth() + 1,
                        0
                      ).getDate();

                      const startOffset = (week.startDate.getDate() / daysInStartMonth) * 100;
                      const endOffset = (week.endDate.getDate() / daysInEndMonth) * 100;

                      const left = `calc(200px + ((100% - 200px) / ${months.length}) * ${startMonthIdx} + ((100% - 200px) / ${months.length}) * ${startOffset / 100})`;
                      const width = `calc(((100% - 200px) / ${months.length}) * ${endMonthIdx - startMonthIdx} + ((100% - 200px) / ${months.length}) * ${(endOffset - startOffset) / 100})`;

                      return (
                        <div key={`${weeklyPlan.Id}-week-${wIdx}`} style={{ position: 'relative', marginBottom: '4px' }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                            gap: '0',
                            alignItems: 'center'
                          }}>
                            {/* Week Name Column (Indented) */}
                            <div style={{
                              ...styles.taskName,
                              paddingLeft: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              minHeight: '50px',
                              backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.5)',
                              borderLeft: '2px solid #f59e0b'
                            }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                                  ↳ {week.name}
                                </div>
                                <div style={{ fontSize: '10px', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                                  {week.allocatedHours}h planned
                                </div>
                              </div>

                              {/* Edit Button */}
                              {planScope === 'my' && (
                                <button
                                  style={styles.actionButton(hoveredItem === `edit-week-${weeklyPlan.Id}-${wIdx}`, '#f59e0b')}
                                  onMouseEnter={() => setHoveredItem(`edit-week-${weeklyPlan.Id}-${wIdx}`)}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  title="Edit Weekly Allocation"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const params = new URLSearchParams({
                                      projectName: plan.project,
                                      projectType: plan.projectType,
                                      isWeekly: 'true'
                                    });
                                    window.location.href = `/admineditindividualplan?${params.toString()}`;
                                  }}
                                >
                                  <Edit size={12} />
                                </button>
                              )}
                            </div>

                            {/* Month Grid Cells */}
                            {months.map((month, monthIdx) => (
                              <div key={monthIdx} style={{ ...styles.ganttCell, position: 'relative', minWidth: 0, width: '100%' }} />
                            ))}
                          </div>

                          {/* Week Bar */}
                          <div
                            style={{
                              position: 'absolute',
                              left,
                              width,
                              height: '20px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              backgroundColor: '#f59e0b',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                              cursor: 'pointer',
                              zIndex: 999
                            }}
                            onMouseEnter={(e) => {
                              const barRect = e.currentTarget.getBoundingClientRect();
                              const cardRect = fullCardRef.current.getBoundingClientRect();
                              setActiveTooltip({
                                planId: plan.id,
                                milestone: week,
                                barRect,
                                cardRect,
                                isTopRow: false,
                                isWeekly: true
                              });
                            }}
                            onMouseLeave={() => {
                              requestAnimationFrame(() => {
                                if (!tooltipHoverRef.current) {
                                  setActiveTooltip(null);
                                }
                              });
                            }}
                          >
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              padding: '0 4px'
                            }}>
                              {week.allocatedHours}h
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })}
                </React.Fragment>
              );
            })}

            {/* Today Line */}
            {todayMonthIndex !== -1 && (
              <>
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  bottom: '0',
                  left: `calc(200px + ((100% - 200px) * (${todayMonthIndex} / ${months.length})) + ((100% - 200px) * (${todayPercentInMonth} / 100 / ${months.length})))`,
                  width: '2px',
                  backgroundImage: 'linear-gradient(to bottom, #ef4444 60%, transparent 60%)',
                  backgroundSize: '2px 16px',
                  backgroundRepeat: 'repeat-y',
                  zIndex: 100,
                  pointerEvents: 'none'
                }} />
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  left: `calc(200px + ((100% - 200px) * (${todayMonthIndex} / ${months.length})) + ((100% - 200px) * (${todayPercentInMonth} / 100 / ${months.length})))`,
                  transform: 'translateX(-50%)',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 101
                }}>
                  Today
                </div>
              </>
            )}

            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: '20px',
              marginTop: '40px',
              padding: '12px 16px',
              backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
              borderRadius: '8px',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: '#10b981'
                }} />
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#475569'
                }}>Ongoing</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: '#3b82f6'
                }} />
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#475569'
                }}>Completed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: '#f59e0b'
                }} />
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#475569'
                }}>Weekly Allocation</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: '#8b5cf6'
                }} />
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#475569'
                }}>Leave</span>
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {activeTooltip && (
            <div
              onMouseEnter={() => { tooltipHoverRef.current = true; }}
              onMouseLeave={() => {
                tooltipHoverRef.current = false;
                setActiveTooltip(null);
              }}
              style={{
                position: 'absolute',
                left: activeTooltip.barRect.left - activeTooltip.cardRect.left + activeTooltip.barRect.width / 2,
                [activeTooltip.isTopRow ? 'top' : 'bottom']: activeTooltip.isTopRow
                  ? activeTooltip.barRect.top - activeTooltip.cardRect.top - 4
                  : activeTooltip.cardRect.bottom - activeTooltip.barRect.bottom - 4,
                transform: activeTooltip.isTopRow ? 'translate(-50%, -100%)' : 'translate(-50%, 100%)',
                backgroundColor: isDarkMode ? 'rgba(30,41,59,0.97)' : 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(12px)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '12px',
                fontWeight: '600',
                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                border: isDarkMode ? '1px solid rgba(51,65,85,0.9)' : '1px solid rgba(226,232,240,0.9)',
                zIndex: 9999999,
                pointerEvents: 'auto',
                maxWidth: '320px'
              }}
            >
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                {activeTooltip.milestone.name}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '8px' }}>
                {activeTooltip.milestone.startDate.toLocaleDateString()} –{' '}
                {activeTooltip.milestone.endDate.toLocaleDateString()}
              </div>

              {activeTooltip.isWeekly && (
                <div style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  marginBottom: '8px'
                }}>
                  Weekly Allocation: {activeTooltip.milestone.allocatedHours}h
                </div>
              )}

              {planScope === 'supervised' && (
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#ef4444',
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  padding: '4px 8px',
                  borderRadius: '999px',
                  textAlign: 'center'
                }}>
                  READ-ONLY (SUPERVISED)
                </div>
              )}

              {planScope === 'my' && !activeTooltip.isWeekly && (
                <button
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMilestone({
                      planId: activeTooltip.planId,
                      milestoneName: activeTooltip.milestone.name,
                      currentStatus: activeTooltip.milestone.status
                    });
                    setShowStatusModal(true);
                    setActiveTooltip(null);
                  }}
                >
                  Change Status
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  const SearchBarSkeleton = () => (
    <div style={{
      display: 'flex',
      gap: '12px',
      marginBottom: '24px'
    }}>
      <div style={{
        ...styles.searchInput,
        position: 'relative',
        background: isDarkMode
          ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
          : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        border: 'none',
        height: '44px',
        flex: 1
      }} />
      <div style={{
        width: '180px',
        height: '44px',
        borderRadius: '12px',
        background: isDarkMode
          ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
          : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
      <div style={{
        width: '160px',
        height: '44px',
        borderRadius: '12px',
        background: isDarkMode
          ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
          : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
    </div>
  );

  const GanttSkeleton = () => (
    <div style={{
      ...styles.ganttCard(false),
      marginTop: '24px'
    }}>
      {/* Title Skeleton */}
      <div style={{
        width: '280px',
        height: '24px',
        borderRadius: '8px',
        marginBottom: '24px',
        background: isDarkMode
          ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
          : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />

      {/* Month Headers Skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px repeat(6, 1fr)',
        gap: '0',
        marginBottom: '16px',
        backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
        borderRadius: '12px',
        padding: '12px',
        minHeight: '48px'
      }}>
        <div style={{
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
            : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: '8px',
          height: '20px'
        }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            background: isDarkMode
              ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
              : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px',
            height: '20px',
            animationDelay: `${i * 0.1}s`
          }} />
        ))}
      </div>

      {/* Timeline Rows Skeleton */}
      {[...Array(4)].map((_, rowIdx) => (
        <div key={rowIdx} style={{
          display: 'grid',
          gridTemplateColumns: '200px repeat(6, 1fr)',
          gap: '0',
          marginBottom: '12px',
          alignItems: 'center'
        }}>
          {/* Plan Name Column */}
          <div style={{
            backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              width: '80px',
              height: '18px',
              borderRadius: '999px',
              background: isDarkMode
                ? 'linear-gradient(90deg, rgba(59,130,246,0.3) 25%, rgba(59,130,246,0.4) 50%, rgba(59,130,246,0.3) 75%)'
                : 'linear-gradient(90deg, rgba(59,130,246,0.2) 25%, rgba(59,130,246,0.3) 50%, rgba(59,130,246,0.2) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }} />
            <div style={{
              width: '140px',
              height: '14px',
              borderRadius: '6px',
              background: isDarkMode
                ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }} />
            <div style={{
              width: '100px',
              height: '10px',
              borderRadius: '6px',
              background: isDarkMode
                ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }} />
          </div>

          {/* Timeline Cells */}
          {[...Array(6)].map((_, colIdx) => (
            <div key={colIdx} style={{
              height: '80px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '0 4px'
            }}>
              {/* Random timeline bar skeleton */}
              {(rowIdx + colIdx) % 2 === 0 && (
                <div style={{
                  width: `${60 + (rowIdx * 15)}%`,
                  height: '24px',
                  borderRadius: '6px',
                  background: isDarkMode
                    ? 'linear-gradient(90deg, rgba(16,185,129,0.3) 25%, rgba(16,185,129,0.4) 50%, rgba(16,185,129,0.3) 75%)'
                    : 'linear-gradient(90deg, rgba(16,185,129,0.2) 25%, rgba(16,185,129,0.3) 50%, rgba(16,185,129,0.2) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  animationDelay: `${(rowIdx + colIdx) * 0.1}s`
                }} />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Legend Skeleton */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginTop: '40px',
        padding: '12px 16px',
        backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
        borderRadius: '8px',
        justifyContent: 'center'
      }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: isDarkMode
                ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }} />
            <div style={{
              width: '60px',
              height: '12px',
              borderRadius: '6px',
              background: isDarkMode
                ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 0.1}s`
            }} />
          </div>
        ))}
      </div>
    </div>
  );

  // 🦴 Loading State Check
  if (loading) {
    return (
      <div className="admin-individual-plan-page" style={styles.page}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div style={styles.headerLeft}>
            <h1 style={styles.header}>Plan</h1>
          </div>
          <div style={styles.headerRight}>
            <button
              style={styles.topButton(false)}
              disabled
            >
              <Bell size={20} />
              <div style={styles.notificationBadge}></div>
            </button>

            <button
              style={styles.topButton(false)}
              disabled
            >
              <User size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          {['Master Plan', 'Individual Plan', 'Approvals'].map((tab) => (
            <button
              key={tab}
              style={styles.tab(tab === 'Individual Plan', false)}
              disabled
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Section Header Skeleton */}
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              My Individual Plan
              <span style={{
                marginLeft: '12px',
                fontSize: '14px',
                fontWeight: '600',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>
                (...)
              </span>
            </h2>
            <p style={styles.sectionSubtitle}>
              Loading your assignments...
            </p>
          </div>
          <button
            style={{
              ...styles.createButton(false),
              opacity: 0.5,
              cursor: 'not-allowed'
            }}
            disabled
          >
            <Plus size={16} />
            Add New Assignment
          </button>
        </div>

        {/* Search and Filters Skeleton */}
        <SearchBarSkeleton />

        {/* Gantt Skeleton */}
        <GanttSkeleton />
      </div>
    );
  }

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
                      ? ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || 'U'
                      : 'U'}
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
                    <div style={styles.tooltipStatNumber}>
                      {individualPlans.length}
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      My Plans
                    </div>
                  </div>

                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {supervisedPlans.length}
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      Supervised
                    </div>
                  </div>

                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {pendingApprovalsCount}
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      Pending
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
          <h2 style={styles.sectionTitle}>
            My Individual Plan
            <span style={{
              marginLeft: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: isDarkMode ? '#94a3b8' : '#64748b'
            }}>
              ({individualPlans.length})
            </span>
          </h2>
          <p
            key={subtitleIndex}
            style={{
              ...styles.sectionSubtitle,
              minHeight: '20px',
              animation: 'fadeIn 0.4s ease'
            }}
          >
            {typeof subtitleMessages[subtitleIndex] === 'function'
              ? subtitleMessages[subtitleIndex]()
              : subtitleMessages[subtitleIndex]}
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

        <div style={{ ...styles.viewModeToggle, position: 'relative', zIndex: 10001 }}>
          <Dropdown
            value={projectTypeFilter}
            onChange={(value) => {
              setProjectTypeFilter(value);
            }}
            options={[
              'All Types',
              'Master Plan',
              'Operations',
              'Custom Projects',
              'Planned Leave'
            ]}
            placeholder="Filter by type..."
            isDarkMode={isDarkMode}
            compact={true}
            searchable={false}
            clearable={false}
          />
        </div>

        {/* ADD THIS - Timeline/Waterfall Toggle */}
        {filteredPlans.length === 1 && (
          <div style={styles.viewModeToggle}>
            <button
              style={styles.viewModeButton(viewMode === 'timeline')}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
            <button
              style={styles.viewModeButton(viewMode === 'waterfall')}
              onClick={() => setViewMode('waterfall')}
            >
              Waterfall
            </button>
          </div>
        )}

        {/* Plan Scope Toggle */}
        {hasSupervisedPlans && (
          <div style={styles.viewModeToggle}>
            <button
              style={styles.viewModeButton(planScope === 'my')}
              onClick={() => setPlanScope('my')}
            >
              My Plans
            </button>

            <button
              style={styles.viewModeButton(planScope === 'supervised')}
              onClick={() => setPlanScope('supervised')}
            >
              Supervised Plans
            </button>
          </div>
        )}
      </div>



      {renderTimelineView()}

      {/* Status Change Modal */}
      {showStatusModal && selectedMilestone && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#374151' : '#fff',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: isDarkMode ? '#e2e8f0' : '#1e293b',
              marginBottom: '8px'
            }}>
              {selectedMilestone.isOverallStatus ? 'Update Plan Status' : 'Change Milestone Status'}
            </h3>

            <p style={{
              fontSize: '14px',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              marginBottom: '24px'
            }}>
              {selectedMilestone.isOverallStatus
                ? selectedMilestone.planTitle
                : selectedMilestone.milestoneName}
            </p>

            {/* Status Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {(selectedMilestone.isOverallStatus
                ? ['Completed', 'Ongoing']
                : ['Ongoing', 'Completed']
              ).map((status) => (
                <button
                  key={status}
                  onClick={async () => {
                    try {
                      if (selectedMilestone.isOverallStatus) {
                        // Update overall plan status in Fields.status
                        const response = await apiFetch(`/plan/individual/${selectedMilestone.planId}`,
                          {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              // Get current plan data
                              ...filteredPlans.find(p => p.id === selectedMilestone.planId),
                              // Update status in fields
                              fields: {
                                ...filteredPlans.find(p => p.id === selectedMilestone.planId).fields,
                                status: status
                              }
                            })
                          }
                        );

                        if (!response.ok) throw new Error('Failed to update plan status');

                        // Update local state
                        setPlans(prevPlans => prevPlans.map(plan => {
                          if (plan.Id === selectedMilestone.planId) {
                            const updatedFields = { ...plan.Fields, status };
                            return { ...plan, Fields: updatedFields };
                          }
                          return plan;
                        }));

                        alert(`✅ Plan status updated to ${status}`);
                      } else {
                        // Update milestone status (existing logic)
                        const response = await apiFetch(
                          `/plan/individual/${selectedMilestone.planId}/milestone`,
                          {
                            method: 'PATCH',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              milestoneName: selectedMilestone.milestoneName,
                              status: status
                            })
                          }
                        );

                        if (!response.ok) throw new Error('Failed to update milestone status');

                        // Update local state
                        setPlans(prevPlans => prevPlans.map(plan => {
                          if (plan.Id === selectedMilestone.planId) {
                            const updatedFields = { ...plan.Fields };
                            if (updatedFields[selectedMilestone.milestoneName]) {
                              updatedFields[selectedMilestone.milestoneName].status = status;
                            }
                            return { ...plan, Fields: updatedFields };
                          }
                          return plan;
                        }));

                        alert(`✅ ${selectedMilestone.milestoneName} status updated to ${status}`);
                      }

                      setShowStatusModal(false);
                      setSelectedMilestone(null);
                    } catch (error) {
                      console.error('❌ Failed to update status:', error);
                      alert(`Failed to update status: ${error.message}`);
                    }
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: selectedMilestone.currentStatus === status
                      ? `2px solid ${status.includes('Complete') ? '#3b82f6' : '#10b981'}`
                      : isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
                    backgroundColor: selectedMilestone.currentStatus === status
                      ? (status.includes('Complete') ? '#3b82f620' : '#10b98120')
                      : isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: status.includes('Complete') ? '#3b82f6' : '#10b981'
                  }} />
                  {status}
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                setShowStatusModal(false);
                setSelectedMilestone(null);
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.3)',
                color: isDarkMode ? '#e2e8f0' : '#64748b',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIndividualPlan;