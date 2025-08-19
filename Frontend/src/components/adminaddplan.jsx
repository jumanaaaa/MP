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
  CheckCircle
} from 'lucide-react';

const AdminAddPlan = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Individual Plan');
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    project: 'JRET',
    startDate: '16/06/2025',
    endDate: '17/10/2025'
  });

  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('UAT');
  const [newFieldType, setNewFieldType] = useState('Text');

  // AI Recommendations
  const [aiRecommendations, setAiRecommendations] = useState({
    reasoning: '',
    suggestedFields: []
  });

  const fieldTypes = ['Text', 'Date', 'Date Range', 'Number', 'Dropdown', 'Checkbox', 'Textarea'];

  const sampleProjects = ['JRET', 'Capacitor Platform', 'API Integration', 'Database Migration', 'Security Enhancement'];

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

  const generateAIRecommendations = () => {
    setIsGeneratingRecommendations(true);

    // Parse project dates for intelligent suggestions
    const startDate = new Date(formData.startDate.split('/').reverse().join('-'));
    const endDate = new Date(formData.endDate.split('/').reverse().join('-'));
    const projectDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Calculate milestone dates based on project timeline
    const getDateOffset = (percentage) => {
      const offsetDays = Math.floor(projectDuration * percentage);
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + offsetDays);
      return targetDate.toLocaleDateString('en-GB');
    };

    // Simulate AI processing
    setTimeout(() => {
      const recommendations = {
        reasoning: `Based on your ${formData.project} project timeline (${formData.startDate} - ${formData.endDate}), I've generated a comprehensive Gantt chart timeline with ${projectDuration} days duration.

        The suggested timeline creates logical project phases with clear start and end dates:
        • Planning & Requirements (15% of timeline) - Foundation phase
        • Design & Architecture (10% of timeline) - Blueprint creation  
        • Development (40% of timeline) - Core implementation
        • Testing & QA (20% of timeline) - Quality assurance
        • UAT & Deployment (15% of timeline) - Final validation and launch

        Each phase has defined start and end dates to create a visual Gantt chart. All dates can be customized to match your specific project needs.`,
        suggestedFields: [
          {
            name: 'Planning Phase',
            type: 'Date Range',
            startDate: formData.startDate,
            endDate: getDateOffset(0.15),
            placeholder: 'DD/MM/YYYY - DD/MM/YYYY'
          },
          {
            name: 'Design Phase',
            type: 'Date Range',
            startDate: getDateOffset(0.15),
            endDate: getDateOffset(0.25),
            placeholder: 'DD/MM/YYYY - DD/MM/YYYY'
          },
          {
            name: 'Development Phase',
            type: 'Date Range',
            startDate: getDateOffset(0.25),
            endDate: getDateOffset(0.65),
            placeholder: 'DD/MM/YYYY - DD/MM/YYYY'
          },
          {
            name: 'Testing Phase',
            type: 'Date Range',
            startDate: getDateOffset(0.65),
            endDate: getDateOffset(0.85),
            placeholder: 'DD/MM/YYYY - DD/MM/YYYY'
          },
          {
            name: 'UAT Phase',
            type: 'Date Range',
            startDate: getDateOffset(0.75),
            endDate: getDateOffset(0.90),
            placeholder: 'DD/MM/YYYY - DD/MM/YYYY'
          },
          {
            name: 'Deployment Phase',
            type: 'Date Range',
            startDate: getDateOffset(0.90),
            endDate: formData.endDate,
            placeholder: 'DD/MM/YYYY - DD/MM/YYYY'
          }
        ]
      };

      setAiRecommendations(recommendations);
      setIsGeneratingRecommendations(false);
      setShowAIRecommendations(true);
    }, 2000);
  };

  const addRecommendedField = (field) => {
    const newField = {
      id: Date.now(),
      name: field.name,
      type: field.type,
      value: field.type === 'Date Range' ? `${field.startDate} - ${field.endDate}` : (field.defaultValue || ''),
      required: false,
      options: field.options || [],
      placeholder: field.placeholder || '',
      label: field.label || '',
      startDate: field.startDate || '',
      endDate: field.endDate || ''
    };
    setCustomFields([...customFields, newField]);
  };

  const handleSubmit = () => {
    console.log('📝 Submitting master plan:', { formData, customFields });
    // Handle form submission logic here
    alert('Master plan created successfully!');
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
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Add CSS to cover parent containers
  useEffect(() => {
    // Inject CSS to cover parent containers
    const pageStyle = document.createElement('style');
    pageStyle.textContent = `
    /* Target common parent container classes */
    body, html, #root, .app, .main-content, .page-container, .content-wrapper {
      background: ${isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%) !important'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important'};
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Target any div that might be the white container */
    body > div, #root > div, .app > div {
      background: transparent !important;
    }
    
    /* Your existing animations here */
    @keyframes modalSlideIn { /* ... */ }
    @keyframes slideIn { /* ... */ }
    @keyframes float { /* ... */ }
    .floating { /* ... */ }
  `;
    document.head.appendChild(pageStyle);

    return () => {
      // Cleanup when component unmounts
      document.head.removeChild(pageStyle);
    };
  }, [isDarkMode]); // Re-run when theme changes

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
        <div style={styles.tab(true, false)}>
          Individual Plan
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Form Section */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Individual Plan</h2>

          <h3 style={styles.configTitle}>Configure Planning Fields</h3>

          {/* Basic Fields */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Project</label>
            <select
              style={styles.select}
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
            >
              {sampleProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Start Date</label>
            <input
              type="text"
              style={styles.input}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>End Date</label>
            <input
              type="text"
              style={styles.input}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Custom Fields */}
          {customFields.map((field) => (
            <div key={field.id} style={styles.customField}>
              <div style={styles.customFieldHeader}>
                <div>
                  <div style={styles.customFieldName}>{field.name}</div>
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

              {field.type === 'Text' && (
                <input
                  type="text"
                  style={styles.input}
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                />
              )}

              {field.type === 'Date' && (
                <input
                  type="text"
                  style={styles.input}
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
              )}

              {field.type === 'Date Range' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    style={styles.input}
                    value={field.startDate || field.value.split(' - ')[0] || ''}
                    onChange={(e) => {
                      const endDate = field.endDate || field.value.split(' - ')[1] || '';
                      updateCustomField(field.id, 'value', `${e.target.value} - ${endDate}`);
                      updateCustomField(field.id, 'startDate', e.target.value);
                    }}
                    placeholder="Start Date"
                  />
                  <span style={{
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    to
                  </span>
                  <input
                    type="text"
                    style={styles.input}
                    value={field.endDate || field.value.split(' - ')[1] || ''}
                    onChange={(e) => {
                      const startDate = field.startDate || field.value.split(' - ')[0] || '';
                      updateCustomField(field.id, 'value', `${startDate} - ${e.target.value}`);
                      updateCustomField(field.id, 'endDate', e.target.value);
                    }}
                    placeholder="End Date"
                  />
                </div>
              )}

              {field.type === 'Number' && (
                <input
                  type="number"
                  style={styles.input}
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                />
              )}

              {field.type === 'Dropdown' && (
                <select
                  style={styles.select}
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                >
                  <option value="">Select an option</option>
                  {field.options?.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}

              {field.type === 'Checkbox' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={field.value === 'true'}
                    onChange={(e) => updateCustomField(field.id, 'value', e.target.checked.toString())}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                    {field.label || field.name}
                  </span>
                </label>
              )}

              {field.type === 'Textarea' && (
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  value={field.value}
                  onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                />
              )}
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

          {/* Submit Button */}
          <button
            style={styles.submitButton(hoveredItem === 'submit')}
            onMouseEnter={() => setHoveredItem('submit')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleSubmit}
          >
            <CheckCircle size={20} />
            Submit
          </button>
        </div>

        {/* AI Recommendations Section */}
        <div style={styles.aiSection}>
          <div style={styles.aiHeader}>
            <Sparkles size={20} style={{ color: '#a855f7' }} />
            <h3 style={styles.aiTitle}>Recommended by AI</h3>
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
                Recommend
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
                AI Analysis & Reasoning
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
                Suggested Timeline Phases
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
              fontSize: '14px'
            }}>
              Click "Recommend" to get AI-powered field suggestions based on your project details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAddPlan;