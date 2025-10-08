import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  User,
  Bell,
  Trash2,
  Target,
  Save
} from 'lucide-react';

const AdminEditIndividualPlan = () => {
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

  // Refs for better cleanup and tracking
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);

  const [formData, setFormData] = useState({
    assignedProject: 'JRET Master Plan',
    role: 'Frontend Developer',
    startDate: '16/06/2025',
    endDate: '17/10/2025'
  });

  const [customFields, setCustomFields] = useState([
    {
      id: 1,
      name: 'Sprint 1 Goals',
      type: 'Date Range',
      value: '16/06/2025 - 30/06/2025',
      startDate: '16/06/2025',
      endDate: '30/06/2025'
    },
    {
      id: 2,
      name: 'Sprint 2 Goals',
      type: 'Date Range',
      value: '01/07/2025 - 15/07/2025',
      startDate: '01/07/2025',
      endDate: '15/07/2025'
    },
    {
      id: 3,
      name: 'Feature Development',
      type: 'Date Range',
      value: '16/07/2025 - 31/08/2025',
      startDate: '16/07/2025',
      endDate: '31/08/2025'
    }
  ]);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('Text');

  const assignedProjects = [
    {
      name: 'JRET Master Plan',
      role: 'Frontend Developer',
      masterStartDate: '01/06/2025',
      masterEndDate: '30/11/2025',
      phases: ['Planning', 'Design', 'Development', 'Testing', 'UAT', 'Deployment'],
      teamMembers: ['Hasan Kamal', 'Sarah Chen', 'Monica Liu', 'Alex Rodriguez'],
      description: 'Joint Requirement Enhancement Tool development project'
    }
  ];

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
    pageStyle.setAttribute('data-component', 'admin-edit-individual-plan-background');
    
    const backgroundGradient = isDarkMode 
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      /* More specific targeting to avoid conflicts */
      .admin-edit-individual-plan-page {
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
    console.log('Going back to individual plan overview');
    window.location.href = '/adminindividualplan';
  };

  const addCustomField = () => {
    if (newFieldName.trim()) {
      const newField = {
        id: Date.now(),
        name: newFieldName.trim(),
        type: newFieldType,
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

  const getCurrentProject = () => {
    return assignedProjects[0];
  };

  const handleSave = () => {
    console.log('Saving updated individual plan:', { formData, customFields });
    alert('Individual plan updated successfully!');
  };

  const currentProject = getCurrentProject();

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
    contextCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(59,130,246,0.05)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(59,130,246,0.1)',
      transition: 'all 0.3s ease'
    },
    contextTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease'
    },
    contextText: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      lineHeight: '1.5',
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
      transition: 'all 0.3s ease',
      '&:focus': {
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 3px rgba(59,130,246,0.1)'
      }
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
    })
  };

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
            className="floating"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>Edit Individual Plan</h1>
        </div>

        <div style={styles.headerRight}>
          <button
            style={styles.button(hoveredCard === 'alerts')}
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
              style={styles.button(hoveredCard === 'profile')}
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
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
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
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>32</div>
                    <div style={styles.statLabel}>Hours</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>3</div>
                    <div style={styles.statLabel}>Projects</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>80%</div>
                    <div style={styles.statLabel}>Capacity</div>
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
          Modify your personal timeline and project assignments. Primary fields can be edited but not deleted.
        </p>

        {/* Master Plan Context */}
        <div style={styles.contextCard}>
          <div style={styles.contextTitle}>
            <Target size={16} />
            Current Master Plan Assignment
          </div>
          <div style={styles.contextText}>
            <strong>{currentProject.name}</strong><br />
            Role: {currentProject.role} | Team: {currentProject.teamMembers.length} members<br />
            Master Timeline: {currentProject.masterStartDate} - {currentProject.masterEndDate}<br />
            Key Phases: {currentProject.phases.join(' → ')}<br />
            {currentProject.description}
          </div>
        </div>

        <h3 style={styles.sectionTitle}>Primary Assignment Details</h3>

        {/* Primary Fields */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Assigned Project
            <span style={styles.requiredBadge}>Required</span>
          </label>
          <select
            style={styles.input}
            value={formData.assignedProject}
            onChange={(e) => setFormData({ ...formData, assignedProject: e.target.value })}
          >
            {assignedProjects.map(project => (
              <option key={project.name} value={project.name}>{project.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Your Role
            <span style={styles.requiredBadge}>Required</span>
          </label>
          <input
            type="text"
            style={styles.input}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g., Frontend Developer, Backend Developer"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Your Start Date
            <span style={styles.requiredBadge}>Required</span>
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
          <label style={styles.label}>
            Your End Date
            <span style={styles.requiredBadge}>Required</span>
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
        <h3 style={styles.sectionTitle}>Custom Timeline Fields</h3>

        {/* Existing Custom Fields */}
        {customFields.map((field) => (
          <div key={field.id} style={styles.customFieldCard}>
            <div style={styles.customFieldHeader}>
              <div>
                <div style={styles.customFieldName}>{field.name}</div>
                <div style={styles.customFieldType}>{field.type}</div>
              </div>
              <button
                style={styles.deleteButton(hoveredItem === `remove-${field.id}`)}
                onMouseEnter={() => setHoveredItem(`remove-${field.id}`)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => removeCustomField(field.id)}
                title="Delete this field"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {field.type === 'Date Range' && (
              <div style={styles.dateRangeContainer}>
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
                <span style={styles.dateRangeConnector}>to</span>
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

            {field.type === 'Text' && (
              <input
                type="text"
                style={styles.input}
                value={field.value}
                onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                placeholder={`Enter ${field.name.toLowerCase()}`}
              />
            )}

            {field.type === 'Number' && (
              <input
                type="number"
                style={styles.input}
                value={field.value}
                onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                placeholder={`Enter ${field.name.toLowerCase()}`}
              />
            )}
          </div>
        ))}

        {/* Add New Field Section */}
        <div style={styles.addFieldSection}>
          <h4 style={styles.addFieldTitle}>Add New Custom Field</h4>
          <div style={styles.addFieldGrid}>
            <input
              type="text"
              style={styles.input}
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Field name"
            />
            <select
              style={styles.input}
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
            >
              {fieldTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
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
  );
};

export default AdminEditIndividualPlan;