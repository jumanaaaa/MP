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
  AlertCircle,
  Shield,
  Users
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import DatePicker from '../components/DatePicker';
import Dropdown from '../components/Dropdown';

const AdminAddPlan = () => {
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
  const [activeTab, setActiveTab] = useState('Master Plan');
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);

  // 🆕 PROJECT TEAM STATE (separate from permissions)
  const [projectTeam, setProjectTeam] = useState([]); // People involved in project
  const [availableUsersForTeam, setAvailableUsersForTeam] = useState([]);
  const [selectedUserForTeam, setSelectedUserForTeam] = useState('');

  // 🆕 MILESTONE USER ASSIGNMENTS STATE
  const [milestoneAssignments, setMilestoneAssignments] = useState({}); // { milestoneId: [userIds] }
  const [showMilestoneUsersModal, setShowMilestoneUsersModal] = useState(false);
  const [selectedMilestoneForUsers, setSelectedMilestoneForUsers] = useState(null);

  const [customUserName, setCustomUserName] = useState('');
  const [customUserEmail, setCustomUserEmail] = useState('');
  const [showCustomUserInputs, setShowCustomUserInputs] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState({
    project: '',
    projectType: '',
    startDate: '',
    endDate: ''
  });

  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('UAT');
  const [newFieldType, setNewFieldType] = useState('Date Range');

  // AI Recommendations
  const [aiRecommendations, setAiRecommendations] = useState({
    reasoning: '',
    suggestedFields: []
  });

  const [userQuery, setUserQuery] = useState('');

  // User data state
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // 🆕 ACCESS CONTROL STATE
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [userStats, setUserStats] = useState({
    totalPlans: 0,
    inProgress: 0,
    completed: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fieldTypes = ['Date Range'];

  const projectStartDateRef = useRef(null);
  const projectEndDateRef = useRef(null);

  useEffect(() => {
    const hasContent =
      formData.project ||
      formData.projectType ||
      formData.startDate ||
      formData.endDate ||
      customFields.length > 0 ||
      selectedUsers.length > 0 ||
      projectTeam.length > 0 ||
      userQuery.trim();

    setHasUnsavedChanges(hasContent);
  }, [formData, customFields, selectedUsers, projectTeam, userQuery]);

  const convertToDateInput = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const convertFromDateInput = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userData) return;

      setIsLoadingStats(true);
      try {
        const response = await apiFetch('/plan/master', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const plans = await response.json();

          // Calculate stats like AdminViewPlan does
          const totalPlans = plans.length;

          const inProgress = plans.filter(plan => {
            const fields = typeof plan.fields === 'string'
              ? JSON.parse(plan.fields)
              : plan.fields;

            if (!fields) return false;

            const milestones = Object.values(fields)
              .filter(v => typeof v === 'object' && v?.status);

            return milestones.length > 0 &&
              milestones.some(m => m.status !== 'Completed');
          }).length;

          const completed = plans.filter(plan => {
            const fields = typeof plan.fields === 'string'
              ? JSON.parse(plan.fields)
              : plan.fields;

            if (!fields) return false;

            const milestones = Object.values(fields)
              .filter(v => typeof v === 'object' && v?.status);

            return milestones.length > 0 &&
              milestones.every(m => m.status === 'Completed');
          }).length;

          setUserStats({
            totalPlans,
            inProgress,
            completed
          });
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (userData) {
      fetchUserStats();
    }
  }, [userData]);

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

  // 🆕 FETCH AVAILABLE USERS FOR PERMISSIONS
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData) return;

      setIsLoadingUsers(true);
      try {
        console.log('👥 Fetching user list for permissions...');

        const response = await apiFetch('/user/list', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();  // 👈 CHANGE: Store full response
          const users = data.users || [];      // 👈 CHANGE: Extract users array

          // Filter out current user (they're automatically owner)
          const filteredUsers = users.filter(u => u.id !== userData.id);
          console.log(`✅ Loaded ${filteredUsers.length} available users`);
          setAvailableUsers(filteredUsers);
        } else {
          console.error('❌ Failed to fetch user list');
        }
      } catch (error) {
        console.error('💥 Error fetching user list:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (userData) {
      fetchUsers();
    }
  }, [userData]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData) return;

      try {
        const response = await apiFetch('/user/list', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          const users = data.users || [];
          const filteredUsers = users.filter(u => u.id !== userData.id);
          setAvailableUsersForTeam(filteredUsers);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    if (userData) {
      fetchUsers();
    }
  }, [userData]);

  const addUserToProjectTeam = (userId, isCustom = false, customName = '', customEmail = '') => {
    if (isCustom) {
      // Add custom external user
      const customUser = {
        id: `custom-${Date.now()}`,
        firstName: customName.split(' ')[0] || customName,
        lastName: customName.split(' ').slice(1).join(' ') || '',
        email: customEmail,
        department: 'External',
        isCustom: true
      };
      setProjectTeam([...projectTeam, customUser]);

      // Don't auto-add custom users to Access Control (they're external)
    } else {
      const user = availableUsersForTeam.find(u => u.id === userId);
      if (user && !projectTeam.find(u => u.id === userId)) {
        setProjectTeam([...projectTeam, user]);

        // 🔥 AUTO-ADD TO ACCESS CONTROL AS VIEWER
        if (!selectedUsers.find(u => u.id === userId)) {
          setSelectedUsers([...selectedUsers, {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            department: user.department,
            permission: 'viewer' // Default permission
          }]);
        }
      }
    }

    setSelectedUserForTeam('');
  };

  const removeUserFromProjectTeam = (userId) => {
    setProjectTeam(projectTeam.filter(u => u.id !== userId));

    // Also remove from access control if they're there
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));

    // Remove from all milestone assignments
    const updatedAssignments = { ...milestoneAssignments };
    Object.keys(updatedAssignments).forEach(milestoneId => {
      updatedAssignments[milestoneId] = updatedAssignments[milestoneId].filter(id => id !== userId);
    });
    setMilestoneAssignments(updatedAssignments);
  };

  // 🆕 MANAGE MILESTONE USERS
  const handleManageMilestoneUsers = (fieldId) => {
    setSelectedMilestoneForUsers(fieldId);
    setShowMilestoneUsersModal(true);
  };

  // 🆕 ADD USER TO MILESTONE
  const addUserToMilestone = (milestoneId, userId) => {
    const currentAssignments = milestoneAssignments[milestoneId] || [];
    if (!currentAssignments.includes(userId)) {
      setMilestoneAssignments({
        ...milestoneAssignments,
        [milestoneId]: [...currentAssignments, userId]
      });
    }
  };

  // 🆕 REMOVE USER FROM MILESTONE
  const removeUserFromMilestone = (milestoneId, userId) => {
    const currentAssignments = milestoneAssignments[milestoneId] || [];
    setMilestoneAssignments({
      ...milestoneAssignments,
      [milestoneId]: currentAssignments.filter(id => id !== userId)
    });
  };

  // 🆕 ADD USER PERMISSION
  const addUserPermission = (userId, permissionLevel = 'editor') => {
    const user = availableUsers.find(u => u.id === userId);
    if (user && !selectedUsers.find(u => u.id === userId)) {
      setSelectedUsers([...selectedUsers, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        department: user.department,
        permission: permissionLevel
      }]);
      console.log(`✅ Added ${user.firstName} ${user.lastName} as ${permissionLevel}`);
    }
  };

  // 🆕 REMOVE USER PERMISSION
  const removeUserPermission = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    console.log(`🗑️ Removed user ${userId} from permissions`);
  };

  // 🆕 UPDATE USER PERMISSION LEVEL
  const updateUserPermission = (userId, newPermission) => {
    setSelectedUsers(selectedUsers.map(u =>
      u.id === userId ? { ...u, permission: newPermission } : u
    ));
    console.log(`🔄 Updated user ${userId} permission to ${newPermission}`);
  };

  // Sort milestones chronologically by start date
  const sortMilestonesByDate = (milestones) => {
    return [...milestones].sort((a, b) => {
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      };

      const dateA = parseDate(a.startDate);
      const dateB = parseDate(b.startDate);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return dateA - dateB;
    });
  };

  // Auto-sort milestones when dates change
  useEffect(() => {
    if (customFields.length > 0) {
      const hasAnyDates = customFields.some(f => f.startDate);

      if (hasAnyDates) {
        const sorted = sortMilestonesByDate(customFields);
        const orderChanged = sorted.some((field, idx) => field.id !== customFields[idx].id);
        if (orderChanged) {
          setCustomFields(sorted);
        }
      }
    }
  }, [customFields.map(f => f.startDate).join(',')]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const confirmNavigation = (message = '⚠️ You have unsaved changes. Are you sure you want to leave?') => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(message);
  };

  const handleGoBack = () => {
    if (!confirmNavigation()) return;

    console.log('🔙 Going back to plan overview');
    const targetPage = userData?.role === 'admin' ? '/adminviewplan' : '/viewplan';
    window.location.href = targetPage;
  };

  const addCustomField = () => {
    if (newFieldName.trim()) {
      const isDuplicate = customFields.some(
        field => field.name.toLowerCase() === newFieldName.trim().toLowerCase()
      );

      if (isDuplicate) {
        alert(`⚠️ Milestone "${newFieldName.trim()}" already exists!`);
        return;
      }

      const newField = {
        id: Date.now(),
        name: newFieldName.trim(),
        type: 'Date Range',
        value: customFields.length === 0 ? 'On Track' : 'On Track',
        startDate: '',
        endDate: '',
        required: false
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

  // AI GENERATION with Department Actuals & Optional Web Search
  const generateAIRecommendations = async () => {
    try {
      setIsGeneratingRecommendations(true);
      setShowAIRecommendations(false);
      setAiRecommendations({ reasoning: '', suggestedFields: [] });

      const payload = {
        project: formData.project,
        projectType: formData.projectType,
        startDate: formatDateForBackend(formData.startDate),
        endDate: formatDateForBackend(formData.endDate),
        fields: customFields.reduce((acc, field) => {
          acc[field.name] = {
            status: field.value,
            startDate: formatDateForBackend(field.startDate),
            endDate: formatDateForBackend(field.endDate)
          };
          return acc;
        }, {}),
        userId: userData.id,
        permissions: selectedUsers.map(u => ({
          userId: u.id,
          permissionLevel: u.permission
        })),
        projectTeam: projectTeam.map(u => ({
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          isCustom: u.isCustom || false
        })),
        milestoneAssignments: milestoneAssignments // Send milestone user assignments
      };

      console.log('🧠 Sending Master Plan AI request:', payload);

      const response = await apiFetch('/masterplan-ai/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('🤖 AI Response:', data);

      if (response.ok && data.success && data.masterPlan) {
        const masterPlan = data.masterPlan;
        const historicalContext = data.historicalContext;

        let reasoningText = `**AI-Generated Master Plan** (Source: ${data.source === 'ai' ? 'AI Analysis' : 'Standard Template'})\n\n`;

        if (historicalContext.totalRecords > 0) {
          reasoningText += `Based on analysis of **${historicalContext.totalRecords} historical project records** from ${historicalContext.projectsAnalyzed} projects in the **${data.department}** department.\n\n`;
        } else {
          reasoningText += `No historical data available. Generated using intelligent fallback.\n\n`;
        }

        if (historicalContext.hasUserQuery) {
          reasoningText += `✅ Customized based on your project scope and requirements.\n`;
        }

        if (historicalContext.webSearchUsed) {
          reasoningText += `🌐 Enhanced with general project knowledge from web search.\n`;
        }

        const suggestedFields = Object.entries(masterPlan).map(([phase, details]) => ({
          name: phase,
          type: 'Date Range',
          startDate: convertFromDateInput(details.startDate),
          endDate: convertFromDateInput(details.endDate),
          status: details.status || 'Planned'
        }));

        setAiRecommendations({
          reasoning: reasoningText,
          suggestedFields
        });
        setShowAIRecommendations(true);
      } else {
        alert('⚠️ AI could not generate a plan. ' + (data.error || 'Please try again.'));
      }
    } catch (err) {
      console.error('💥 AI Recommendation error:', err);
      alert('⚠️ Failed to fetch AI recommendations. Please check backend connection.');
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const addRecommendedField = (field) => {
    const isDuplicate = customFields.some(
      existingField => existingField.name.toLowerCase() === field.name.toLowerCase()
    );

    if (isDuplicate) {
      alert(`⚠️ Milestone "${field.name}" already exists!`);
      return;
    }

    let validStatus = field.status || 'On Track';

    const validStatuses = ['On Track', 'At Risk', 'Completed', 'Delayed'];
    if (!validStatuses.includes(validStatus)) {
      console.warn(`⚠️ Invalid status "${validStatus}" from AI, converting to "On Track"`);
      validStatus = 'On Track';
    }

    validStatus = 'On Track';

    const newField = {
      id: Date.now(),
      name: field.name,
      type: 'Date Range',
      value: validStatus,
      required: false,
      startDate: field.startDate || '',
      endDate: field.endDate || ''
    };

    setCustomFields([...customFields, newField]);
  };

  const formatDateForBackend = (dateStr) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // // ⛔ PREVENT START DATE BEFORE TODAY
      // const today = new Date();
      // today.setHours(0, 0, 0, 0);

      // const [d, m, y] = formData.startDate.split('/');
      // const startDateObj = new Date(y, m - 1, d);

      // if (startDateObj < today) {
      //   alert("⚠️ Invalid Start Date: You cannot set a project before today's date.");
      //   setIsSubmitting(false);
      //   return;
      // }

      if (!formData.project || !formData.startDate || !formData.endDate) {
        alert('Please fill in all required fields: Project, Start Date, and End Date');
        setIsSubmitting(false);
        return;
      }

      const missingDates = customFields.filter(field => !field.startDate || !field.endDate);
      if (missingDates.length > 0) {
        alert(`Please fill in start and end dates for all milestones: ${missingDates.map(f => f.name).join(', ')}`);
        setIsSubmitting(false);
        return;
      }

      // 🆕 Ensure all milestone dates follow the project start date
      const [pDay, pMonth, pYear] = formData.startDate.split('/');
      const projectStart = new Date(pYear, pMonth - 1, pDay);

      for (const field of customFields) {
        if (field.startDate) {
          const [mDay, mMonth, mYear] = field.startDate.split('/');
          const milestoneStart = new Date(mYear, mMonth - 1, mDay);

          if (milestoneStart < projectStart) {
            alert(`⚠️ Milestone "${field.name}" starts before the project's start date.`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      const fields = {};
      customFields.forEach(field => {
        fields[field.name] = {
          status: field.value,
          startDate: formatDateForBackend(field.startDate),
          endDate: formatDateForBackend(field.endDate)
        };
      });

      const payload = {
        project: formData.project,
        projectType: formData.projectType,
        startDate: formatDateForBackend(formData.startDate),
        endDate: formatDateForBackend(formData.endDate),
        fields: fields,
        userId: userData.id,
        permissions: selectedUsers.map(u => ({
          userId: u.id,
          permissionLevel: u.permission
        }))
      };

      console.log('📝 Submitting master plan with permissions:', payload);

      const response = await apiFetch('/plan/master', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Master plan created successfully:', data);

        setHasUnsavedChanges(false);

        alert(`✅ Master plan created successfully with ${selectedUsers.length} team members!`);
        setCustomFields([]);
        setSelectedUsers([]);
        setShowAIRecommendations(false);
        setUserQuery('');

        setTimeout(() => {
          const targetPage = userData?.role === 'admin' ? '/adminviewplan' : '/viewplan';
          window.location.href = targetPage;
        }, 1500);
      } else {
        console.error('❌ Failed to create master plan:', data);
        setSubmitError(data.message || 'Failed to create master plan');
        alert(`❌ ${data.message || 'Failed to create master plan'}`);
      }
    } catch (error) {
      console.error('💥 Error submitting master plan:', error);
      setSubmitError('Network error. Please check your connection and try again.');
      alert('❌ Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      gridTemplateColumns: '1fr 400px',
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
      marginBottom: '24px',
      transition: 'all 0.3s ease'
    },
    configTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '20px',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
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
      fontFamily: '"Montserrat", sans-serif',
      cursor: 'pointer'
    },
    dateInputWrapper: {
      position: 'relative',
      cursor: 'pointer',
      width: '100%'
    },
    textarea: {
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
      resize: 'vertical',
      minHeight: '100px'
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
    // 🆕 RIGHT SIDEBAR SECTION (for AI + Access Control)
    rightSidebar: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    aiSection: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    },
    accessControlSection: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
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
    aiInfoBox: {
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
      border: isDarkMode ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.1)'
    },
    aiInfoText: {
      fontSize: '12px',
      lineHeight: '1.5',
      color: isDarkMode ? '#93c5fd' : '#3b82f6',
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-start'
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
    }),
    // 🆕 ACCESS CONTROL STYLES
    ownerBadge: {
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      borderRadius: '12px',
      padding: '12px 16px',
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: isDarkMode ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.1)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    permissionBadge: (level) => ({
      padding: '4px 12px',
      borderRadius: '6px',
      backgroundColor:
        level === 'owner' ? '#3b82f6' :
          level === 'editor' ? '#10b981' :
            '#64748b',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase'
    }),
    selectedUserCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '12px 16px',
      marginBottom: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    infoBox: {
      padding: '12px 16px',
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      borderRadius: '8px',
      fontSize: '12px',
      color: isDarkMode ? '#93c5fd' : '#3b82f6',
      lineHeight: '1.6',
      border: isDarkMode ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.1)',
      marginTop: '12px'
    },

    statusModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    },

    statusModalContent: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'visible',
      overflowX: 'visible',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(226,232,240,0.8)',
      position: 'relative',
      zIndex: 10000
    },

    statusModalTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px'
    },

    statusModalSubtitle: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '24px'
    },

    modalButton: (isHovered, type) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: type === 'cancel'
        ? (isHovered ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)')
        : (isHovered ? '#2563eb' : '#3b82f6'),
      color: type === 'cancel'
        ? '#ef4444'
        : '#fff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    })
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
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      input[type="date"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
        filter: ${isDarkMode ? 'invert(1)' : 'invert(0)'};
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [isDarkMode]);

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
  `;
    document.head.appendChild(pageStyle);

    return () => {
      document.head.removeChild(pageStyle);
    };
  }, [isDarkMode]);

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
                      {isLoadingStats ? '...' : userStats.totalPlans}
                    </div>
                    <div style={styles.tooltipStatLabel}>Plans</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {isLoadingStats ? '...' : userStats.inProgress}
                    </div>
                    <div style={styles.tooltipStatLabel}>In Progress</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {isLoadingStats ? '...' : userStats.completed}
                    </div>
                    <div style={styles.tooltipStatLabel}>Completed</div>
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
        <div style={styles.tab(true, false)}>
          Master Plan
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Form Section (Left) */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Master Plan</h2>

          <h3 style={styles.configTitle}>Configure Planning Fields</h3>

          {/* Basic Fields */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Project</label>
            <input
              type="text"
              style={styles.input}
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              placeholder="Enter project name"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Project Type</label>
            <input
              type="text"
              style={styles.input}
              value={formData.projectType}
              onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
              placeholder="e.g., Software Development, Infrastructure, Data Analytics, Migration"
            />
          </div>

          <DatePicker
            label="Start Date"
            value={convertToDateInput(formData.startDate)}
            onChange={(value) => setFormData({ ...formData, startDate: convertFromDateInput(value) })}
            isDarkMode={isDarkMode}
            placeholder="Select project start date"
            compact={true}
          />

          <DatePicker
            label="End Date"
            value={convertToDateInput(formData.endDate)}
            onChange={(value) => setFormData({ ...formData, endDate: convertFromDateInput(value) })}
            isDarkMode={isDarkMode}
            placeholder="Select project end date"
            compact={true}
          />

          {/* Custom Fields */}
          {customFields.map((field, index) => (
            <div key={field.id} style={styles.customField}>
              <div style={styles.customFieldHeader}>
                <div style={{ flex: 1 }}>
                  <div style={styles.customFieldName}>
                    {field.name}
                    <span style={{
                      marginLeft: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor:
                        field.value === 'Completed' ? '#3b82f620' :
                          field.value === 'On Track' ? '#10b98120' :
                            field.value === 'At Risk' ? '#f59e0b20' :
                              field.value === 'Delayed' ? '#ef444420' :
                                '#94a3b820',
                      color:
                        field.value === 'Completed' ? '#3b82f6' :
                          field.value === 'On Track' ? '#10b981' :
                            field.value === 'At Risk' ? '#f59e0b' :
                              field.value === 'Delayed' ? '#ef4444' :
                                '#94a3b8'
                    }}>
                      {field.value}
                    </span>
                  </div>
                  <div style={styles.customFieldType}>{field.type}</div>
                </div>
                <button
                  style={styles.removeButton(hoveredItem === `remove-${field.id}`)}
                  onMouseEnter={() => setHoveredItem(`remove-${field.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => removeCustomField(field.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  columnGap: '40px',
                  rowGap: '12px',
                  marginTop: '12px'
                }}
              >
                <DatePicker
                  label="Start Date"
                  value={convertToDateInput(field.startDate || '')}
                  onChange={(value) => updateCustomField(field.id, 'startDate', convertFromDateInput(value))}
                  isDarkMode={isDarkMode}
                  placeholder="Milestone start"
                  compact={true}
                />
                <DatePicker
                  label="End Date"
                  value={convertToDateInput(field.endDate || '')}
                  onChange={(value) => updateCustomField(field.id, 'endDate', convertFromDateInput(value))}
                  isDarkMode={isDarkMode}
                  placeholder="Milestone end"
                  compact={true}
                />
              </div>

              {/* 🆕 MANAGE MILESTONE USERS BUTTON */}
              <button
                style={{
                  marginTop: '12px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: hoveredItem === `milestone-users-${field.id}`
                    ? 'rgba(139,92,246,0.15)'
                    : 'rgba(139,92,246,0.1)',
                  color: hoveredItem === `milestone-users-${field.id}` ? '#7c3aed' : '#8b5cf6',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  width: '100%',
                  justifyContent: 'center'
                }}
                onMouseEnter={() => setHoveredItem(`milestone-users-${field.id}`)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => handleManageMilestoneUsers(field.id)}
              >
                <Users size={14} />
                Manage Users ({(milestoneAssignments[field.id] || []).length} assigned)
              </button>
            </div>
          ))}

          {/* Add New Field Section */}
          <div style={styles.addFieldSection}>
            <h4 style={{ ...styles.fieldLabel, marginBottom: '16px', fontSize: '16px' }}>Add Milestone/Phase</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  style={styles.input}
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Milestone name (e.g., UAT, Testing, Deployment)"
                />
              </div>
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

          {/* Submit Button */}
          <button
            style={styles.submitButton(hoveredItem === 'submit')}
            onMouseEnter={() => setHoveredItem('submit')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div style={styles.loadingSpinner}>⟳</div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Submit Master Plan
              </>
            )}
          </button>

          {submitError && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '14px'
            }}>
              {submitError}
            </div>
          )}
        </div>

        {/* 🆕 RIGHT SIDEBAR (AI + Access Control) */}
        <div style={styles.rightSidebar}>
          {/* AI Master Plan Generator */}
          <div style={styles.aiSection}>
            <div style={styles.aiHeader}>
              <Sparkles size={20} style={{ color: '#a855f7' }} />
              <h3 style={styles.aiTitle}>AI Master Plan Generator</h3>
            </div>

            {/* Info Box */}
            <div style={styles.aiInfoBox}>
              <div style={styles.aiInfoText}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  AI analyzes your department's historical project data to generate realistic timelines and milestones.
                </span>
              </div>
            </div>

            {/* User Query Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Project Scope (Optional, but recommended)</label>
              <textarea
                style={styles.textarea}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Describe your project scope, requirements, or specific milestones you need..."
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
                  Generate Master Plan
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
                  Suggested Project Phases
                </h4>

                {aiRecommendations.suggestedFields.map((field, index) => (
                  <div key={index} style={styles.suggestedField}>
                    <div style={styles.suggestedFieldInfo}>
                      <div style={styles.suggestedFieldName}>{field.name}</div>
                      <div style={styles.suggestedFieldType}>
                        {field.startDate && field.endDate && (
                          <span style={{ color: '#10b981' }}>
                            {field.startDate} → {field.endDate}
                          </span>
                        )}
                      </div>
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
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                Fill in project details above, then click "Generate Master Plan" to get AI-powered timeline suggestions based on your department's historical data.
              </div>
            )}
          </div>

          {/* TEAM & ACCESS */}
          <div style={styles.accessControlSection}>
            {/* Header */}
            <div style={styles.aiHeader}>
              <Users size={20} style={{ color: '#8b5cf6' }} />
              <h3 style={styles.aiTitle}>Team & Access</h3>
            </div>

            {/* Helper text */}
            <div style={{
              padding: '12px',
              backgroundColor: isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)',
              borderRadius: '8px',
              fontSize: '12px',
              color: isDarkMode ? '#c4b5fd' : '#8b5cf6',
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              Add people involved in this project.
              They will automatically be given <strong>Viewer</strong> access.
            </div>

            {/* OWNER */}
            {userData && (
              <div style={styles.ownerBadge}>
                <div>
                  <strong style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                    {userData.firstName} {userData.lastName}
                  </strong>
                  <div style={{ fontSize: '12px', opacity: 0.8, color: isDarkMode ? '#cbd5e1' : '#64748b' }}>
                    {userData.email}
                  </div>
                </div>
                <span style={styles.permissionBadge('owner')}>Owner</span>
              </div>
            )}

            {/* PROJECT TEAM */}
            {projectTeam.map(user => (
              <div key={user.id} style={styles.selectedUserCard}>
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={() => removeUserFromProjectTeam(user.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ef4444'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {/* ADD TEAM MEMBER */}
            <div style={{ marginTop: '12px' }}>
              <Dropdown
                label="Add Team Member"
                value={selectedUserForTeam ? availableUsersForTeam.find(u => u.id === parseInt(selectedUserForTeam))?.firstName + ' ' + availableUsersForTeam.find(u => u.id === parseInt(selectedUserForTeam))?.lastName : ''}
                onChange={(value) => {
                  if (value) {
                    const user = availableUsersForTeam.find(u => `${u.firstName} ${u.lastName}` === value);
                    if (user) {
                      addUserToProjectTeam(user.id);
                    }
                  }
                }}
                options={availableUsersForTeam.map(u => `${u.firstName} ${u.lastName}`)}
                isDarkMode={isDarkMode}
                placeholder="Select a user..."
                searchable={true}
                compact={true}
              />
            </div>

            {/* DIVIDER */}
            <hr style={{
              border: 'none',
              borderTop: isDarkMode
                ? '1px solid rgba(75,85,99,0.3)'
                : '1px solid rgba(226,232,240,0.5)',
              margin: '20px 0'
            }} />

            {/* ACCESS CONTROL */}
            {selectedUsers.map(user => (
              <div key={user.id} style={styles.selectedUserCard}>
                <div>
                  <div style={{ fontWeight: '600' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{user.email}</div>
                </div>

                <div style={{ width: '120px' }}>
                  <Dropdown
                    value={user.permission}
                    onChange={(value) => updateUserPermission(user.id, value)}
                    options={['viewer', 'editor']}
                    isDarkMode={isDarkMode}
                    compact={true}
                  />
                </div>
              </div>
            ))}

            <div style={styles.infoBox}>
              <strong>Permissions:</strong><br />
              • Owner: Full control<br />
              • Editor: View & edit<br />
              • Viewer: View only
            </div>
          </div>

        </div>
      </div>

      {/* 🆕 MILESTONE USERS MODAL */}
      {showMilestoneUsersModal && selectedMilestoneForUsers && (
        <div style={styles.statusModal}>
          <div style={styles.statusModalContent}>
            <h3 style={styles.statusModalTitle}>Manage Milestone Users</h3>
            <p style={styles.statusModalSubtitle}>
              <strong>Milestone:</strong> {customFields.find(f => f.id === selectedMilestoneForUsers)?.name}
            </p>

            {/* Assigned Users */}
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.fieldLabel}>
                Assigned Users ({(milestoneAssignments[selectedMilestoneForUsers] || []).length})
              </label>

              {(milestoneAssignments[selectedMilestoneForUsers] || []).length === 0 ? (
                <div style={{
                  padding: '16px',
                  backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}>
                  No users assigned
                </div>
              ) : (
                (milestoneAssignments[selectedMilestoneForUsers] || []).map(userId => {
                  const user = [...projectTeam, userData].find(u => u.id === userId);
                  if (!user) return null;

                  return (
                    <div
                      key={userId}
                      style={{
                        ...styles.selectedUserCard,
                        marginTop: '8px'
                      }}
                    >
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: isDarkMode ? '#e2e8f0' : '#1e293b',
                          fontSize: '13px'
                        }}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: isDarkMode ? '#94a3b8' : '#64748b'
                        }}>
                          {user.email}
                        </div>
                      </div>
                      <button
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                        onClick={() => removeUserFromMilestone(selectedMilestoneForUsers, userId)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add User */}
            <div>
              <Dropdown
                label="Add User to Milestone"
                value=""
                onChange={(value) => {
                  if (value === '➕ Add External/Outsource Person') {
                    // Show inline custom input fields
                    setShowCustomUserInputs(true);
                  } else if (value) {
                    const user = [userData, ...projectTeam].find(u =>
                      `${u.firstName} ${u.lastName}` === value
                    );
                    if (user) {
                      addUserToMilestone(selectedMilestoneForUsers, user.id);
                    }
                  }
                }}
                groupedOptions={{
                  "Actions": ["➕ Add External/Outsource Person"],
                  "Project Team": [...(userData ? [userData] : []), ...projectTeam]
                    .filter(u => u && u.firstName && u.lastName)
                    .filter(u => {
                      const alreadyAssigned = (milestoneAssignments[selectedMilestoneForUsers] || []).includes(u.id);
                      return !alreadyAssigned;
                    })
                    .map(u => `${u.firstName} ${u.lastName}`)
                }}
                isDarkMode={isDarkMode}
                placeholder="Select a user..."
                searchable={true}
                compact={true}
              />
            </div>

            {showCustomUserInputs && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(139,92,246,0.2)'
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: isDarkMode ? '#c4b5fd' : '#8b5cf6',
                  marginBottom: '12px'
                }}>
                  Add External Person
                </div>

                {/* Name Dropdown with allowCustom */}
                <div style={{ marginBottom: '12px' }}>
                  <Dropdown
                    label="Full Name"
                    value={customUserName}
                    onChange={(value) => setCustomUserName(value)}
                    options={[]} // Empty options = direct input
                    isDarkMode={isDarkMode}
                    allowCustom={true}
                    customPlaceholder="Enter full name..."
                    placeholder="Click to enter name"
                    compact={true}
                    clearable={true}
                  />
                </div>

                {/* Email Dropdown with allowCustom */}
                <div style={{ marginBottom: '12px' }}>
                  <Dropdown
                    label="Email Address"
                    value={customUserEmail}
                    onChange={(value) => setCustomUserEmail(value)}
                    options={[]} // Empty options = direct input
                    isDarkMode={isDarkMode}
                    allowCustom={true}
                    customPlaceholder="Enter email..."
                    placeholder="Click to enter email"
                    compact={true}
                    clearable={true}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: hoveredItem === 'add-external' ? '#8b5cf6' : '#a855f7',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={() => setHoveredItem('add-external')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      if (!customUserName.trim() || !customUserEmail.trim()) {
                        alert('Please enter both name and email');
                        return;
                      }

                      const customUser = {
                        id: `custom-${Date.now()}`,
                        firstName: customUserName.split(' ')[0] || customUserName,
                        lastName: customUserName.split(' ').slice(1).join(' ') || '',
                        email: customUserEmail,
                        department: 'External',
                        isCustom: true
                      };

                      setProjectTeam(prev => [...prev, customUser]);
                      addUserToMilestone(selectedMilestoneForUsers, customUser.id);

                      // Reset
                      setCustomUserName('');
                      setCustomUserEmail('');
                      setShowCustomUserInputs(false);
                    }}
                  >
                    Add Person
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: hoveredItem === 'cancel-external' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={() => setHoveredItem('cancel-external')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      setShowCustomUserInputs(false);
                      setCustomUserName('');
                      setCustomUserEmail('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                style={styles.modalButton(hoveredItem === 'close-milestone-users', 'cancel')}
                onMouseEnter={() => setHoveredItem('close-milestone-users')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  setShowMilestoneUsersModal(false);
                  setSelectedMilestoneForUsers(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAddPlan;