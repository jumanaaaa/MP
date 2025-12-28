import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  User,
  Bell,
  Trash2,
  Save
} from 'lucide-react';
import { apiFetch } from '../utils/api';

const AdminEditIndividualPlan = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [individualPlans, setIndividualPlans] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState(null);
  const [originalPlan, setOriginalPlan] = useState(null);

  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);
  const dateRefs = useRef({});

  const [formData, setFormData] = useState({
    assignedProject: '',
    projectType: '',
    role: '',
    leaveType: '',
    leaveReason: '',
    startDate: '',
    endDate: ''
  });

  const [customFields, setCustomFields] = useState([]);
  const [leavePeriods, setLeavePeriods] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newLeavePeriodName, setNewLeavePeriodName] = useState('');

  const OPERATIONS = ["L1 Operations", "L2 Operations"];
  const isOperation = OPERATIONS.includes(formData.assignedProject);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setPlanId(parseInt(id));
    } else {
      alert('No plan ID provided');
      window.location.href = '/adminindividualplan';
    }
  }, []);

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
    const fetchUserProfile = async () => {
      try {
        const res = await apiFetch('/user/profile', {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error('Failed to fetch user profile');

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("❌ Error fetching user profile:", err);
      }
    };

    fetchUserProfile();
    fetchIndividualPlans();
  }, []);

  useEffect(() => {
    if (!planId) return;

    const fetchPlan = async () => {
      try {
        setLoading(true);
        console.log(`📡 Fetching plan ${planId}...`);

        const res = await apiFetch('/plan/individual', {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error('Failed to fetch plans');

        const plans = await res.json();
        const plan = plans.find(p => p.Id === planId);

        if (!plan) {
          alert('Plan not found or you do not have access to it');
          window.location.href = '/adminindividualplan';
          return;
        }

        console.log('✅ Plan loaded:', plan);
        setOriginalPlan(plan);

        const fields = typeof plan.Fields === 'string'
          ? JSON.parse(plan.Fields)
          : plan.Fields;

        const isLeave = plan.Project.startsWith('Leave:');
        const projectType = isLeave ? 'planned-leave'
          : OPERATIONS.includes(plan.Project) ? 'operation'
            : 'custom';

        setFormData({
          assignedProject: plan.Project,
          projectType: projectType,
          role: plan.Role || '',
          leaveType: fields.leaveType || '',
          leaveReason: fields.leaveReason || '',
          startDate: formatDateForInput(plan.StartDate),
          endDate: formatDateForInput(plan.EndDate)
        });

        const parsedFields = [];
        const parsedLeavePeriods = [];
        let fieldId = 1;
        let periodId = 1;

        Object.entries(fields).forEach(([key, value]) => {
          if (key === 'title' || key === 'status' || key === 'leaveType' || key === 'leaveReason') return;

          if (typeof value === 'object' && value !== null) {
            if (isLeave) {
              parsedLeavePeriods.push({
                id: periodId++,
                name: key,
                startDate: formatDateForInput(value.startDate),
                endDate: formatDateForInput(value.endDate)
              });
            } else {
              parsedFields.push({
                id: fieldId++,
                name: key,
                type: 'Date Range',
                status: value.status || 'Ongoing',
                startDate: formatDateForInput(value.startDate),
                endDate: formatDateForInput(value.endDate),
                value: `${formatDateForInput(value.startDate)} - ${formatDateForInput(value.endDate)}`
              });
            }
          } else if (typeof value === 'string') {
            const dateRange = value.split(' - ');
            if (dateRange.length === 2) {
              if (isLeave) {
                parsedLeavePeriods.push({
                  id: periodId++,
                  name: key,
                  startDate: dateRange[0].trim(),
                  endDate: dateRange[1].trim()
                });
              } else {
                parsedFields.push({
                  id: fieldId++,
                  name: key,
                  type: 'Date Range',
                  status: 'Ongoing',
                  startDate: dateRange[0].trim(),
                  endDate: dateRange[1].trim(),
                  value: value
                });
              }
            }
          }
        });

        setCustomFields(parsedFields);
        setLeavePeriods(parsedLeavePeriods);
        setLoading(false);

      } catch (err) {
        console.error("❌ Error fetching plan:", err);
        alert('Failed to load plan');
        window.location.href = '/adminindividualplan';
      }
    };

    fetchPlan();
  }, [planId]);

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const parseDateForAPI = (dateStr) => {
    if (!dateStr) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0];
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return dateStr;
  };

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
    pageStyle.setAttribute('data-component', 'admin-edit-individual-plan-background');

    const backgroundGradient = isDarkMode
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      .admin-edit-individual-plan-page {
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
        const existingStyles = document.querySelectorAll('[data-component="admin-edit-individual-plan-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const handleGoBack = () => {
    window.location.href = '/adminindividualplan';
  };

  const addCustomField = () => {
    if (newFieldName.trim()) {
      const newField = {
        id: Date.now(),
        name: newFieldName.trim(),
        type: 'Date Range',
        status: 'Ongoing',
        startDate: '',
        endDate: '',
        value: ''
      };
      setCustomFields([...customFields, newField]);
      setNewFieldName('');
    }
  };

  const removeCustomField = (fieldId) => {
    setCustomFields(customFields.filter(field => field.id !== fieldId));
  };

  const updateCustomField = (fieldId, key, value) => {
    setCustomFields(customFields.map(field =>
      field.id === fieldId ? { ...field, [key]: value } : field
    ));
  };

  const handleSave = async () => {
    try {
      console.log('💾 Saving individual plan changes...');

      const fields = {};

      if (formData.projectType === 'planned-leave') {
        fields.leaveType = formData.leaveType;
        fields.leaveReason = formData.leaveReason;
        fields.title = `Leave: ${formData.leaveType}`;

        leavePeriods.forEach(period => {
          fields[period.name] = {
            startDate: parseDateForAPI(period.startDate),
            endDate: parseDateForAPI(period.endDate)
          };
        });
      } else {
        customFields.forEach(field => {
          fields[field.name] = {
            status: field.status || 'Ongoing',
            startDate: parseDateForAPI(field.startDate),
            endDate: parseDateForAPI(field.endDate)
          };
        });
      }

      const payload = {
        project: formData.assignedProject,
        projectType: formData.projectType,
        role: formData.role,
        startDate: parseDateForAPI(formData.startDate),
        endDate: parseDateForAPI(formData.endDate),
        fields
      };

      console.log('📤 Payload:', payload);

      const response = await apiFetch(`/plan/individual/${planId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update plan');
      }

      console.log('✅ Plan updated successfully');
      alert('Individual plan updated successfully!');
      window.location.href = '/adminindividualplan';

    } catch (error) {
      console.error('❌ Error saving plan:', error);
      alert(`Failed to save plan: ${error.message}`);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '30px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif',
      transition: 'all 0.3s ease'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '32px'
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
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      margin: 0,
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    },
    planTypeBadge: (isOperation) => ({
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      marginLeft: '12px',
      backgroundColor: isOperation
        ? 'rgba(168,85,247,0.15)'
        : 'rgba(59,130,246,0.15)',
      color: isOperation ? '#a855f7' : '#3b82f6',
      border: `1px solid ${isOperation
        ? 'rgba(168,85,247,0.4)'
        : 'rgba(59,130,246,0.4)'
        }`
    }),
    button: (isHovered) => ({
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
    statItem: {
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '14px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      transition: 'all 0.3s ease'
    },
    statLabel: {
      fontSize: '10px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
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
      marginTop: '8px',
      width: '100%',
      textAlign: 'center',
      transition: 'all 0.3s ease'
    },
    tabContainer: {
      display: 'flex',
      gap: '8px',
      marginBottom: '32px',
      padding: '4px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,0.8)',
      borderRadius: '16px',
      maxWidth: 'fit-content',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
    },
    activeTab: {
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: '#3b82f6',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
    },
    formCard: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      transition: 'all 0.3s ease'
    },
    formTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px',
      transition: 'all 0.3s ease'
    },
    formDescription: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '24px',
      transition: 'all 0.3s ease'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '20px',
      transition: 'all 0.3s ease'
    },
    fieldGroup: {
      marginBottom: '20px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#d1d5db' : '#374151',
      marginBottom: '8px',
      display: 'block',
      transition: 'all 0.3s ease'
    },
    requiredBadge: {
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#3b82f6',
      fontWeight: '600',
      marginLeft: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.8)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      fontFamily: '"Montserrat", sans-serif',
      boxSizing: 'border-box',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    },
    customFieldCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
      backdropFilter: 'blur(10px)',
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
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transition: 'all 0.3s ease'
    },
    customFieldType: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      backgroundColor: isDarkMode ? 'rgba(75,85,99,0.3)' : 'rgba(226,232,240,0.3)',
      padding: '4px 8px',
      borderRadius: '6px',
      transition: 'all 0.3s ease'
    },
    deleteButton: (isHovered) => ({
      padding: '4px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(239,68,68,0.1)' : 'transparent',
      color: isHovered ? '#ef4444' : isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    }),
    dateRangeContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: '12px',
      alignItems: 'center'
    },
    dateRangeConnector: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '14px',
      fontWeight: '500'
    },
    addFieldSection: {
      marginTop: '32px',
      paddingTop: '24px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)'
    },
    addFieldTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: isDarkMode ? '#d1d5db' : '#374151',
      marginBottom: '16px',
      transition: 'all 0.3s ease'
    },
    addFieldGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
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
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap',
      transition: 'all 0.3s ease',
      boxShadow: isHovered ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)'
    }),
    saveButton: (isHovered) => ({
      width: '100%',
      padding: '16px 24px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isHovered ? '#059669' : '#10b981',
      color: '#fff',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      marginTop: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      boxShadow: isHovered ? '0 8px 20px rgba(16,185,129,0.3)' : '0 4px 12px rgba(16,185,129,0.1)',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
    }),
    loadingState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '16px'
    }
  };

  if (loading) {
    return (
      <div className="admin-edit-individual-plan-page" style={styles.page}>
        <div style={styles.loadingState}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Loading plan data...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-edit-individual-plan-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.button(hoveredItem === 'back')}
            onMouseEnter={() => setHoveredItem('back')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleGoBack}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={styles.title}>Edit Individual Plan</h1>
            <span style={styles.planTypeBadge(isOperation)}>
              {isOperation ? 'OPERATION' : 'PROJECT'}
            </span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            style={styles.button(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => window.location.href = '/adminalerts'}
          >
            <Bell size={20} />
            <div style={styles.notificationBadge}></div>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={styles.button(hoveredCard === 'profile')}
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
                style={styles.profileTooltip}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
              >
                <div style={styles.tooltipArrow}></div>
                <div style={styles.userInfo}>
                  <div style={styles.avatar}>
                    {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
                    </div>
                    <div style={styles.userRole}>
                      {user ? `${user.role} • ${user.department}` : ''}
                    </div>
                  </div>
                </div>
                <div style={styles.userStats}>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>
                      {individualPlans.length}
                    </div>
                    <div style={styles.statLabel}>Plans</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>
                      {individualPlans.filter(p => p.status === 'Ongoing').length}
                    </div>
                    <div style={styles.statLabel}>Ongoing</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>
                      {individualPlans.filter(p => p.status === 'Completed').length}
                    </div>
                    <div style={styles.statLabel}>Completed</div>
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
        <div style={styles.activeTab}>Individual Plan</div>
      </div>

      {/* Form Section */}
      <div style={styles.formCard}>
        <h2 style={styles.formTitle}>Edit Individual Plan</h2>
        <p style={styles.formDescription}>
          Update your plan dates and milestones. Add or remove milestones as needed.
        </p>

        <h3 style={styles.sectionTitle}>Primary Assignment Details</h3>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Assigned Project
            <span style={styles.requiredBadge}>Locked</span>
          </label>
          <input
            type="text"
            style={{
              ...styles.input,
              cursor: 'not-allowed',
              opacity: 0.7
            }}
            value={formData.assignedProject}
            disabled
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Your Role</label>
          <input
            type="text"
            style={styles.input}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g., Frontend Developer, Backend Developer"
          />
        </div>

        {formData.projectType === 'planned-leave' && (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Leave Type</label>
              <input
                type="text"
                style={styles.input}
                value={formData.leaveType}
                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                placeholder="e.g., Annual Leave, Medical Leave"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Reason</label>
              <textarea
                style={{
                  ...styles.input,
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                value={formData.leaveReason}
                onChange={(e) => setFormData({ ...formData, leaveReason: e.target.value })}
                placeholder="Leave reason (optional)"
              />
            </div>
          </>
        )}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Your Start Date
            <span style={styles.requiredBadge}>Required</span>
          </label>
          <div
            onClick={() => dateRefs.current['main-start']?.showPicker()}
            style={{ cursor: 'pointer' }}
          >
            <input
              ref={(el) => (dateRefs.current['main-start'] = el)}
              type="date"
              style={styles.input}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Your End Date
            <span style={styles.requiredBadge}>Required</span>
          </label>
          <div
            onClick={() => dateRefs.current['main-end']?.showPicker()}
            style={{ cursor: 'pointer' }}
          >
            <input
              ref={(el) => (dateRefs.current['main-end'] = el)}
              type="date"
              style={styles.input}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>

        {formData.projectType === 'planned-leave' ? (
          <>
            <h3 style={styles.sectionTitle}>Leave Periods</h3>
            {leavePeriods.map((period) => (
              <div key={period.id} style={styles.customFieldCard}>
                <div style={styles.customFieldHeader}>
                  <div>
                    <div style={styles.customFieldName}>{period.name}</div>
                    <div style={styles.customFieldType}>Leave Period</div>
                  </div>
                  <button
                    style={styles.deleteButton(hoveredItem === `remove-period-${period.id}`)}
                    onMouseEnter={() => setHoveredItem(`remove-period-${period.id}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => setLeavePeriods(leavePeriods.filter(p => p.id !== period.id))}
                    title="Delete this leave period"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={styles.dateRangeContainer}>
                  <div>
                    <div
                      onClick={() => dateRefs.current[`leave-${period.id}-start`]?.showPicker()}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        ref={(el) => (dateRefs.current[`leave-${period.id}-start`] = el)}
                        type="date"
                        style={styles.input}
                        value={period.startDate || ''}
                        onChange={(e) => {
                          const updated = leavePeriods.map(p =>
                            p.id === period.id ? { ...p, startDate: e.target.value } : p
                          );
                          setLeavePeriods(updated);
                        }}
                      />
                    </div>
                  </div>
                  <span style={styles.dateRangeConnector}>to</span>
                  <div>
                    <div
                      onClick={() => dateRefs.current[`leave-${period.id}-end`]?.showPicker()}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        ref={(el) => (dateRefs.current[`leave-${period.id}-end`] = el)}
                        type="date"
                        style={styles.input}
                        value={period.endDate || ''}
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

            {/* Add Leave Period */}
            <div style={styles.addFieldSection}>
              <h4 style={styles.addFieldTitle}>Add New Leave Period</h4>
              <div style={styles.addFieldGrid}>
                <input
                  type="text"
                  style={styles.input}
                  value={newLeavePeriodName}
                  onChange={(e) => setNewLeavePeriodName(e.target.value)}
                  placeholder="Leave period name (e.g., January Leave)"
                />
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
                  Add Period
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 style={styles.sectionTitle}>Milestones</h3>
            {customFields.map((field) => (
              <div key={field.id} style={styles.customFieldCard}>
                <div style={styles.customFieldHeader}>
                  <div>
                    <div style={styles.customFieldName}>{field.name}</div>
                    <div style={styles.customFieldType}>Date Range</div>
                  </div>
                  <button
                    style={styles.deleteButton(hoveredItem === `remove-${field.id}`)}
                    onMouseEnter={() => setHoveredItem(`remove-${field.id}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => removeCustomField(field.id)}
                    title="Delete this milestone"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={styles.dateRangeContainer}>
                  <div>
                    <div
                      onClick={() => dateRefs.current[`milestone-${field.id}-start`]?.showPicker()}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        ref={(el) => (dateRefs.current[`milestone-${field.id}-start`] = el)}
                        type="date"
                        style={styles.input}
                        value={field.startDate || ''}
                        onChange={(e) => {
                          updateCustomField(field.id, 'startDate', e.target.value);
                          updateCustomField(field.id, 'value', `${e.target.value} - ${field.endDate}`);
                        }}
                      />
                    </div>
                  </div>
                  <span style={styles.dateRangeConnector}>to</span>
                  <div>
                    <div
                      onClick={() => dateRefs.current[`milestone-${field.id}-end`]?.showPicker()}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        ref={(el) => (dateRefs.current[`milestone-${field.id}-end`] = el)}
                        type="date"
                        style={styles.input}
                        value={field.endDate || ''}
                        onChange={(e) => {
                          updateCustomField(field.id, 'endDate', e.target.value);
                          updateCustomField(field.id, 'value', `${field.startDate} - ${e.target.value}`);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Milestone */}
            <div style={styles.addFieldSection}>
              <h4 style={styles.addFieldTitle}>Add New Milestone</h4>
              <div style={styles.addFieldGrid}>
                <input
                  type="text"
                  style={styles.input}
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Milestone name (e.g., Sprint 1, Design Phase)"
                />
                <button
                  style={styles.addButton(hoveredItem === 'add-field')}
                  onMouseEnter={() => setHoveredItem('add-field')}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={addCustomField}
                >
                  <Plus size={16} />
                  Add Milestone
                </button>
              </div>
            </div>
          </>
        )}

        <button
          style={styles.saveButton(hoveredItem === 'save')}
          onMouseEnter={() => setHoveredItem('save')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={handleSave}
        >
          <Save size={20} />
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default AdminEditIndividualPlan;