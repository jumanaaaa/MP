import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ArrowLeft,
  Plus,
  X,
  Calendar,
  Clock,
  User,
  Bell,
  FileText,
  Trash2,
  Edit,
  CheckCircle,
  Save
} from 'lucide-react';

const AdminEditPlan = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  const [activeTab, setActiveTab] = useState('Individual Plan');

  // Refs for better cleanup and tracking
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const isoRegex = /^\d{4}-\d{2}-\d{2}/;
    if (isoRegex.test(dateStr)) {
      const [y, m, d] = dateStr.split('T')[0].split('-');
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return null;
  };

  // Form state with existing data
  const [formData, setFormData] = useState({
    project: '',
    startDate: '',
    endDate: ''
  });

  // Pre-existing custom fields (simulating loaded data)
  const [customFields, setCustomFields] = useState([]);


  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('Text');

  const [planId, setPlanId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const fieldTypes = ['Text', 'Date', 'Date Range', 'Number', 'Dropdown', 'Checkbox', 'Textarea'];

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
    pageStyle.setAttribute('data-component', 'admin-edit-plan-background');

    const backgroundGradient = isDarkMode
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      /* More specific targeting to avoid conflicts */
      .admin-edit-plan-page {
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
        const existingStyles = document.querySelectorAll('[data-component="admin-edit-plan-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

  useEffect(() => {
    const editingPlanId = sessionStorage.getItem('editingPlanId');
    const editingPlanData = sessionStorage.getItem('editingPlanData');

    if (editingPlanId && editingPlanData) {
      try {
        const plan = JSON.parse(editingPlanData);
        console.log('📝 Loading plan for editing:', plan);
        console.log('📦 Plan fields:', plan.fields);

        setPlanId(editingPlanId);

        // Format dates from ISO to DD/MM/YYYY
        const formatDate = (dateStr) => {
          const d = parseLocalDate(dateStr);
          if (!d) return '';
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };

        // Set form data
        setFormData({
          project: plan.project,
          startDate: formatDate(plan.startDate),
          endDate: formatDate(plan.endDate)
        });

        // Convert fields object to customFields array
        if (plan.fields && typeof plan.fields === 'object') {
          const fieldsArray = Object.entries(plan.fields).map(([key, value], index) => {
            console.log(`📊 Processing milestone: "${key}" = "${value}"`);

            let startDate = '';
            let endDate = '';
            let status = 'Pending'; // Default status

            // Check if value contains a date range (format: "DD/MM/YYYY - DD/MM/YYYY")
            if (value && typeof value === 'object') {
              // Convert ISO to DD/MM/YYYY for display
              const formatDisplayDate = (iso) => {
                if (!iso) return '';
                const date = new Date(iso);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              };

              startDate = formatDisplayDate(value.startDate);
              endDate = formatDisplayDate(value.endDate);
              status = value.status || 'Pending';
              console.log(`   ✅ Parsed object (formatted): ${startDate} to ${endDate}, status: ${status}`);
            }

            return {
              id: Date.now() + index,
              name: key,
              type: 'Date Range',
              value: status,
              required: false,
              startDate: startDate,
              endDate: endDate
            };
          });

          console.log('✅ Loaded custom fields (milestones):', fieldsArray);
          setCustomFields(fieldsArray);
        }
      } catch (error) {
        console.error('Error loading plan data:', error);
        alert('Failed to load plan data');
        window.location.href = '/adminviewplan';
      }
    } else {
      console.warn('⚠️ No plan data found in sessionStorage');
      alert('No plan selected for editing');
      window.location.href = '/adminviewplan';
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUser(true);
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
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, []);

  // // Load plan data from sessionStorage
  // useEffect(() => {
  //   const editingPlanId = sessionStorage.getItem('editingPlanId');
  //   const editingPlanData = sessionStorage.getItem('editingPlanData');

  //   if (editingPlanId && editingPlanData) {
  //     try {
  //       const plan = JSON.parse(editingPlanData);
  //       console.log('📝 Loading plan for editing:', plan);

  //       setPlanId(editingPlanId);

  //       // Format dates from ISO to DD/MM/YYYY
  //       const formatDate = (isoDate) => {
  //         const date = new Date(isoDate);
  //         const day = String(date.getDate()).padStart(2, '0');
  //         const month = String(date.getMonth() + 1).padStart(2, '0');
  //         const year = date.getFullYear();
  //         return `${day}/${month}/${year}`;
  //       };

  //       // Set form data
  //       setFormData({
  //         project: plan.project,
  //         startDate: formatDate(plan.startDate),
  //         endDate: formatDate(plan.endDate)
  //       });

  //       // Convert fields object to customFields array
  //       if (plan.fields && typeof plan.fields === 'object') {
  //         const fieldsArray = Object.entries(plan.fields)
  //           .filter(([key]) => {
  //             // Filter out non-milestone fields
  //             const keyLower = key.toLowerCase();
  //             return keyLower !== 'status' &&
  //               keyLower !== 'lead' &&
  //               keyLower !== 'budget' &&
  //               keyLower !== 'completion';
  //           })
  //           .map(([key, value], index) => {
  //             console.log(`📊 Processing field: ${key} = ${value}`);

  //             // Check if value contains a date range (format: "DD/MM/YYYY - DD/MM/YYYY")
  //             let startDate = '';
  //             let endDate = '';
  //             let status = value;

  //             if (typeof value === 'string' && value.includes(' - ')) {
  //               // It's a date range, extract the dates
  //               const parts = value.split(' - ');
  //               if (parts.length === 2) {
  //                 startDate = parts[0].trim();
  //                 endDate = parts[1].trim();
  //                 // Default status since date range doesn't include status
  //                 status = index === 0 ? 'In Progress' : 'Pending';
  //               }
  //             } else {
  //               // It's a status value
  //               status = value;
  //             }

  //             return {
  //               id: Date.now() + index,
  //               name: key,
  //               type: 'Date Range',
  //               value: status,
  //               required: false,
  //               startDate: startDate,
  //               endDate: endDate
  //             };
  //           });

  //         console.log('✅ Loaded custom fields:', fieldsArray);
  //         setCustomFields(fieldsArray);
  //       }
  //     } catch (error) {
  //       console.error('Error loading plan data:', error);
  //       alert('Failed to load plan data');
  //       window.location.href = '/adminviewplan';
  //     }
  //   } else {
  //     console.warn('⚠️ No plan data found in sessionStorage');
  //     alert('No plan selected for editing');
  //     window.location.href = '/adminviewplan';
  //   }
  // }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const handleGoBack = () => {
    console.log('🔙 Going back to plan overview');
    window.location.href = '/adminviewplan';
  };

  const addCustomField = () => {
    if (newFieldName.trim()) {
      const newField = {
        id: Date.now(),
        name: newFieldName.trim(),
        type: newFieldType,
        value: '',
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

  const handleSave = async () => {
    if (!planId) {
      alert('No plan ID found');
      return;
    }

    if (!formData.project || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields: Project, Start Date, and End Date');
      return;
    }

    try {
      console.log('💾 Saving updated master plan...');

      // Convert date format from DD/MM/YYYY to YYYY-MM-DD for backend
      const formatDateForBackend = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
      };

      // Helper: convert DD/MM/YYYY → YYYY-MM-DD for backend
      const convertToISO = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year}-${month}-${day}`;
        }
        return dateStr; // already ISO
      };

      // Convert customFields array back to fields object
      const fields = {};
      customFields.forEach(field => {
        console.log(`💾 Saving field: ${field.name}`);
        console.log(`   Start: ${field.startDate}, End: ${field.endDate}, Status: ${field.value}`);

        // If both dates are provided, store as date range
        // Otherwise just store the status
        if (field.startDate && field.endDate) {
          fields[field.name] = {
            startDate: convertToISO(field.startDate),
            endDate: convertToISO(field.endDate),
            status: field.value
          };
        } else {
          fields[field.name] = { status: field.value };
        }
      });

      const updateData = {
        project: formData.project,
        startDate: formatDateForBackend(formData.startDate),
        endDate: formatDateForBackend(formData.endDate),
        fields: fields
      };

      console.log('📤 Sending update data:', updateData);

      const response = await fetch(`http://localhost:3000/plan/master/${planId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        console.log('✅ Master plan updated successfully');
        alert('Master plan updated successfully!');

        // Clear sessionStorage
        sessionStorage.removeItem('editingPlanId');
        sessionStorage.removeItem('editingPlanData');

        // Redirect back to view plan
        window.location.href = '/adminviewplan';
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to update plan:', response.status, errorData);
        alert('Failed to update plan. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error updating plan:', error);
      alert('Failed to update plan. Please check your connection and try again.');
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
      gridTemplateColumns: '1fr',
      gap: '32px',
      alignItems: 'start'
    },
    formSection: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
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
    requiredField: {
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
      fontWeight: '500',
      outline: 'none',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      fontFamily: '"Montserrat", sans-serif',
      boxSizing: 'border-box'
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
      cursor: 'pointer',
      boxSizing: 'border-box'
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
      whiteSpace: 'nowrap',
      boxShadow: isHovered ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)'
    }),
    customField: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      transition: 'all 0.3s ease',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)',
      backdropFilter: 'blur(10px)'
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
      transition: 'all 0.3s ease',
      marginTop: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: isHovered ? '0 8px 20px rgba(16,185,129,0.3)' : '0 4px 12px rgba(16,185,129,0.1)',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
    })
  };

  return (
    <div className="admin-edit-plan-page" style={styles.page}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton(hoveredItem === 'back')}
            onMouseEnter={() => setHoveredItem('back')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleGoBack}
            className="floating"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.header}>Edit Plan</h1>
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
                    {userData.firstName?.[0]?.toUpperCase() || 'U'}
                    {userData.lastName?.[0]?.toUpperCase() || ''}
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
        <div style={styles.tab(true, false)}>
          Individual Plan
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Form Section */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Edit Individual Plan</h2>
          <p style={styles.sectionSubtitle}>
            Modify the existing plan configuration. Primary fields (Project, Start Date, End Date) can be edited but not deleted.
          </p>

          <h3 style={styles.configTitle}>Primary Fields</h3>

          {/* Primary Fields - Cannot be deleted */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              Project
              <span style={styles.requiredField}>Required</span>
            </label>
            <input
              type="text"
              style={styles.input}
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              placeholder="Enter project name"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              Start Date
              <span style={styles.requiredField}>Required</span>
            </label>
            <input
              type="text"
              style={styles.input}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              End Date
              <span style={styles.requiredField}>Required</span>
            </label>
            <input
              type="text"
              style={styles.input}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Custom Fields Section */}
          <h3 style={styles.configTitle}>Custom Fields</h3>

          {/* Custom Fields */}
          {customFields.map((field, index) => (
            <div key={field.id} style={styles.customField}>
              <div style={styles.customFieldHeader}>
                <div style={{ flex: 1 }}>
                  <div style={styles.customFieldName}>
                    {field.name}
                    {/* Show status as a badge */}
                    <span style={{
                      marginLeft: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: field.value?.toLowerCase().includes('progress') ? '#3b82f620' :
                        field.value?.toLowerCase().includes('complete') ? '#10b98120' :
                          field.value?.toLowerCase().includes('pending') || field.value?.toLowerCase().includes('planning') ? '#f59e0b20' :
                            field.value?.toLowerCase().includes('delay') || field.value?.toLowerCase().includes('hold') ? '#ef444420' : '#94a3b820',
                      color: field.value?.toLowerCase().includes('progress') ? '#3b82f6' :
                        field.value?.toLowerCase().includes('complete') ? '#10b981' :
                          field.value?.toLowerCase().includes('pending') || field.value?.toLowerCase().includes('planning') ? '#f59e0b' :
                            field.value?.toLowerCase().includes('delay') || field.value?.toLowerCase().includes('hold') ? '#ef4444' : '#94a3b8'
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
                  title="Delete this field"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Status Dropdown */}
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Status</label>
                <div
                  style={{
                    ...styles.input,
                    backgroundColor: isDarkMode
                      ? 'rgba(51,65,85,0.3)'
                      : 'rgba(248,250,252,0.8)',
                    cursor: 'not-allowed',
                    opacity: 0.8,
                  }}
                >
                  {field.value || 'Pending'}
                </div>
              </div>


              {/* Date Range Inputs - Pre-filled if available */}
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Timeline</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ ...styles.fieldLabel, fontSize: '12px' }}>Start Date</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={field.startDate || ''}
                      onChange={(e) => updateCustomField(field.id, 'startDate', e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div>
                    <label style={{ ...styles.fieldLabel, fontSize: '12px' }}>End Date</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={field.endDate || ''}
                      onChange={(e) => updateCustomField(field.id, 'endDate', e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Field Section */}
          <div style={styles.addFieldSection}>
            <h4 style={{ ...styles.fieldLabel, marginBottom: '16px', fontSize: '16px' }}>Add New Field</h4>
            <div style={styles.addFieldRow}>
              <div>
                <input
                  type="text"
                  style={styles.input}
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Field name"
                />
              </div>
              <div>
                <select
                  style={styles.select}
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                >
                  {fieldTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <button
                style={styles.addButton(hoveredItem === 'add-field')}
                onMouseEnter={() => setHoveredItem('add-field')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={addCustomField}
              >
                <Plus size={16} />
                Add Field
              </button>
            </div>
          </div>

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
      </div>
    </div>
  );
};

export default AdminEditPlan;