import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ArrowLeft,
  Plus,
  X,
  Sparkles,
  Calendar,
  Clock,
  User,
  Bell,
  FileText,
  Trash2,
  Edit,
  CheckCircle,
  Users,
  Target,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import DatePicker from '../components/DatePicker';
import Dropdown from '../components/Dropdown';

const AdminAddIndividualPlan = () => {
  const [masterPlans, setMasterPlans] = useState([]);
  const [selectedMasterPlan, setSelectedMasterPlan] = useState(null);

  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [individualPlans, setIndividualPlans] = useState([]);
  const OPERATIONS = React.useMemo(() => {
    if (!userData?.assignedProjects) return [];
    return userData.assignedProjects
      .filter(p => p.projectType === 'Operation')
      .map(p => p.name);
  }, [userData]);

  // Dynamically get custom projects
  const CUSTOM_PROJECTS = React.useMemo(() => {
    if (!userData?.assignedProjects) return [];
    return userData.assignedProjects
      .filter(p => p.projectType === 'Project')
      .map(p => p.name);
  }, [userData]);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 🆕 Weekly execution planning
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const WEEKLY_CAPACITY = 42.5;

  const PLAN_MODES = {
    STRUCTURE: 'structure',
    WEEKLY: 'weekly'
  };

  const [planMode, setPlanMode] = useState(PLAN_MODES.STRUCTURE);
  const isWeeklyMode = planMode === PLAN_MODES.WEEKLY;
  const isStructureMode = planMode === PLAN_MODES.STRUCTURE;

  useEffect(() => {
    if (isWeeklyMode) {
      setFormData(prev => ({
        ...prev,
        projectType: '',
        project: '',
        customProjectName: '',
        leaveType: '',
        leaveReason: '',
        startDate: '',
        endDate: ''
      }));
      setMilestones([]);
      setLeavePeriods([]);
      setSelectedMasterPlan(null);
    }
  }, [isWeeklyMode]);

  // Form state
  const [formData, setFormData] = useState({
    project: "",
    projectType: "Master Plan",
    customProjectName: "",
    leaveType: "",
    leaveReason: "",
    startDate: "",
    endDate: "",
    status: "Ongoing"
  });

  const effectiveProjectType = isWeeklyMode ? null : formData.projectType;

  const [milestones, setMilestones] = useState([]);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [leavePeriods, setLeavePeriods] = useState([]); // 🆕 For planned leave
  const [newLeavePeriodName, setNewLeavePeriodName] = useState(''); // 🆕
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // AI Recommendations
  const [aiRecommendations, setAiRecommendations] = useState({
    reasoning: '',
    suggestedFields: []
  });

  const [userQuery, setUserQuery] = useState('');

  useEffect(() => {
    const hasContent = 
      formData.project || 
      formData.projectType || 
      formData.customProjectName ||
      formData.leaveType ||
      formData.leaveReason ||
      formData.startDate || 
      formData.endDate || 
      milestones.length > 0 || 
      leavePeriods.length > 0 ||
      weekStart ||
      weekEnd ||
      userQuery.trim() ||
      (showAIRecommendations && aiRecommendations.suggestedFields.length > 0);

    setHasUnsavedChanges(hasContent);
  }, [formData, milestones, leavePeriods, weekStart, weekEnd, userQuery, showAIRecommendations, aiRecommendations]);

  // Fetch user data
  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true);
      console.log('🔄 Fetching user data from /user/profile...');

      const response = await apiFetch('/user/profile', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ User data received:', data);
        setUserData(data);
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to fetch user data:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 Error fetching user data:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const confirmNavigation = (message = '⚠️ You have unsaved changes. Are you sure you want to leave?') => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(message);
  };

  const handleGoBack = () => {
    if (!confirmNavigation()) return;

    setHasUnsavedChanges(false);
    
    console.log('🔙 Going back to individual plan overview');
    window.location.href = '/adminindividualplan';
  };

  const setDefaultWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    setWeekStart(monday.toISOString().split('T')[0]);
    setWeekEnd(friday.toISOString().split('T')[0]);
  };

  const generateStructureAI = async () => {
    setIsGeneratingRecommendations(true);
    try {
      const res = await apiFetch('/plan/individual-plan/ai-recommendations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: formData.project || selectedMasterPlan?.project,
          projectType: formData.projectType,
          masterPlanId: selectedMasterPlan?.id || null,
          startDate: formData.startDate,
          endDate: formData.endDate,
          userQuery: userQuery || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to generate structure recommendations');

      const data = await res.json();
      setAiRecommendations({
        reasoning: data.reasoning,
        suggestedFields: data.suggestedMilestones || data.suggestedFields || []
      });
      setShowAIRecommendations(true);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };


  const generateWeeklyAI = async () => {
    if (!weekStart || !weekEnd) {
      alert('Please select a valid work week');
      return;
    }

    setIsGeneratingRecommendations(true);

    try {
      const res = await apiFetch('/api/weekly-allocations/ai-recommendations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart,
          weekEnd,
          masterPlanIds: masterPlans.map(p => p.id),
          userGoals: userQuery || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to generate weekly recommendations');

      const data = await res.json();

      setAiRecommendations({
        reasoning: data.reasoning,
        suggestedFields: data.recommendations.map(r => ({
          projectName: r.projectName,
          projectType: r.projectType,
          individualPlanId: r.individualPlanId,
          allocatedHours: r.allocatedHours,
          tasks: r.tasks,
          rationale: r.rationale
        }))
      });

      setShowAIRecommendations(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const addRecommendedField = (field) => {
    if (isWeeklyMode) return; // 🚫 DO NOT mutate structure in weekly mode

    setMilestones(prev => ([
      ...prev,
      {
        id: Date.now(),
        name: field.name || field.milestoneName,
        startDate: field.startDate || '',
        endDate: field.endDate || '',
        status: 'Ongoing'
      }
    ]));
  };

  const handleSubmit = async () => {
    // Validation based on project type
    if (effectiveProjectType === 'planned-leave') {
      if (!formData.leaveType || !formData.startDate || !formData.endDate) {
        alert('Please fill in leave type, start date, and end date');
        return;
      }
    } else {
      if (!formData.project || !formData.startDate || !formData.endDate) {
        alert('Please fill in all required fields');
        return;
      }
    }

    // Build fields object
    // Build fields object
    const fields = {};

    if (effectiveProjectType === 'planned-leave') {
      fields.title = `Leave: ${formData.leaveType}`;
      fields.leaveType = formData.leaveType;
      fields.leaveReason = formData.leaveReason || '';

      // 🆕 Add leave periods (no status needed)
      leavePeriods.forEach(period => {
        fields[period.name] = {
          startDate: period.startDate,
          endDate: period.endDate
        };
      });
    } else {
      fields.title = formData.project;
      fields.status = formData.status;

      // 🆕 Add milestones with status
      milestones.forEach(milestone => {
        fields[milestone.name] = {
          status: milestone.status,
          startDate: milestone.startDate,
          endDate: milestone.endDate
        };
      });
    }

    const payload = {
      project: effectiveProjectType === 'Planned Leave'
        ? `Leave: ${formData.leaveType}`
        : formData.projectType === 'Custom'
          ? formData.customProjectName
          : formData.project,
      projectType: formData.projectType,  // 🆕 Include type for filtering
      startDate: formData.startDate,
      endDate: formData.endDate,
      fields: fields
    };

    console.log("📝 Submitting individual plan:", payload);

    try {
      const res = await apiFetch('/plan/individual', {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create individual plan");

      setHasUnsavedChanges(false);

      alert("✅ Individual plan created successfully!");
      window.location.href = "/adminindividualplan";
    } catch (err) {
      console.error("❌ Submit error:", err);
      alert("Failed to create plan: " + err.message);
    }
  };

  const saveWeeklyPlan = async () => {
    // Validate dates are selected
    if (!weekStart || !weekEnd) {
      alert('Please select both start and end dates for your planning period');
      return;
    }

    // Validate end date is after start date
    if (new Date(weekEnd) < new Date(weekStart)) {
      alert('End date must be after start date');
      return;
    }

    const totalHours = aiRecommendations.suggestedFields
      .reduce((sum, f) => sum + (f.allocatedHours || 0), 0);

    // Warning if over capacity, but allow it
    if (totalHours > WEEKLY_CAPACITY) {
      const confirmed = confirm(
        `⚠️ Total hours (${totalHours}h) exceeds recommended capacity (${WEEKLY_CAPACITY}h).\n\nDo you want to continue anyway?`
      );
      if (!confirmed) return;
    }

    if (!aiRecommendations?.suggestedFields?.length) {
      alert('No weekly allocations to save');
      return;
    }

    try {
      await Promise.all(
        aiRecommendations.suggestedFields.map(alloc =>
          apiFetch('/api/weekly-allocations', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              individualPlanId: alloc.individualPlanId,
              projectName: alloc.projectName,
              projectType: alloc.projectType,
              weekStart,
              weekEnd,
              plannedHours: alloc.allocatedHours,
              tasks: alloc.tasks,
              notes: alloc.rationale,
              aiGenerated: true
            })
          })
        )
      );

      setHasUnsavedChanges(false);

      alert('✅ Weekly plan saved successfully');
      window.location.href = '/adminindividualplan';

    } catch (err) {
      console.error('❌ Weekly save failed:', err);
      alert('Failed to save weekly plan. Please try again.');
    }
  };


  // Add CSS and fetch data on mount
  useEffect(() => {
    const pageStyle = document.createElement('style');
    pageStyle.textContent = `
      body, html, #root, .app, .main-content, .page-container, .content-wrapper {
        background: ${isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%) !important'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important'};
        margin: 0 !important;
        padding: 0 !important;
      }
      
      body > div, #root > div, .app > div {
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
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(pageStyle);

    return () => {
      document.head.removeChild(pageStyle);
    };
  }, [isDarkMode]);

  const fetchIndividualPlans = async () => {
    try {
      const res = await apiFetch('/plan/individual', {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) throw new Error("Failed to fetch individual plans");

      const data = await res.json();
      setIndividualPlans(data);
    } catch (err) {
      console.error("❌ Failed to load individual plans:", err);
    }
  };

  useEffect(() => {
    const fetchMasterPlans = async () => {
      try {
        console.log("🔄 Fetching master plans...");
        const res = await apiFetch('/plan/master', {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });

        console.log("📡 Master plans response status:", res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Failed to fetch master plans:", errorText);
          throw new Error("Failed to fetch master plans");
        }

        const data = await res.json();
        console.log("✅ Loaded master plans:", data);
        console.log("📊 Number of plans:", data.length);

        setMasterPlans(data);
      } catch (err) {
        console.error("❌ Error fetching master plans:", err);
        alert("Failed to load master plans. Please try refreshing the page.");
      }
    };

    fetchMasterPlans();
    fetchUserData();
    fetchIndividualPlans();
    setDefaultWeek();
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
    modeToggle: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,0.8)',
      padding: '6px',
      borderRadius: '14px',
      width: 'fit-content'
    },

    activeMode: {
      padding: '10px 18px',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: '#3b82f6',
      color: '#fff',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer'
    },

    inactiveMode: {
      padding: '10px 18px',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: 'transparent',
      color: isDarkMode ? '#e2e8f0' : '#64748b',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer'
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
      gap: '16px'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    backButton: (isHovered) => ({
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
      justifyContent: 'center'
    }),
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
    mainContent: {
      display: 'grid',
      gridTemplateColumns:
        isWeeklyMode || effectiveProjectType === 'planned-leave'
          ? '1fr'
          : '1fr 400px',
      gap: '32px',
      alignItems: 'start',
    },
    formSection: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      position: 'relative',  // ✅ Creates stacking context
      zIndex: 2
    },
    sectionTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px',
      transition: 'all 0.3s ease'
    },
    sectionSubtitle: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '24px',
      transition: 'all 0.3s ease'
    },
    projectContext: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(59,130,246,0.05)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(59,130,246,0.1)'
    },
    contextTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    contextInfo: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      lineHeight: '1.5'
    },
    configTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '20px',
      transition: 'all 0.3s ease'
    },
    fieldGroup: {
      marginBottom: '20px'
    },
    fieldLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#d1d5db' : '#374151',
      marginBottom: '8px',
      display: 'block',
      transition: 'all 0.3s ease'
    },
    input: {
      width: '100%',
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
      fontFamily: '"Montserrat", sans-serif'
    },
    select: {
      width: '100%',
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
      cursor: 'pointer'
    },
    addFieldSection: {
      marginTop: '32px',
      paddingTop: '24px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)'
    },
    addFieldRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 150px auto',
      gap: '12px',
      alignItems: 'end',
      marginBottom: '16px'
    },
    addButton: (isHovered) => ({
      padding: '12px 20px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isHovered ? '#2563eb' : '#3b82f6',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap'
    }),
    customField: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      transition: 'all 0.3s ease'
    },
    customFieldHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    customFieldName: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151'
    },
    customFieldType: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      backgroundColor: isDarkMode ? 'rgba(75,85,99,0.3)' : 'rgba(226,232,240,0.3)',
      padding: '4px 8px',
      borderRadius: '6px'
    },
    removeButton: (isHovered) => ({
      padding: '4px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(239,68,68,0.1)' : 'transparent',
      color: isHovered ? '#ef4444' : isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    aiSection: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      height: 'fit-content',
      position: 'sticky',
      top: '20px',
      zIndex: 1 
    },
    aiHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    },
    aiTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    recommendButton: (isHovered) => ({
      width: '100%',
      padding: '14px 20px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isHovered ? '#8b5cf6' : '#a855f7',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '20px'
    }),
    loadingSpinner: {
      animation: 'spin 1s linear infinite'
    },
    aiRecommendations: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    },
    aiReasoning: {
      fontSize: '14px',
      lineHeight: '1.6',
      color: isDarkMode ? '#d1d5db' : '#4b5563',
      whiteSpace: 'pre-line',
      marginBottom: '16px'
    },
    suggestedField: {
      backgroundColor: isDarkMode ? 'rgba(75,85,99,0.3)' : 'rgba(255,255,255,0.8)',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    suggestedFieldInfo: {
      flex: 1
    },
    suggestedFieldName: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      marginBottom: '2px'
    },
    suggestedFieldType: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    addSuggestedButton: (isHovered) => ({
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: isHovered ? '#059669' : '#10b981',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }),
    submitButton: (isHovered) => ({
      width: '100%',
      padding: '16px 24px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isHovered ? '#1e293b' : '#334155',
      color: '#fff',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    })
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton(hoveredItem === 'back')}
            onMouseEnter={() => setHoveredItem('back')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleGoBack}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.header}>Plan</h1>
        </div>
        <div style={styles.headerRight}>
          <button
            style={styles.topButton(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => {
              if (!confirmNavigation()) return;
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
                if (!confirmNavigation()) return;
                console.log('👤 Profile clicked - Navigating to profile page');
                window.location.href = '/adminprofile';
              }}
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
                      {userData.firstName || 'Unknown'} {userData.lastName || 'User'}
                    </div>
                    <div style={styles.userRole}>
                      {userData.role === 'admin' ? 'Admin' : 'Member'} • {userData.department || 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={styles.userStats}>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {individualPlans.length}
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      Plans
                    </div>
                  </div>

                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {individualPlans.filter(p => p.status === 'Ongoing').length}
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      Ongoing
                    </div>
                  </div>

                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {individualPlans.filter(p => p.status === 'Completed').length}
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      Completed
                    </div>
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

      <div style={styles.modeToggle}>
        <button
          style={planMode === PLAN_MODES.STRUCTURE ? styles.activeMode : styles.inactiveMode}
          onClick={() => setPlanMode(PLAN_MODES.STRUCTURE)}
        >
          Plan Structure (Timeline)
        </button>

        <button
          style={planMode === PLAN_MODES.WEEKLY ? styles.activeMode : styles.inactiveMode}
          onClick={() => setPlanMode(PLAN_MODES.WEEKLY)}
        >
          Plan Weekly Execution (42.5h)
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Form Section */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            {isWeeklyMode ? 'Plan Weekly Execution' : 'Create Individual Plan'}
          </h2>
          <p style={styles.sectionSubtitle}>
            {isWeeklyMode
              ? 'Plan how your 42.5 working hours are allocated across assigned projects for the selected week.'
              : 'Align your personal timeline with assigned master plan projects.'
            }
          </p>

          {/* Master Plan Context */}
          {isStructureMode && selectedMasterPlan && (
            <div style={styles.projectContext}>
              <div style={styles.contextTitle}>
                <Target size={16} />
                Master Plan Assignment
              </div>

              <div style={styles.contextInfo}>
                <strong>{selectedMasterPlan.project}</strong><br />
                Timeline: {new Date(selectedMasterPlan.startDate).toLocaleDateString()} → {new Date(selectedMasterPlan.endDate).toLocaleDateString()}<br />
                {Object.entries(selectedMasterPlan.fields || {}).map(([key, val]) => (
                  <div key={key}>{key}: {JSON.stringify(val)}</div>
                ))}
              </div>
            </div>
          )}

          <h3 style={styles.configTitle}>Configure Your Individual Plan</h3>

          {/* Project Selection */}
          {isStructureMode && (
            <>
              <div style={styles.fieldGroup}>
                <Dropdown
                  label="Project Type"
                  compact
                  isDarkMode={isDarkMode}
                  value={formData.projectType}
                  options={[
                    'Master Plan',
                    'Operations',
                    'Custom',
                    'Planned Leave'
                  ]}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      projectType: value,
                      project: "",
                      customProjectName: "",
                      leaveType: "",
                      leaveReason: ""
                    });
                    setSelectedMasterPlan(null);
                  }}
                />
              </div>
            </>
          )}

          {/* Conditional rendering based on projectType */}
          {formData.projectType === 'Master Plan' && (
            <div style={styles.fieldGroup}>
              <Dropdown
                label="Select Master Plan"
                compact
                isDarkMode={isDarkMode}
                value={formData.project}
                options={masterPlans
                  .filter(p => {
                    // Only show approved plans
                    if (p.approvalStatus !== 'Approved') return false;
                    // Show all master plans user has access to (backend already filters)
                    return true;
                  })
                  .map(p => p.project)
                }
                searchable
                onChange={(value) => {
                  setFormData({ ...formData, project: value });
                  const selected = masterPlans.find(p => p.project === value);
                  setSelectedMasterPlan(selected || null);
                }}
              />
            </div>
          )}

          {formData.projectType === 'Operations' && (
            <div style={styles.fieldGroup}>
              <Dropdown
                label="Select Operation"
                compact
                isDarkMode={isDarkMode}
                value={formData.project}
                options={OPERATIONS}
                onChange={(value) =>
                  setFormData({ ...formData, project: value })
                }
              />

              {OPERATIONS.length === 0 && (
                <p style={{
                  fontSize: '12px',
                  color: '#ef4444',
                  marginTop: '8px'
                }}>
                  ⚠️ You have no operations assigned.
                </p>
              )}
            </div>
          )}

          {formData.projectType === 'Custom' && (
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Custom Project Name</label>
              <input
                type="text"
                style={styles.input}
                value={formData.customProjectName}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  customProjectName: e.target.value,
                  project: e.target.value 
                })}
                placeholder="Enter your custom project name"
              />
            </div>
          )}

          {effectiveProjectType === 'Planned Leave' && (
            <>
              <div style={styles.fieldGroup}>
                <Dropdown
                  label="Leave Type"
                  compact
                  isDarkMode={isDarkMode}
                  value={formData.leaveType}
                  options={[
                    'Annual Leave',
                    'Medical Leave',
                    'Hospitalization Leave',
                    'Childcare Leave',
                    'Compassionate Leave',
                    'No Pay Leave',
                    'Other'
                  ]}
                  onChange={(value) =>
                    setFormData({ ...formData, leaveType: value })
                  }
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Reason (Optional)</label>
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  value={formData.leaveReason}
                  onChange={(e) => setFormData({ ...formData, leaveReason: e.target.value })}
                  placeholder="Brief description of leave reason (optional)"
                />
              </div>
            </>
          )}

          {isWeeklyMode && (
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Planning Week</label>
              <p style={{
                fontSize: '12px',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                marginBottom: '12px',
                lineHeight: '1.5'
              }}>
                💡 Recommended: Plan Monday-Friday for 42.5 working hours. You can also plan for custom date ranges.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{
                    ...styles.fieldLabel,
                    fontSize: '12px',
                    marginBottom: '6px'
                  }}>
                    Start Date
                  </label>
                  <DatePicker
                    value={weekStart}
                    compact
                    isDarkMode={isDarkMode}
                    onChange={(date) => {
                      setWeekStart(date);
                      // Auto-suggest Friday if starting on Monday
                      const d = new Date(date);
                      if (d.getDay() === 1 && !weekEnd) {
                        const f = new Date(d);
                        f.setDate(d.getDate() + 4);
                        setWeekEnd(f.toISOString().split('T')[0]);
                      }
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    ...styles.fieldLabel,
                    fontSize: '12px',
                    marginBottom: '6px'
                  }}>
                    End Date
                  </label>
                  <DatePicker
                    value={weekEnd}
                    compact
                    isDarkMode={isDarkMode}
                    onChange={(date) => setWeekEnd(date)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Date Range */}

          {isStructureMode && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Start Date</label>
                <DatePicker
                  value={formData.startDate}
                  compact
                  isDarkMode={isDarkMode}
                  onChange={(date) =>
                    setFormData({ ...formData, startDate: date })
                  }
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>End Date</label>
                <DatePicker
                  value={formData.endDate}
                  compact
                  isDarkMode={isDarkMode}
                  onChange={(date) =>
                    setFormData({ ...formData, endDate: date })
                  }
                />
              </div>
            </>
          )}

          {/* Milestones/Leave Periods Section */}
          {/* Milestones / Leave Periods Section */}

          {/* ===== PLANNED LEAVE ===== */}
          {!isWeeklyMode && effectiveProjectType === 'planned-leave' && (
            <>
              {/* Existing Leave Periods */}
              {leavePeriods.map((period) => (
                <div key={period.id} style={styles.customField}>
                  <div style={styles.customFieldHeader}>
                    <div>
                      <div style={styles.customFieldName}>{period.name}</div>
                      <div style={styles.customFieldType}>Leave Period</div>
                    </div>
                    <button
                      style={styles.removeButton(hoveredItem === `remove-period-${period.id}`)}
                      onMouseEnter={() => setHoveredItem(`remove-period-${period.id}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() =>
                        setLeavePeriods(leavePeriods.filter(p => p.id !== period.id))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Date Range */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '16px',
                      alignItems: 'end'
                    }}
                  >
                    <div>
                      <label
                        style={{
                          ...styles.fieldLabel,
                          fontSize: '12px',
                          marginBottom: '6px'
                        }}
                      >
                        Start Date
                      </label>
                      <DatePicker
                        value={period.startDate}
                        compact
                        isDarkMode={isDarkMode}
                        onChange={(date) =>
                          setLeavePeriods(leavePeriods.map(p =>
                            p.id === period.id ? { ...p, startDate: date } : p
                          ))
                        }
                      />
                    </div>

                    <span
                      style={{
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        fontSize: '14px',
                        padding: '0 6px',
                        textAlign: 'center',
                        display: 'block'
                      }}
                    >
                      to
                    </span>

                    <div>
                      <label
                        style={{
                          ...styles.fieldLabel,
                          fontSize: '12px',
                          marginBottom: '6px'
                        }}
                      >
                        End Date
                      </label>
                      <DatePicker
                        value={period.endDate}
                        compact
                        isDarkMode={isDarkMode}
                        onChange={(date) =>
                          setLeavePeriods(leavePeriods.map(p =>
                            p.id === period.id ? { ...p, endDate: date } : p
                          ))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Leave Period */}
              <div style={styles.addFieldSection}>
                <h4 style={{ ...styles.fieldLabel, fontSize: '16px', marginBottom: '16px' }}>
                  Add Leave Period
                </h4>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <input
                    type="text"
                    style={styles.input}
                    value={newLeavePeriodName}
                    onChange={(e) => setNewLeavePeriodName(e.target.value)}
                    placeholder="Leave period name (e.g. January Leave)"
                  />

                  <button
                    style={styles.addButton(hoveredItem === 'add-leave')}
                    onMouseEnter={() => setHoveredItem('add-leave')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      if (!newLeavePeriodName.trim()) return;
                      setLeavePeriods([
                        ...leavePeriods,
                        {
                          id: Date.now(),
                          name: newLeavePeriodName.trim(),
                          startDate: '',
                          endDate: ''
                        }
                      ]);
                      setNewLeavePeriodName('');
                    }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== NON-LEAVE PROJECTS (MILESTONES) ===== */}
          {!isWeeklyMode && formData.projectType !== 'Planned Leave' && (
            <>
              {milestones.map((milestone) => (
                <div key={milestone.id} style={styles.customField}>
                  <div style={styles.customFieldHeader}>
                    <div>
                      <div style={styles.customFieldName}>
                        {milestone.name}
                        <span
                          style={{
                            marginLeft: '10px',
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor:
                              milestone.status === 'Completed'
                                ? '#3b82f620'
                                : '#10b98120',
                            color:
                              milestone.status === 'Completed'
                                ? '#3b82f6'
                                : '#10b981'
                          }}
                        >
                          {milestone.status}
                        </span>
                      </div>
                      <div style={styles.customFieldType}>Milestone</div>
                    </div>

                    <button
                      style={styles.removeButton(hoveredItem === `remove-${milestone.id}`)}
                      onMouseEnter={() => setHoveredItem(`remove-${milestone.id}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() =>
                        setMilestones(milestones.filter(m => m.id !== milestone.id))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Status */}
                  <div style={styles.fieldGroup}>
                    <Dropdown
                      label="Status"
                      compact
                      isDarkMode={isDarkMode}
                      value={milestone.status}
                      options={['Ongoing', 'Completed']}
                      onChange={(value) =>
                        setMilestones(milestones.map(m =>
                          m.id === milestone.id
                            ? { ...m, status: value }
                            : m
                        ))
                      }
                    />
                  </div>

                  {/* Date Range */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '16px',
                      alignItems: 'end'
                    }}
                  >
                    <div>
                      <label
                        style={{
                          ...styles.fieldLabel,
                          fontSize: '12px',
                          marginBottom: '6px'
                        }}
                      >
                        Start Date
                      </label>
                      <DatePicker
                        value={milestone.startDate}
                        compact
                        isDarkMode={isDarkMode}
                        onChange={(date) =>
                          setMilestones(milestones.map(m =>
                            m.id === milestone.id
                              ? { ...m, startDate: date }
                              : m
                          ))
                        }
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          ...styles.fieldLabel,
                          fontSize: '12px',
                          marginBottom: '6px'
                        }}
                      >
                        End Date
                      </label>
                      <DatePicker
                        value={milestone.endDate}
                        compact
                        isDarkMode={isDarkMode}
                        onChange={(date) =>
                          setMilestones(milestones.map(m =>
                            m.id === milestone.id
                              ? { ...m, endDate: date }
                              : m
                          ))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Milestone */}
              <div style={styles.addFieldSection}>
                <h4 style={{ ...styles.fieldLabel, fontSize: '16px', marginBottom: '16px' }}>
                  Add Milestone
                </h4>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <input
                    type="text"
                    style={styles.input}
                    value={newMilestoneName}
                    onChange={(e) => setNewMilestoneName(e.target.value)}
                    placeholder="Milestone name (e.g. Sprint 1)"
                  />

                  <button
                    style={styles.addButton(hoveredItem === 'add-milestone')}
                    onMouseEnter={() => setHoveredItem('add-milestone')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      if (!newMilestoneName.trim()) return;
                      setMilestones([
                        ...milestones,
                        {
                          id: Date.now(),
                          name: newMilestoneName.trim(),
                          startDate: '',
                          endDate: '',
                          status: 'Ongoing'
                        }
                      ]);
                      setNewMilestoneName('');
                    }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            style={styles.submitButton(hoveredItem === 'submit')}
            onMouseEnter={() => setHoveredItem('submit')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              if (isWeeklyMode) {
                saveWeeklyPlan();
              } else {
                handleSubmit();
              }
            }}
          >
            <CheckCircle size={20} />
            {isWeeklyMode ? 'Save Weekly Plan' : 'Create Individual Plan'}
          </button>
        </div>

        {/* AI Recommendations Section */}
        {(isWeeklyMode || formData.projectType !== 'planned-leave') && (
          <div style={styles.aiSection}>
            <div style={styles.aiHeader}>
              <Sparkles size={20} style={{ color: '#a855f7' }} />
              <h3 style={styles.aiTitle}>
                {isWeeklyMode ? 'AI Weekly Planner (42.5h)' : 'AI Timeline Planner'}
              </h3>
            </div>

            {/* User Query Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Describe Your Goals (Optional)</label>
              <textarea
                style={{
                  ...styles.input,
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Describe what you want to accomplish, any specific requirements, or priorities for this plan..."
              />
            </div>

            <button
              style={styles.recommendButton(hoveredItem === 'recommend')}
              onMouseEnter={() => setHoveredItem('recommend')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={isWeeklyMode ? generateWeeklyAI : generateStructureAI}
              disabled={isGeneratingRecommendations}
            >
              {isGeneratingRecommendations ? (
                <>
                  <div style={styles.loadingSpinner}>⟳</div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Get AI Recommendations
                </>
              )}
            </button>

            {showAIRecommendations && (
              <div style={styles.aiRecommendations}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  marginBottom: '12px'
                }}>
                  AI Analysis
                </h4>
                <div style={styles.aiReasoning}>
                  {aiRecommendations.reasoning}
                </div>

                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  marginBottom: '12px'
                }}>
                  {isWeeklyMode ? 'Recommended Weekly Allocations' : 'Recommended Milestones'}
                </h4>

                {aiRecommendations.suggestedFields.map((field, index) => (
                  <div key={index} style={{
                    ...styles.suggestedField,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '16px'
                  }}>
                    {/* Project Header with Remove Button */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={styles.suggestedFieldName}>
                          {field.projectName}
                        </div>
                        <div style={styles.suggestedFieldType}>
                          {field.projectType}
                        </div>
                      </div>

                      {isWeeklyMode && (
                        <button
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: hoveredItem === `remove-alloc-${index}` ? 'rgba(239,68,68,0.1)' : 'transparent',
                            color: hoveredItem === `remove-alloc-${index}` ? '#ef4444' : (isDarkMode ? '#94a3b8' : '#64748b'),
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={() => setHoveredItem(`remove-alloc-${index}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={() => {
                            const updated = aiRecommendations.suggestedFields.filter((_, i) => i !== index);
                            setAiRecommendations({ ...aiRecommendations, suggestedFields: updated });
                          }}
                          title="Remove this project"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Hours Input (Editable in Weekly Mode) */}
                    {isWeeklyMode ? (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isDarkMode ? '#d1d5db' : '#374151',
                          marginBottom: '6px',
                          display: 'block'
                        }}>
                          Allocated Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="42.5"
                          step="0.5"
                          value={field.allocatedHours}
                          onChange={(e) => {
                            const updated = [...aiRecommendations.suggestedFields];
                            updated[index].allocatedHours = parseFloat(e.target.value) || 0;
                            setAiRecommendations({ ...aiRecommendations, suggestedFields: updated });
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
                            backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.8)',
                            color: isDarkMode ? '#e2e8f0' : '#1e293b',
                            fontSize: '14px',
                            fontWeight: '600',
                            outline: 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <div style={styles.suggestedFieldName}>
                        {field.name}
                      </div>
                    )}

                    {/* Tasks Section (Editable in Weekly Mode) */}
                    {isWeeklyMode && field.tasks && (
                      <div>
                        <label style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: isDarkMode ? '#d1d5db' : '#374151',
                          marginBottom: '6px',
                          display: 'block'
                        }}>
                          Tasks
                        </label>

                        {field.tasks.map((task, taskIndex) => (
                          <div key={taskIndex} style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '6px',
                            alignItems: 'center'
                          }}>
                            <input
                              type="text"
                              value={typeof task === 'string' ? task : task.name || task.description || ''}
                              onChange={(e) => {
                                const updated = [...aiRecommendations.suggestedFields];
                                updated[index].tasks[taskIndex] = e.target.value;
                                setAiRecommendations({ ...aiRecommendations, suggestedFields: updated });
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
                                backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.8)',
                                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            />
                            <button
                              style={{
                                padding: '4px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: hoveredItem === `remove-task-${index}-${taskIndex}` ? 'rgba(239,68,68,0.1)' : 'transparent',
                                color: hoveredItem === `remove-task-${index}-${taskIndex}` ? '#ef4444' : (isDarkMode ? '#94a3b8' : '#64748b'),
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              onMouseEnter={() => setHoveredItem(`remove-task-${index}-${taskIndex}`)}
                              onMouseLeave={() => setHoveredItem(null)}
                              onClick={() => {
                                const updated = [...aiRecommendations.suggestedFields];
                                updated[index].tasks = updated[index].tasks.filter((_, i) => i !== taskIndex);
                                setAiRecommendations({ ...aiRecommendations, suggestedFields: updated });
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {/* Add Task Button */}
                        <button
                          style={{
                            ...styles.addButton(hoveredItem === `add-task-${index}`),
                            padding: '6px 12px',
                            fontSize: '12px',
                            marginTop: '6px'
                          }}
                          onMouseEnter={() => setHoveredItem(`add-task-${index}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={() => {
                            const updated = [...aiRecommendations.suggestedFields];
                            if (!updated[index].tasks) updated[index].tasks = [];
                            updated[index].tasks.push('New task');
                            setAiRecommendations({ ...aiRecommendations, suggestedFields: updated });
                          }}
                        >
                          <Plus size={12} />
                          Add Task
                        </button>
                      </div>
                    )}

                    {/* Rationale */}
                    {field.rationale && (
                      <div style={{
                        fontSize: '11px',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        marginTop: '8px',
                        fontStyle: 'italic',
                        paddingTop: '8px',
                        borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                      }}>
                        💡 {field.rationale}
                      </div>
                    )}

                    {/* Add button for structure mode */}
                    {!isWeeklyMode && (
                      <button
                        style={styles.addSuggestedButton(hoveredItem === `add-suggested-${index}`)}
                        onMouseEnter={() => setHoveredItem(`add-suggested-${index}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => addRecommendedField(field)}
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    )}
                  </div>
                ))}

                {/* Total Hours Summary + Save Button (Weekly Mode Only) */}
                {isWeeklyMode && aiRecommendations.suggestedFields.length > 0 && (
                  <>
                    {/* Total Hours Display */}
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: (() => {
                        const total = aiRecommendations.suggestedFields.reduce((sum, f) => sum + (f.allocatedHours || 0), 0);
                        if (total > WEEKLY_CAPACITY) return 'rgba(239,68,68,0.1)';
                        if (total === WEEKLY_CAPACITY) return 'rgba(16,185,129,0.1)';
                        return isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)';
                      })(),
                      border: (() => {
                        const total = aiRecommendations.suggestedFields.reduce((sum, f) => sum + (f.allocatedHours || 0), 0);
                        if (total > WEEKLY_CAPACITY) return '1px solid rgba(239,68,68,0.3)';
                        if (total === WEEKLY_CAPACITY) return '1px solid rgba(16,185,129,0.3)';
                        return isDarkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.2)';
                      })()
                    }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: isDarkMode ? '#93c5fd' : '#3b82f6',
                        marginBottom: '6px'
                      }}>
                        Total Allocated Hours
                      </div>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        color: (() => {
                          const total = aiRecommendations.suggestedFields.reduce((sum, f) => sum + (f.allocatedHours || 0), 0);
                          if (total > WEEKLY_CAPACITY) return '#ef4444';
                          if (total === WEEKLY_CAPACITY) return '#10b981';
                          return isDarkMode ? '#e2e8f0' : '#1e293b';
                        })()
                      }}>
                        {aiRecommendations.suggestedFields
                          .reduce((sum, f) => sum + (f.allocatedHours || 0), 0)
                          .toFixed(1)}h
                        <span style={{
                          fontSize: '16px',
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          fontWeight: '500'
                        }}>
                          {' '} / {WEEKLY_CAPACITY}h
                        </span>
                      </div>
                      {aiRecommendations.suggestedFields.reduce((sum, f) => sum + (f.allocatedHours || 0), 0) > WEEKLY_CAPACITY && (
                        <div style={{
                          fontSize: '11px',
                          color: '#ef4444',
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <AlertCircle size={12} />
                          Exceeds recommended capacity
                        </div>
                      )}
                    </div>

                    {/* Save Button */}
                    <button
                      style={{
                        ...styles.submitButton(hoveredItem === 'save-weekly-ai'),
                        marginTop: '16px',
                        backgroundColor: hoveredItem === 'save-weekly-ai' ? '#059669' : '#10b981'
                      }}
                      onMouseEnter={() => setHoveredItem('save-weekly-ai')}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={saveWeeklyPlan}
                    >
                      <CheckCircle size={20} />
                      Save Weekly Plan
                    </button>
                  </>
                )}
              </div>
            )}

            {!showAIRecommendations && !isGeneratingRecommendations && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontSize: '14px'
              }}>
                <Sparkles size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                {isWeeklyMode
                  ? 'Get AI-generated weekly time allocations across all assigned projects. Standard work week is 42.5h, but you can plan for any timeframe.'
                  : 'Get personalized milestone recommendations based on your historical work patterns and the selected master plan timeline.'
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAddIndividualPlan;