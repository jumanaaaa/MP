import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, Calendar, Sparkles } from 'lucide-react';

const AdminActuals = () => {
  const [section, setSection] = useState('actuals');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Project');

  const [selectedProject, setSelectedProject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState('');

  const [manDays, setManDays] = useState('0.00');
  const [userProfile, setUserProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [operations] = useState(['L1', 'L2']);
  const [leaves] = useState([
    'Annual Leave',
    'Hospitalization Leave',
    'No Pay Leave',
    'Birthday Leave',
    'Medical Leave',
    'Off-in-Lieu'
  ]);
  const [actuals, setActuals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  }); // Default to dark mode to match sidebar

  const sectionToggleRef = useRef(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  // Debug state changes
  useEffect(() => {
    console.log('🔄 AdminActuals - isSectionOpen state changed to:', isSectionOpen);
  }, [isSectionOpen]);

  useEffect(() => {
    if (sectionToggleRef.current && isSectionOpen) {
      const rect = sectionToggleRef.current.getBoundingClientRect();
      setSectionDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isSectionOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sectionToggleRef.current && !sectionToggleRef.current.contains(event.target)) {
        setIsSectionOpen(false);
      }
    };

    if (isSectionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSectionOpen]);

  // Add CSS to cover parent containers and animations
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
      
      @keyframes sparkle {
        0%, 100% {
          transform: rotate(0deg) scale(1);
        }
        50% {
          transform: rotate(5deg) scale(1.1);
        }
      }
      
      .floating {
        animation: float 3s ease-in-out infinite;
      }
    `;
    document.head.appendChild(pageStyle);

    return () => {
      // Cleanup when component unmounts
      document.head.removeChild(pageStyle);
    };
  }, [isDarkMode]); // Re-run when theme changes

  // Add these useEffects at the top after state declarations
  useEffect(() => {
    fetchUserProfile();
    fetchProjects();
    fetchActuals();
  }, []);

  // Add man-days calculation
  useEffect(() => {
    if (hours) {
      const hoursPerDay = 8;
      const calculatedManDays = (parseFloat(hours) / hoursPerDay).toFixed(2);
      setManDays(calculatedManDays);
    } else {
      setManDays('0.00');
    }
  }, [hours]);

  // Auto-calculate hours based on date range
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end >= start) {
        let workingDays = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const day = d.getDay();
          if (day !== 0 && day !== 6) { // Not Sunday or Saturday
            workingDays++;
          }
        }

        const hoursPerDay = 8;
        const totalHours = workingDays * hoursPerDay;
        setHours(totalHours.toString());
      }
    }
  }, [startDate, endDate]);

  // Add these fetch functions
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:3000/user/profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      } else {
        setError('Failed to fetch user profile');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Error fetching user profile');
    }
  };

  const fetchProjects = async () => {
    try {
      console.log('🔍 Fetching projects from /plan/master...');

      const response = await fetch('http://localhost:3000/plan/master', {
        credentials: 'include'
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Raw data from API:', data);

        // Your API returns lowercase 'project', not uppercase 'Project'
        const projectNames = data.map(item => item.project).filter(Boolean);
        console.log('✅ Extracted project names:', projectNames);

        const uniqueProjects = [...new Set(projectNames)];
        console.log('✅ Unique projects:', uniqueProjects);

        setProjects(uniqueProjects);
      } else {
        console.error('❌ Failed to fetch projects, status:', response.status);
      }
    } catch (err) {
      console.error('❌ Error fetching projects:', err);
    }
  };

  const fetchActuals = async () => {
    try {
      const response = await fetch('http://localhost:3000/actuals', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setActuals(data);
      }
    } catch (err) {
      console.error('Error fetching actuals:', err);
    }
  };
  const handleSectionChange = (newSection) => {
    console.log('🔍 AdminActuals - handleSectionChange called with:', newSection);
    setSection(newSection);
    setIsSectionOpen(false);

    // Use window.location for navigation
    if (newSection === 'view-logs') {
      console.log('🚀 AdminActuals - Navigating to view logs page');
      window.location.href = '/adminviewlogs';
    } else {
      console.log('📍 AdminActuals - Staying on current page for section:', newSection);
    }
  };

  const getSectionTitle = () => {
    return section === 'actuals' ? 'Actuals' : 'View Logs';
  };

  const handleRecommend = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let workingDays = 0;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) {
          workingDays++;
        }
      }

      const recommendedHours = workingDays * 8;
      setHours(recommendedHours.toString());
      console.log('✨ AI Recommendation applied:', recommendedHours, 'hours');
    } else {
      alert('Please select start and end dates first');
    }
  };

  const handleAdd = async () => {
    console.log('🚀 handleAdd called');
    console.log('📋 Form values:', {
      selectedProject,
      startDate,
      endDate,
      hours,
      selectedCategory
    });

    if (!selectedProject || !startDate || !endDate || !hours) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    const requestBody = {
      category: selectedCategory,
      project: selectedProject,
      startDate,
      endDate,
      hours: parseFloat(hours)
    };

    console.log('📤 Sending request body:', requestBody);

    try {
      console.log('🌐 Fetching http://localhost:3000/actuals...');

      const response = await fetch('http://localhost:3000/actuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Success response:', responseData);

        alert('Actual entry added successfully!');
        // Reset form
        setSelectedProject('');
        setStartDate('');
        setEndDate('');
        setHours('');
        setManDays('0.00');
        // Refresh actuals list
        fetchActuals();
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        setError(errorData.message || 'Failed to add actual entry');
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Error adding actual entry');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const getProjectOptions = () => {
    switch (selectedCategory) {
      case 'Project':
        return projects;
      case 'Operations':
        return operations;
      case 'Admin':
        return leaves;
      default:
        return [];
    }
  };

  const getProjectLabel = () => {
    switch (selectedCategory) {
      case 'Project':
        return 'Project:';
      case 'Operations':
        return 'Operation:';
      case 'Admin':
        return 'Leave Type:';
      default:
        return 'Select:';
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '30px 60px', // Increase horizontal padding from 40px
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      overflowY: 'auto',
      fontFamily: '"Montserrat", sans-serif',
      position: 'relative',
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column'
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '40px',
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
      fontSize: '32px',
      fontWeight: '800',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    },
    toggleViewContainer: {
      fontSize: '20px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      userSelect: 'none',
      padding: '8px 0',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    chevron: (isOpen, isHovered) => ({
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isOpen || isHovered ? 'rotate(-90deg) scale(1.1)' : 'rotate(0deg) scale(1)',
      color: isOpen || isHovered ? '#3b82f6' : '#64748b'
    }),
    sectionOverlay: {
      position: 'fixed',
      top: sectionDropdownPosition.top,
      left: sectionDropdownPosition.left,
      zIndex: 999,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      padding: '12px 0',
      minWidth: '220px',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
      animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transition: 'all 0.3s ease'
    },
    blurOption: (isHovered) => ({
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      padding: '14px 20px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '8px',
      margin: '0 8px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
      borderLeft: isHovered ? '3px solid #3b82f6' : '3px solid transparent',
      pointerEvents: 'auto',
      userSelect: 'none'
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
    contentArea: {
      display: 'flex',
      gap: '60px', // Increase gap from 40px
      alignItems: 'flex-start',
      width: '100%',
      maxWidth: '2000px', // Increase from 1400px
      margin: '0 auto'
    },
    leftSection: {
      flex: 1,
      maxWidth: '1100px', // Increase from 800px
      width: '100%'
    },
    rightSection: {
      flex: '0 0 450px', // Increase from 400px
      minWidth: '450px'
    },
    categoryTabs: {
      display: 'flex',
      gap: '20px',
      marginBottom: '40px',
      justifyContent: 'flex-start', // Add this
      flexWrap: 'wrap' // Add this for responsiveness
    },
    categoryTab: (isActive, isHovered) => ({
      padding: '16px 40px',
      borderRadius: '50px',
      border: isActive ? '2px solid #3b82f6' : isDarkMode ? '2px solid #374151' : '2px solid #e2e8f0',
      backgroundColor: isActive
        ? 'rgba(59,130,246,0.1)'
        : (isHovered
          ? 'rgba(59,130,246,0.05)'
          : isDarkMode
            ? '#374151'
            : '#fff'),
      color: isActive ? '#3b82f6' : isDarkMode ? '#e2e8f0' : '#64748b',
      fontWeight: '600',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
      boxShadow: isHovered ? '0 8px 25px rgba(59,130,246,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
      userSelect: 'none',
      minWidth: '140px',
      textAlign: 'center'
    }),
    formContainer: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '24px',
      padding: '40px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)',
      backdropFilter: 'blur(10px)',
      width: '100%',
      transition: 'all 0.3s ease'
    },
    formRow: {
      display: 'flex',
      gap: '24px',
      marginBottom: '24px',
      alignItems: 'flex-end',
      width: '100%' // Ensure full width
    },
    formGroup: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      marginBottom: '4px',
      transition: 'all 0.3s ease'
    },
    input: (isFocused) => ({
      padding: '16px 20px',
      borderRadius: '12px',
      border: isFocused ? '2px solid #3b82f6' : isDarkMode ? '2px solid #4b5563' : '2px solid #e2e8f0',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      backgroundColor: isDarkMode ? '#4b5563' : '#fff',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      outline: 'none',
      boxShadow: isFocused ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 2px 4px rgba(0,0,0,0.02)'
    }),
    select: (isFocused) => ({
      padding: '16px 20px',
      borderRadius: '12px',
      border: isFocused ? '2px solid #3b82f6' : isDarkMode ? '2px solid #4b5563' : '2px solid #e2e8f0',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      backgroundColor: isDarkMode ? '#4b5563' : '#fff',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      outline: 'none',
      cursor: 'pointer',
      boxShadow: isFocused ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 2px 4px rgba(0,0,0,0.02)'
    }),
    autoCalculated: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontStyle: 'italic',
      marginTop: '4px',
      transition: 'all 0.3s ease'
    },
    buttonRow: {
      display: 'flex',
      gap: '20px',
      marginTop: '40px',
      width: '100%' // Ensure full width
    },
    recommendButton: (isHovered) => ({
      flex: 1,
      padding: '20px 32px',
      borderRadius: '16px',
      border: '2px solid #f59e0b',
      backgroundColor: isHovered ? '#f59e0b' : 'transparent',
      color: isHovered ? '#fff' : '#f59e0b',
      fontSize: '18px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
      boxShadow: isHovered ? '0 8px 25px rgba(245,158,11,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
      minHeight: '60px',
      opacity: loading ? 0.5 : 1,
      pointerEvents: loading ? 'none' : 'auto'
    }),
    addButton: (isHovered) => ({
      flex: 1,
      padding: '20px 32px',
      borderRadius: '16px',
      border: '2px solid #10b981',
      backgroundColor: isHovered ? '#10b981' : 'transparent',
      color: isHovered ? '#fff' : '#10b981',
      fontSize: '18px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
      boxShadow: isHovered ? '0 8px 25px rgba(16,185,129,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
      minHeight: '60px'
    }),
    aiCard: {
      backgroundColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      borderRadius: '20px',
      padding: '32px', // Increase from 24px
      border: '2px solid #f59e0b',
      position: 'relative',
      overflow: 'hidden',
      height: 'fit-content',
      minHeight: '350px' // Add minimum height
    },
    aiCardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px'
    },
    aiIcon: {
      color: '#f59e0b',
      animation: 'sparkle 2s ease-in-out infinite'
    },
    aiTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#92400e'
    },
    aiDescription: {
      fontSize: '14px',
      color: '#92400e',
      lineHeight: '1.5',
      marginBottom: '16px'
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
    aiFeatures: {
      fontSize: '12px',
      color: '#92400e',
      lineHeight: '1.4'
    },
    errorMessage: {
      backgroundColor: '#fee',
      color: '#c00',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    manDaysDisplay: {
      fontSize: '14px',
      color: '#3b82f6',
      fontWeight: '600',
      marginTop: '4px'
    },
  };

  return (
    <div style={styles.page}>
      {/* Header with Dropdown */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <div
            ref={sectionToggleRef}
            style={styles.toggleViewContainer}
            onClick={() => {
              console.log('🖱️ AdminActuals - Header dropdown clicked, current state:', isSectionOpen);
              setIsSectionOpen((prev) => !prev);
            }}
            onMouseEnter={() => setIsSectionHovered(true)}
            onMouseLeave={() => setIsSectionHovered(false)}
            className="floating"
          >
            <span style={styles.header}>{getSectionTitle()}</span>
            <ChevronDown style={styles.chevron(isSectionOpen, isSectionHovered)} size={22} />
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Alerts Button */}
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

          {/* Profile Button */}
          <div style={{ position: 'relative' }}>
            <button
              style={styles.topButton(hoveredCard === 'profile')}
              onMouseEnter={() => {
                setHoveredCard('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => {
                setHoveredCard(null);
                // Don't immediately hide tooltip - let the tooltip's own mouse events handle it
              }}
              onClick={() => {
                console.log('👤 Profile clicked - Navigating to profile page');
                window.location.href = '/adminprofile';
              }}
            >
              <User size={20} />
            </button>

            {/* Profile Tooltip */}
            {showProfileTooltip && userProfile && (
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
                    {userProfile.firstName[0]}{userProfile.lastName[0]}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {userProfile.firstName} {userProfile.lastName}
                    </div>
                    <div style={styles.userRole}>
                      {userProfile.role} • {userProfile.department}
                    </div>
                  </div>
                </div>
                <div style={styles.userStats}>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {actuals.reduce((sum, a) => sum + parseFloat(a.Hours || 0), 0).toFixed(1)}
                    </div>
                    <div style={styles.tooltipStatLabel}>Hours</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {actuals.filter(a => a.Category === 'Project').length}
                    </div>
                    <div style={styles.tooltipStatLabel}>Projects</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>--</div>
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

      {/* Section Dropdown */}
      {isSectionOpen && (
        <div
          style={styles.sectionOverlay}
          onMouseDown={(e) => {
            console.log('🛡️ AdminActuals - Dropdown container mousedown');
            e.stopPropagation();
          }}
          onClick={(e) => {
            console.log('🛡️ AdminActuals - Dropdown container click');
            e.stopPropagation();
          }}
        >
          <div>
            {['actuals', 'view-logs'].map((sectionKey, idx) => (
              <div
                key={sectionKey}
                style={styles.blurOption(hoveredCard === `section-${idx}`)}
                onClick={(e) => {
                  console.log('🖱️ AdminActuals - Dropdown option clicked:', sectionKey);
                  e.preventDefault();
                  e.stopPropagation();
                  handleSectionChange(sectionKey);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseEnter={() => setHoveredCard(`section-${idx}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {sectionKey === 'actuals' ? 'Actuals' : 'View Logs'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.contentArea}>
        {/* Left Section - Form */}
        <div style={styles.leftSection}>
          {/* Category Tabs */}
          <div style={styles.categoryTabs}>
            {['Project', 'Operations', 'Admin'].map((category) => (
              <div
                key={category}
                style={styles.categoryTab(
                  selectedCategory === category,
                  hoveredCard === `category-${category}`
                )}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedProject(''); // Reset project when changing category
                }}
                onMouseEnter={() => setHoveredCard(`category-${category}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {category}
              </div>
            ))}
          </div>

          {/* Form Container */}
          <div style={styles.formContainer}>
            {error && <div style={styles.errorMessage}>{error}</div>}

            {/* Date Row */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.input(false)}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.input(false)}
                />
              </div>
            </div>

            {/* Project Row */}
            <div style={styles.formGroup}>
              <label style={styles.label}>{getProjectLabel()}</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={styles.select(false)}
              >
                <option value="">
                  {selectedCategory === 'Project' && 'Select a project...'}
                  {selectedCategory === 'Operations' && 'Select an operation...'}
                  {selectedCategory === 'Admin' && 'Select leave type...'}
                </option>
                {getProjectOptions().map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Hours Row */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Hours:</label>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  style={styles.input(false)}
                  placeholder="Enter hours worked"
                  min="0"
                  max="24"
                  step="0.5"
                />
                <div style={styles.autoCalculated}>
                  (auto-calculated based on working days*)
                </div>
                <div style={styles.manDaysDisplay}>
                  ≈ {manDays} man-days
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.buttonRow}>
              <button
                style={styles.recommendButton(hoveredCard === 'recommend')}
                onMouseEnter={() => setHoveredCard('recommend')}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={handleRecommend}
                disabled={loading}
              >
                <Sparkles size={20} />
                {loading ? 'Processing...' : 'Recommend'}
              </button>

              <button
                style={styles.addButton(hoveredCard === 'add')}
                onMouseEnter={() => setHoveredCard('add')}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={handleAdd}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Section - AI Recommendation */}
        <div style={styles.rightSection}>
          <div style={styles.aiCard}>
            <div style={styles.aiCardHeader}>
              <Sparkles size={20} style={styles.aiIcon} />
              <span style={styles.aiTitle}>Recommend using AI</span>
            </div>
            <div style={styles.aiDescription}>
              Let our AI analyze your work patterns, project requirements, and team capacity to suggest optimal time allocation.
            </div>
            <div style={styles.aiFeatures}>
              • Smart hour estimation based on date range<br />
              • Workload balancing recommendations<br />
              • Deadline-aware scheduling<br />
              • Team capacity optimization<br />
              <br />
              <strong>Note:</strong> Admin (Leave) entries are excluded from 80% capacity utilization calculations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActuals;