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
  const OPERATIONS = ["L1 Operations", "L2 Operations"];
  const dateRefs = useRef({});

  // Form state
  const [formData, setFormData] = useState({
    project: "",
    projectType: "master-plan",
    customProjectName: "",
    leaveType: "",  // 🆕 For planned leave
    leaveReason: "",  // 🆕 For planned leave
    startDate: "",
    endDate: "",
    status: "Ongoing"
  });

  const [milestones, setMilestones] = useState([]);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [leavePeriods, setLeavePeriods] = useState([]); // 🆕 For planned leave
  const [newLeavePeriodName, setNewLeavePeriodName] = useState(''); // 🆕
  const [customFields, setCustomFields] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // AI Recommendations
  const [aiRecommendations, setAiRecommendations] = useState({
    reasoning: '',
    suggestedFields: []
  });

  const [userQuery, setUserQuery] = useState('');

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

  const handleGoBack = () => {
    console.log('🔙 Going back to individual plan overview');
    window.location.href = '/adminindividualplan';
  };

  const generateAIRecommendations = async () => {
    // Determine the actual project name
    const actualProjectName = formData.projectType === 'custom'
      ? formData.customProjectName
      : formData.project;

    if (!actualProjectName || !formData.startDate || !formData.endDate) {
      alert('Please fill in project name, start date, and end date first');
      return;
    }

    setIsGeneratingRecommendations(true);

    try {
      console.log('🤖 Requesting AI recommendations...');

      const payload = {
        projectName: actualProjectName,
        projectType: formData.projectType,
        masterPlanId: formData.projectType === 'master-plan' ? selectedMasterPlan?.id : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        userQuery: userQuery.trim() || undefined
      };

      console.log('📋 Request data:', payload);

      const response = await apiFetch('/api/individual-plan/ai-recommendations', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate recommendations');
      }

      const data = await response.json();
      console.log('✅ AI Recommendations received:', data);

      // Format the recommendations for display
      const formattedRecommendations = {
        reasoning: data.reasoning || 'AI analysis completed.',
        suggestedFields: data.recommendations.map(rec => ({
          name: rec.name,
          type: 'Date Range',
          startDate: new Date(rec.startDate).toLocaleDateString('en-GB'),
          endDate: new Date(rec.endDate).toLocaleDateString('en-GB'),
          estimatedHours: rec.estimatedHours,
          rationale: rec.rationale
        }))
      };

      // Add work pattern insights to reasoning
      const insights = `
${data.reasoning}

📊 Analysis Based on Your Work Patterns:
- Average Weekly Capacity: ${data.userWorkPatterns.avgHoursPerWeek} hours
- Historical Data Points: ${data.userWorkPatterns.totalEntriesAnalyzed} entries
- Top Categories: ${data.userWorkPatterns.topCategories.map(c => `${c.category} (${c.hours}h)`).join(', ')}
${data.userWorkPatterns.topProjects.length > 0 ? `• Recent Projects: ${data.userWorkPatterns.topProjects.map(p => `${p.project} (${p.hours}h)`).join(', ')}` : ''}

These recommendations are personalized based on your actual work history${formData.projectType === 'master-plan' ? ' and aligned with the master plan timeline' : ''}.`;

      formattedRecommendations.reasoning = insights;

      setAiRecommendations(formattedRecommendations);
      setShowAIRecommendations(true);

    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      alert(`Failed to generate recommendations: ${error.message}`);
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const addRecommendedField = (field) => {
    // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
    const convertToDateInput = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateStr;
    };

    setMilestones([...milestones, {
      id: Date.now(),
      name: field.name,
      startDate: convertToDateInput(field.startDate) || '',
      endDate: convertToDateInput(field.endDate) || '',
      status: 'Ongoing'
    }]);
  };

  const handleSubmit = async () => {
    // Validation based on project type
    if (formData.projectType === 'planned-leave') {
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

    if (formData.projectType === 'planned-leave') {
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
      project: formData.projectType === 'planned-leave'
        ? `Leave: ${formData.leaveType}`
        : formData.projectType === 'custom'
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

      alert("✅ Individual plan created successfully!");
      window.location.href = "/adminindividualplan";
    } catch (err) {
      console.error("❌ Submit error:", err);
      alert("Failed to create plan: " + err.message);
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
      gridTemplateColumns: formData.projectType === 'planned-leave' ? '1fr' : '1fr 400px',
      gap: '32px',
      alignItems: 'start'
    },
    formSection: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
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
      top: '20px'
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

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <div style={styles.tab(true, false)}>
          Individual Plan
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Form Section */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Create Individual Plan</h2>
          <p style={styles.sectionSubtitle}>
            Align your personal timeline with assigned master plan projects
          </p>

          {/* Master Plan Context */}
          {selectedMasterPlan && (
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
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Project Type</label>
            <select
              style={styles.select}
              value={formData.projectType}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  projectType: e.target.value,
                  project: "",
                  customProjectName: "",
                  leaveType: "",
                  leaveReason: ""
                });
                setSelectedMasterPlan(null);
              }}
            >
              <option value="master-plan">Master Plan Project</option>
              <option value="operation">Operations</option>
              <option value="custom">Custom Project</option>
              <option value="planned-leave">Planned Leave</option>
            </select>
          </div>

          {/* Conditional rendering based on projectType */}
          {formData.projectType === 'master-plan' && (
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Select Master Plan</label>
              <select
                style={styles.select}
                value={formData.project}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, project: value });
                  const selected = masterPlans.find(p => p.project === value);
                  setSelectedMasterPlan(selected || null);
                }}
              >
                <option value="">-- Select Master Plan --</option>
                {masterPlans.map((plan, index) => (
                  <option key={`plan-${plan.id || index}`} value={plan.project}>
                    {plan.project}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.projectType === 'operation' && (
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Select Operation</label>
              <select
                style={styles.select}
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              >
                <option value="">-- Select Operation --</option>
                {OPERATIONS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.projectType === 'planned-leave' && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Leave Type</label>
                <select
                  style={styles.select}
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                >
                  <option value="">-- Select Leave Type --</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Hospitalization Leave">Hospitalization Leave</option>
                  <option value="Childcare Leave">Childcare Leave</option>
                  <option value="Compassionate Leave">Compassionate Leave</option>
                  <option value="No Pay Leave">No Pay Leave</option>
                  <option value="Other">Other</option>
                </select>
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

          {/* Date Range */}

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Start Date</label>
            <div
              onClick={() => dateRefs.current['main-start']?.showPicker()}
              style={{ cursor: 'pointer' }}
            >
              <input
                ref={(el) => (dateRefs.current['main-start'] = el)}
                type="date"
                style={styles.input}
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>End Date</label>
            <div
              onClick={() => dateRefs.current['main-end']?.showPicker()}
              style={{ cursor: 'pointer' }}
            >
              <input
                ref={(el) => (dateRefs.current['main-end'] = el)}
                type="date"
                style={styles.input}
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Milestones/Leave Periods Section */}
          {formData.projectType === 'planned-leave' ? (
            <>
              {/* Leave Periods for Planned Leave */}
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
                      onClick={() => setLeavePeriods(leavePeriods.filter(p => p.id !== period.id))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Date Range Input - No Status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <label style={{ ...styles.fieldLabel, fontSize: '12px' }}>Start Date</label>
                      <div
                        onClick={() =>
                          dateRefs.current[`leave-${period.id}-start`]?.showPicker()
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          ref={(el) =>
                            (dateRefs.current[`leave-${period.id}-start`] = el)
                          }
                          type="date"
                          style={styles.input}
                          value={period.startDate}
                          onChange={(e) => {
                            const updated = leavePeriods.map(p =>
                              p.id === period.id ? { ...p, startDate: e.target.value } : p
                            );
                            setLeavePeriods(updated);
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '14px', marginTop: '20px' }}>
                      to
                    </span>
                    <div>
                      <label style={{ ...styles.fieldLabel, fontSize: '12px' }}>End Date</label>
                      <div
                        onClick={() =>
                          dateRefs.current[`leave-${period.id}-end`]?.showPicker()
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          ref={(el) =>
                            (dateRefs.current[`leave-${period.id}-end`] = el)
                          }
                          type="date"
                          style={styles.input}
                          value={period.endDate}
                          onChange={(e) => {
                            const updated = leavePeriods.map(p =>
                              p.id === period.id ? { ...p, endDate: e.target.value } : p
                            );
                            setLeavePeriods(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Leave Period Section */}
              <div style={styles.addFieldSection}>
                <h4 style={{ ...styles.fieldLabel, marginBottom: '16px', fontSize: '16px' }}>Add Leave Period</h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      style={styles.input}
                      value={newLeavePeriodName}
                      onChange={(e) => setNewLeavePeriodName(e.target.value)}
                      placeholder="Leave period name (e.g., January Leave, March Leave)"
                    />
                  </div>
                  <button
                    style={styles.addButton(hoveredItem === 'add-leave-period')}
                    onMouseEnter={() => setHoveredItem('add-leave-period')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      if (newLeavePeriodName.trim()) {
                        setLeavePeriods([...leavePeriods, {
                          id: Date.now(),
                          name: newLeavePeriodName.trim(),
                          startDate: '',
                          endDate: ''
                        }]);
                        setNewLeavePeriodName('');
                      }
                    }}
                  >
                    <Plus size={16} />
                    Add Leave Period
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Regular Milestones for Projects */}
              {milestones.map((milestone) => (
                <div key={milestone.id} style={styles.customField}>
                  <div style={styles.customFieldHeader}>
                    <div>
                      <div style={styles.customFieldName}>{milestone.name}<span style={{
                        marginLeft: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor:
                          milestone.status === 'Completed' ? '#3b82f620' :
                            milestone.status === 'Ongoing' ? '#10b98120' :
                              '#94a3b820',
                        color:
                          milestone.status === 'Completed' ? '#3b82f6' :
                            milestone.status === 'Ongoing' ? '#10b981' :
                              '#94a3b8'
                      }}>
                        {milestone.status}
                      </span></div>
                      <div style={styles.customFieldType}>Date Range</div>
                    </div>
                    <button
                      style={styles.removeButton(hoveredItem === `remove-${milestone.id}`)}
                      onMouseEnter={() => setHoveredItem(`remove-${milestone.id}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => setMilestones(milestones.filter(m => m.id !== milestone.id))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>Status</label>
                    <select
                      style={styles.select}
                      value={milestone.status}
                      onChange={(e) => {
                        const updated = milestones.map(m =>
                          m.id === milestone.id ? { ...m, status: e.target.value } : m
                        );
                        setMilestones(updated);
                      }}
                    >
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Date Range Input */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <label style={{ ...styles.fieldLabel, fontSize: '12px' }}>Start Date</label>
                      <div
                        onClick={() =>
                          dateRefs.current[`milestone-${milestone.id}-start`]?.showPicker()
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          ref={(el) =>
                            (dateRefs.current[`milestone-${milestone.id}-start`] = el)
                          }
                          type="date"
                          style={styles.input}
                          value={milestone.startDate}
                          onChange={(e) => {
                            const updated = milestones.map(m =>
                              m.id === milestone.id ? { ...m, startDate: e.target.value } : m
                            );
                            setMilestones(updated);
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '14px', marginTop: '20px' }}>
                      to
                    </span>
                    <div>
                      <label style={{ ...styles.fieldLabel, fontSize: '12px' }}>End Date</label>
                      <div
                        onClick={() =>
                          dateRefs.current[`milestone-${milestone.id}-end`]?.showPicker()
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          ref={(el) =>
                            (dateRefs.current[`milestone-${milestone.id}-end`] = el)
                          }
                          type="date"
                          style={styles.input}
                          value={milestone.endDate}
                          onChange={(e) => {
                            const updated = milestones.map(m =>
                              m.id === milestone.id ? { ...m, endDate: e.target.value } : m
                            );
                            setMilestones(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Milestone Section */}
              <div style={styles.addFieldSection}>
                <h4 style={{ ...styles.fieldLabel, marginBottom: '16px', fontSize: '16px' }}>Add Milestone</h4>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      style={styles.input}
                      value={newMilestoneName}
                      onChange={(e) => setNewMilestoneName(e.target.value)}
                      placeholder="Milestone name (e.g., Sprint 1, Testing Phase)"
                    />
                  </div>
                  <button
                    style={styles.addButton(hoveredItem === 'add-milestone')}
                    onMouseEnter={() => setHoveredItem('add-milestone')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      if (newMilestoneName.trim()) {
                        setMilestones([...milestones, {
                          id: Date.now(),
                          name: newMilestoneName.trim(),
                          startDate: '',
                          endDate: '',
                          status: 'Ongoing'
                        }]);
                        setNewMilestoneName('');
                      }
                    }}
                  >
                    <Plus size={16} />
                    Add Milestone
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
            onClick={handleSubmit}
          >
            <CheckCircle size={20} />
            Create Individual Plan
          </button>
        </div>

        {/* AI Recommendations Section */}
        {formData.projectType !== 'planned-leave' && (
          <div style={styles.aiSection}>
            <div style={styles.aiHeader}>
              <Sparkles size={20} style={{ color: '#a855f7' }} />
              <h3 style={styles.aiTitle}>AI Recommendations</h3>
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
              onClick={generateAIRecommendations}
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
                  Recommended Milestones
                </h4>

                {aiRecommendations.suggestedFields.map((field, index) => (
                  <div key={index} style={styles.suggestedField}>
                    <div style={styles.suggestedFieldInfo}>
                      <div style={styles.suggestedFieldName}>{field.name}</div>
                      <div style={styles.suggestedFieldType}>
                        {field.type}
                        {field.startDate && field.endDate && (
                          <span style={{ color: '#10b981', marginLeft: '8px' }}>
                            • {field.startDate} to {field.endDate}
                          </span>
                        )}
                        {field.estimatedHours && (
                          <span style={{ marginLeft: '8px' }}>
                            • {field.estimatedHours}h
                          </span>
                        )}
                      </div>
                      {field.rationale && (
                        <div style={{ fontSize: '11px', color: isDarkMode ? '#9ca3af' : '#6b7280', marginTop: '4px' }}>
                          {field.rationale}
                        </div>
                      )}
                    </div>
                    <button
                      style={styles.addSuggestedButton(hoveredItem === `add-suggested-${index}`)}
                      onMouseEnter={() => setHoveredItem(`add-suggested-${index}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => addRecommendedField(field)}
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  </div>
                ))}
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
                Get personalized milestone recommendations based on your historical work patterns and the selected master plan timeline.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAddIndividualPlan;