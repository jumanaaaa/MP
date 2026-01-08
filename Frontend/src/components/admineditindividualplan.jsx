import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  User,
  Bell,
  Trash2,
  Save,
  Calendar,
  Clock
} from 'lucide-react';
import DatePicker from '../components/DatePicker';
import Dropdown from '../components/Dropdown';
import { apiFetch } from '../utils/api';

const AdminEditIndividualPlan = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
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
  const [planId, setPlanId] = useState(() => {
    // Get planId from URL path like /admineditindividualplan/123
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    return id && !isNaN(id) ? parseInt(id) : null;
  });
  const [editMode, setEditMode] = useState('structure');

  // Stats for profile tooltip
  const [individualPlans, setIndividualPlans] = useState([]);
  const [supervisedPlans, setSupervisedPlans] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const [formData, setFormData] = useState({
    assignedProject: '',
    projectType: '',
    role: '',
    startDate: '',
    endDate: ''
  });

  const [customFields, setCustomFields] = useState([]);
  const [weeklyAllocations, setWeeklyAllocations] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');

  const WEEKLY_CAPACITY = 42.5;

  // Format date for input fields
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().split('T')[0];
  };

  // Parse date for API
  const parseDateForAPI = (dateStr) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0];
    }
    return dateStr;
  };

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await apiFetch('/user/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Failed to fetch user profile');

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    const pageStyle = document.createElement('style');
    pageStyle.textContent = `
    body, html, #root, .app, .main-content, .page-container, .content-wrapper {
      background: ${isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'} !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: "Montserrat", sans-serif !important;
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
  `;
    document.head.appendChild(pageStyle);

    return () => {
      document.head.removeChild(pageStyle);
    };
  }, [isDarkMode]);

  // Fetch all plans for stats
  useEffect(() => {
    const fetchAllPlans = async () => {
      try {
        // Fetch individual plans
        const plansRes = await apiFetch('/plan/individual', {
          method: 'GET',
          credentials: 'include',
        });

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setIndividualPlans(plansData);
        }

        // Fetch supervised plans
        const supervisedRes = await apiFetch('/plan/individual/supervised', {
          method: 'GET',
          credentials: 'include',
        });

        if (supervisedRes.ok) {
          const supervisedData = await supervisedRes.json();
          setSupervisedPlans(supervisedData);
        }

        // Fetch master plans for pending approvals count
        if (user?.id) {
          const masterRes = await apiFetch('/plan/master', {
            method: 'GET',
            credentials: 'include',
          });

          if (masterRes.ok) {
            const masterData = await masterRes.json();
            const userPlans = masterData.filter(plan => plan.createdBy === user.id);
            const pending = userPlans.filter(plan =>
              plan.approvalStatus === 'Pending Approval'
            ).length;
            setPendingApprovalsCount(pending);
          }
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      }
    };

    if (user) {
      fetchAllPlans();
    }
  }, [user]);

  // Fetch plan data
  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) {
        alert('No plan ID provided');
        window.location.href = '/adminindividualplan';
        return;
      }

      try {
        setLoading(true);

        const res = await apiFetch('/plan/individual', {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Failed to fetch plans');

        const plans = await res.json();
        const plan = plans.find(p => p.Id === planId);

        if (!plan) {
          alert('Plan not found');
          return;
        }

        const fields = typeof plan.Fields === 'string'
          ? JSON.parse(plan.Fields)
          : plan.Fields;

        setFormData({
          assignedProject: plan.Project,
          projectType: plan.ProjectType || 'custom',
          role: plan.Role || '',
          startDate: formatDateForInput(plan.StartDate),
          endDate: formatDateForInput(plan.EndDate)
        });

        // Parse milestones
        const parsedFields = [];
        let fieldId = 1;

        Object.entries(fields).forEach(([key, value]) => {
          if (key === 'title' || key === 'status') return;

          if (typeof value === 'object' && value !== null) {
            parsedFields.push({
              id: fieldId++,
              name: key,
              type: 'Date Range',
              status: value.status || 'Ongoing',
              startDate: formatDateForInput(value.startDate),
              endDate: formatDateForInput(value.endDate)
            });
          }
        });

        setCustomFields(parsedFields);

        // Fetch weekly allocations
        await fetchWeeklyAllocations(planId);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching plan:', err);
        alert('Failed to load plan');
      }
    };

    fetchPlan();
  }, [planId]);

  // Fetch weekly allocations
  const fetchWeeklyAllocations = async (planId) => {
    try {
      const res = await apiFetch('/weekly-allocations/all', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to fetch weekly allocations');

      const allAllocations = await res.json();

      const planAllocations = allAllocations
        .filter(a => a.IndividualPlanId === planId)
        .map(a => ({
          id: a.Id,
          weekStart: formatDateForInput(a.WeekStart),
          weekEnd: formatDateForInput(a.WeekEnd),
          plannedHours: parseFloat(a.PlannedHours) || 0,
          tasks: JSON.parse(a.Tasks || '[]').join('\n'),
          notes: a.Notes || '',
          status: a.Status || 'Planned'
        }));

      setWeeklyAllocations(planAllocations);
    } catch (err) {
      console.error('Error fetching weekly allocations:', err);
    }
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      localStorage.setItem('darkMode', newMode.toString());
    } catch (error) {
      console.log('LocalStorage not available');
    }
    setShowProfileTooltip(false);
  };
  const handleGoBack = () => window.location.href = '/adminindividualplan';

  // Milestone management
  const addCustomField = () => {
    if (newFieldName.trim()) {
      setCustomFields([...customFields, {
        id: Date.now(),
        name: newFieldName.trim(),
        type: 'Date Range',
        status: 'Ongoing',
        startDate: '',
        endDate: ''
      }]);
      setNewFieldName('');
    }
  };

  const removeCustomField = (fieldId) => {
    setCustomFields(customFields.filter(f => f.id !== fieldId));
  };

  const updateCustomField = (fieldId, key, value) => {
    setCustomFields(customFields.map(f =>
      f.id === fieldId ? { ...f, [key]: value } : f
    ));
  };

  // Weekly allocation management
  const addWeeklyAllocation = () => {
    setWeeklyAllocations([...weeklyAllocations, {
      id: Date.now(),
      weekStart: '',
      weekEnd: '',
      plannedHours: 0,
      tasks: '',
      notes: '',
      status: 'Planned'
    }]);
  };

  const removeWeeklyAllocation = (id) => {
    setWeeklyAllocations(weeklyAllocations.filter(w => w.id !== id));
  };

  const updateWeeklyAllocation = (id, key, value) => {
    setWeeklyAllocations(weeklyAllocations.map(w =>
      w.id === id ? { ...w, [key]: value } : w
    ));
  };

  const handleWeekStartChange = (id, startDate) => {
    updateWeeklyAllocation(id, 'weekStart', startDate);

    // Auto-suggest Friday if Monday
    const d = new Date(startDate);
    if (d.getDay() === 1) {
      const allocation = weeklyAllocations.find(w => w.id === id);
      if (!allocation?.weekEnd) {
        const friday = new Date(d);
        friday.setDate(d.getDate() + 4);
        updateWeeklyAllocation(id, 'weekEnd', friday.toISOString().split('T')[0]);
      }
    }
  };

  // Save all changes
  const handleSave = async () => {
    try {
      console.log('Saving individual plan changes...');

      // Save milestone structure
      const fields = {};
      customFields.forEach(field => {
        fields[field.name] = {
          status: field.status || 'Ongoing',
          startDate: parseDateForAPI(field.startDate),
          endDate: parseDateForAPI(field.endDate)
        };
      });

      const planPayload = {
        project: formData.assignedProject,
        projectType: formData.projectType,
        role: formData.role,
        startDate: parseDateForAPI(formData.startDate),
        endDate: parseDateForAPI(formData.endDate),
        fields
      };

      const planResponse = await apiFetch(`/plan/individual/${planId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planPayload)
      });

      if (!planResponse.ok) {
        throw new Error('Failed to update plan structure');
      }

      // Save weekly allocations
      for (const allocation of weeklyAllocations) {
        const weeklyPayload = {
          individualPlanId: planId,
          projectName: formData.assignedProject,
          projectType: formData.projectType,
          weekStart: parseDateForAPI(allocation.weekStart),
          weekEnd: parseDateForAPI(allocation.weekEnd),
          plannedHours: allocation.plannedHours,
          tasks: allocation.tasks.split('\n').filter(t => t.trim()),
          notes: allocation.notes,
          aiGenerated: false
        };

        await apiFetch('/weekly-allocations', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(weeklyPayload)
        });
      }

      console.log('Plan updated successfully');
      alert('✅ Individual plan and weekly allocations saved successfully!');
      window.location.href = '/adminindividualplan';

    } catch (error) {
      console.error('Error saving plan:', error);
      alert(`❌ Failed to save plan: ${error.message}`);
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
      animation: 'slideIn 0.3s ease-out'
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
      margin: 0
    },
    button: (isHovered) => ({
      padding: '12px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
      color: isHovered ? '#3b82f6' : isDarkMode ? '#e2e8f0' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: isHovered
        ? '0 8px 25px rgba(59,130,246,0.15)'
        : '0 4px 12px rgba(0,0,0,0.08)',
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
      zIndex: 9999,
      animation: 'slideIn 0.2s ease-out'
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
      borderRight: 'none'
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
      marginBottom: '2px'
    },
    userRole: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    userStats: {
      borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)',
      paddingTop: '12px',
      display: 'flex',
      justifyContent: 'space-between'
    },
    statItem: {
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '14px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    statLabel: {
      fontSize: '10px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
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
      textAlign: 'center'
    },
    modeToggle: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,0.8)',
      padding: '6px',
      borderRadius: '14px',
      width: 'fit-content',
      backdropFilter: 'blur(10px)',
      border: isDarkMode
        ? '1px solid rgba(75,85,99,0.3)'
        : '1px solid rgba(226,232,240,0.5)'
    },
    modeButton: (isActive) => ({
      padding: '10px 18px',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: isActive ? '#3b82f6' : 'transparent',
      color: isActive ? '#fff' : isDarkMode ? '#e2e8f0' : '#64748b',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }),
    formCard: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: isDarkMode
        ? '0 12px 30px rgba(0,0,0,0.35)'
        : '0 12px 30px rgba(0,0,0,0.12)',
      backdropFilter: 'blur(20px)',
      marginBottom: '24px',
      animation: 'slideIn 0.25s ease-out',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '800',
      letterSpacing: '-0.3px',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '24px'
    },
    fieldGroup: {
      marginBottom: '20px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#d1d5db' : '#374151',
      marginBottom: '8px',
      display: 'block'
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
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      outline: 'none',
      boxSizing: 'border-box'
    },
    customFieldCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px'
    },
    customFieldHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    },
    deleteButton: (isHovered) => ({
      padding: '4px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(239,68,68,0.1)' : 'transparent',
      color: isHovered ? '#ef4444' : isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer'
    }),
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
      transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isHovered
        ? '0 8px 25px rgba(37,99,235,0.25)'
        : '0 4px 12px rgba(0,0,0,0.08)'
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
      transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isHovered
        ? '0 10px 30px rgba(16,185,129,0.35)'
        : '0 6px 18px rgba(0,0,0,0.15)'
    }),
    infoBox: {
      marginTop: '20px',
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      fontSize: '13px',
      color: isDarkMode ? '#93c5fd' : '#3b82f6'
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ textAlign: 'center', padding: '60px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
          Loading plan data...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
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
          <h1 style={styles.title}>Edit Individual Plan</h1>
        </div>

        <div style={styles.headerRight}>
          <button
            style={styles.button(hoveredItem === 'alerts')}
            onMouseEnter={() => setHoveredItem('alerts')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => window.location.href = '/adminalerts'}
          >
            <Bell size={20} />
            <div style={styles.notificationBadge}></div>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={styles.button(hoveredItem === 'profile')}
              onMouseEnter={() => {
                setHoveredItem('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => setHoveredItem(null)}  // ✅ Only clear hover state
              onClick={() => window.location.href = '/adminprofile'}
            >
              <User size={20} />
            </button>

            {showProfileTooltip && user && (
              <div
                style={styles.profileTooltip}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
              >
                <div style={styles.tooltipArrow}></div>
                <div style={styles.userInfo}>
                  <div style={styles.avatar}>
                    {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {user.firstName || 'Unknown'} {user.lastName || 'User'}
                    </div>
                    <div style={styles.userRole}>
                      {user.role === 'admin' ? 'Admin' : 'Member'}
                      • {user.department || 'N/A'}
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

      {/* Mode Toggle */}
      <div style={styles.modeToggle}>
        <button
          style={styles.modeButton(editMode === 'structure')}
          onClick={() => setEditMode('structure')}
        >
          <Calendar size={16} />
          Structure (Timeline)
        </button>
        <button
          style={styles.modeButton(editMode === 'weekly')}
          onClick={() => setEditMode('weekly')}
        >
          <Clock size={16} />
          Weekly Execution
        </button>
      </div>

      {/* Structure Mode */}
      {editMode === 'structure' && (
        <div style={styles.formCard}>
          <h3 style={styles.sectionTitle}>Edit Plan Structure</h3>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Project</label>
            <input
              type="text"
              style={{ ...styles.input, opacity: 0.7, cursor: 'not-allowed' }}
              value={formData.assignedProject}
              disabled
            />
          </div>

          <div style={styles.fieldGroup}>
            <Dropdown
              label="Your Role"
              value={formData.role}
              onChange={(value) => setFormData({ ...formData, role: value })}
              options={[
                'Frontend Developer',
                'Backend Developer',
                'Full Stack Developer',
                'QA Engineer',
                'Project Manager',
                'Designer'
              ]}
              allowCustom
              searchable
              isDarkMode={isDarkMode}
              compact
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Start Date</label>
            <DatePicker
              value={formData.startDate}
              onChange={(date) => setFormData({ ...formData, startDate: date })}
              isDarkMode={isDarkMode}
              compact
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>End Date</label>
            <DatePicker
              value={formData.endDate}
              onChange={(date) => setFormData({ ...formData, endDate: date })}
              isDarkMode={isDarkMode}
              compact
            />
          </div>

          <h4 style={{ fontSize: '16px', fontWeight: '600', color: isDarkMode ? '#d1d5db' : '#374151', marginTop: '32px', marginBottom: '16px' }}>
            Milestones
          </h4>

          {customFields.map((field) => (
            <div key={field.id} style={styles.customFieldCard}>
              <div style={styles.customFieldHeader}>
                <div style={{ fontWeight: '600', color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                  {field.name}
                </div>
                <button
                  style={styles.deleteButton(hoveredItem === `remove-${field.id}`)}
                  onMouseEnter={() => setHoveredItem(`remove-${field.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => removeCustomField(field.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <DatePicker
                  value={field.startDate}
                  onChange={(date) => updateCustomField(field.id, 'startDate', date)}
                  isDarkMode={isDarkMode}
                  compact
                />
                <DatePicker
                  value={field.endDate}
                  onChange={(date) => updateCustomField(field.id, 'endDate', date)}
                  isDarkMode={isDarkMode}
                  compact
                />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <input
              type="text"
              style={styles.input}
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="New milestone name"
            />
            <button
              style={styles.addButton(hoveredItem === 'add-field')}
              onMouseEnter={() => setHoveredItem('add-field')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={addCustomField}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      )}

      {/* Weekly Mode */}
      {editMode === 'weekly' && (
        <div style={styles.formCard}>
          <h3 style={styles.sectionTitle}>Edit Weekly Allocations</h3>
          <p style={{ fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '24px' }}>
            Manage your weekly time allocations for this project. Recommended: {WEEKLY_CAPACITY}h per week.
          </p>

          {weeklyAllocations.map((week, index) => (
            <div key={week.id} style={{
              ...styles.customFieldCard,
              padding: '20px',
              marginBottom: '16px'
            }}>
              {/* Header with Remove Button */}
              <div style={styles.customFieldHeader}>
                <div>
                  <div style={{ fontWeight: '600', color: isDarkMode ? '#e2e8f0' : '#374151', fontSize: '15px' }}>
                    Week {index + 1}
                  </div>
                  <div style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                    {week.weekStart && week.weekEnd
                      ? `${new Date(week.weekStart).toLocaleDateString()} - ${new Date(week.weekEnd).toLocaleDateString()}`
                      : 'Dates not set'}
                  </div>
                </div>
                <button
                  style={styles.deleteButton(hoveredItem === `remove-week-${week.id}`)}
                  onMouseEnter={() => setHoveredItem(`remove-week-${week.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => removeWeeklyAllocation(week.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ ...styles.label, fontSize: '12px', marginBottom: '6px' }}>Start Date</label>
                  <DatePicker
                    value={week.weekStart}
                    onChange={(date) => handleWeekStartChange(week.id, date)}
                    isDarkMode={isDarkMode}
                    compact
                  />
                </div>
                <div>
                  <label style={{ ...styles.label, fontSize: '12px', marginBottom: '6px' }}>End Date</label>
                  <DatePicker
                    value={week.weekEnd}
                    onChange={(date) => updateWeeklyAllocation(week.id, 'weekEnd', date)}
                    isDarkMode={isDarkMode}
                    compact
                  />
                </div>
              </div>

              {/* Allocated Hours */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '6px' }}>
                  Allocated Hours
                </label>
                <input
                  type="number"
                  style={{
                    ...styles.input,
                    fontWeight: '600',
                    fontSize: '16px'
                  }}
                  value={week.plannedHours}
                  onChange={(e) => updateWeeklyAllocation(week.id, 'plannedHours', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                  min="0"
                  max="80"
                  step="0.5"
                />
              </div>

              {/* Tasks Section - Parse from string to array */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '6px' }}>
                  Tasks
                </label>

                {week.tasks.split('\n').filter(t => t.trim()).map((task, taskIndex) => (
                  <div key={taskIndex} style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '6px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => {
                        const taskArray = week.tasks.split('\n').filter(t => t.trim());
                        taskArray[taskIndex] = e.target.value;
                        updateWeeklyAllocation(week.id, 'tasks', taskArray.join('\n'));
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
                        backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.8)',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <button
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: hoveredItem === `remove-task-${week.id}-${taskIndex}`
                          ? 'rgba(239,68,68,0.1)'
                          : 'transparent',
                        color: hoveredItem === `remove-task-${week.id}-${taskIndex}`
                          ? '#ef4444'
                          : (isDarkMode ? '#94a3b8' : '#64748b'),
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={() => setHoveredItem(`remove-task-${week.id}-${taskIndex}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => {
                        const taskArray = week.tasks.split('\n').filter(t => t.trim());
                        taskArray.splice(taskIndex, 1);
                        updateWeeklyAllocation(week.id, 'tasks', taskArray.join('\n'));
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* Add Task Button */}
                <button
                  style={{
                    ...styles.addButton(hoveredItem === `add-task-${week.id}`),
                    padding: '8px 14px',
                    fontSize: '12px',
                    marginTop: '8px'
                  }}
                  onMouseEnter={() => setHoveredItem(`add-task-${week.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => {
                    const currentTasks = week.tasks ? week.tasks.trim() : '';
                    const newTasks = currentTasks ? `${currentTasks}\nNew task` : 'New task';
                    updateWeeklyAllocation(week.id, 'tasks', newTasks);
                  }}
                >
                  <Plus size={12} />
                  Add Task
                </button>
              </div>

              {/* Notes Section */}
              <div>
                <label style={{ ...styles.label, fontSize: '12px', marginBottom: '6px' }}>
                  Additional Notes (Optional)
                </label>
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: '60px',
                    resize: 'vertical',
                    fontStyle: 'italic'
                  }}
                  value={week.notes}
                  onChange={(e) => updateWeeklyAllocation(week.id, 'notes', e.target.value)}
                  placeholder="Any additional context or notes..."
                />
              </div>
            </div>
          ))}

          {/* Total Hours Summary */}
          {weeklyAllocations.length > 0 && (
            <div style={{
              marginTop: '20px',
              marginBottom: '20px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: (() => {
                const total = weeklyAllocations.reduce((sum, w) => sum + (w.plannedHours || 0), 0);
                const avgPerWeek = total / weeklyAllocations.length;
                if (avgPerWeek > WEEKLY_CAPACITY) return 'rgba(239,68,68,0.1)';
                if (Math.abs(avgPerWeek - WEEKLY_CAPACITY) < 1) return 'rgba(16,185,129,0.1)';
                return isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)';
              })(),
              border: (() => {
                const total = weeklyAllocations.reduce((sum, w) => sum + (w.plannedHours || 0), 0);
                const avgPerWeek = total / weeklyAllocations.length;
                if (avgPerWeek > WEEKLY_CAPACITY) return '1px solid rgba(239,68,68,0.3)';
                if (Math.abs(avgPerWeek - WEEKLY_CAPACITY) < 1) return '1px solid rgba(16,185,129,0.3)';
                return isDarkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.2)';
              })()
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: isDarkMode ? '#93c5fd' : '#3b82f6',
                marginBottom: '8px'
              }}>
                Summary
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: isDarkMode ? '#e2e8f0' : '#1e293b'
                  }}>
                    {weeklyAllocations.reduce((sum, w) => sum + (w.plannedHours || 0), 0).toFixed(1)}h
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}>
                    Total Hours
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: isDarkMode ? '#e2e8f0' : '#1e293b'
                  }}>
                    {(weeklyAllocations.reduce((sum, w) => sum + (w.plannedHours || 0), 0) / weeklyAllocations.length).toFixed(1)}h
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}>
                    Average per Week
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Week Button */}
          <button
            style={styles.addButton(hoveredItem === 'add-week')}
            onMouseEnter={() => setHoveredItem('add-week')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={addWeeklyAllocation}
          >
            <Plus size={16} />
            Add Weekly Allocation
          </button>

          <button
            style={styles.addButton(hoveredItem === 'add-week')}
            onMouseEnter={() => setHoveredItem('add-week')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={addWeeklyAllocation}
          >
            <Plus size={16} />
            Add Weekly Allocation
          </button>

          <div style={styles.infoBox}>
            💡 <strong>Tip:</strong> Plan Monday-Friday ({WEEKLY_CAPACITY}h) for standard work weeks, but you can use custom periods as needed.
          </div>
        </div>
      )}

      {/* Save Button */}
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
  );
};

export default AdminEditIndividualPlan;