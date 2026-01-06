import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, Calendar, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/api';

const AdminActuals = () => {
  const [section, setSection] = useState('actuals');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Project');

  const [userAssignedProjects, setUserAssignedProjects] = useState([]);

  const [matchingResult, setMatchingResult] = useState({
    matching: {
      matchedActivities: [],
      totalMatchedHours: 0,
      summary: ''
    }
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [isCustomInput, setIsCustomInput] = useState(false);

  const [selectedProject, setSelectedProject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState('');

  const [manDays, setManDays] = useState('0.00');
  const [userProfile, setUserProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [operations] = useState(['L1 Operations', 'L2 Operations']);
  const [leaves] = useState([
    'Annual Leave',
    'Half-Day Leave',
    'Hospitalization Leave',
    'No Pay Leave',
    'Birthday Leave',
    'Medical Leave',
    'Off-in-Lieu'
  ]);
  const [actuals, setActuals] = useState([]);
  const [systemActuals, setSystemActuals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [capacity, setCapacity] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  }); // Default to dark mode to match sidebar

  const sectionToggleRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  // Add these fetch functions
  const fetchUserProfile = async () => {
    try {
      const response = await apiFetch('/user/profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);

        // Extract user's assigned projects
        if (data.assignedProjects && data.assignedProjects.length > 0) {
          const projectNames = data.assignedProjects
            .filter(p => p.projectType === 'Project')
            .map(p => p.name);

          setUserAssignedProjects(projectNames);
          console.log('✅ User assigned projects:', projectNames);
        }
      } else {
        setError('Failed to fetch user profile');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Error fetching user profile');
    }
  };

  const fetchCapacity = async () => {
    try {
      const res = await apiFetch('/actuals/capacity', {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setCapacity(data);
      }
    } catch (err) {
      console.error('❌ Error fetching capacity:', err);
    }
  };

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

  // Inject fadeIn animation for AI card
  useEffect(() => {
    const fadeStyle = document.createElement("style");
    fadeStyle.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ai-card-fade {
      animation: fadeIn 0.6s ease;
    }
  `;
    document.head.appendChild(fadeStyle);
    return () => document.head.removeChild(fadeStyle);
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchProjects();
    fetchActuals();
    fetchHolidays();
    fetchCapacity();
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

  useEffect(() => {
    if (selectedCategory !== 'Admin/Others') return;
    if (!startDate || !endDate || !selectedProject) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    let workingDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        workingDays++;
      }
    }

    let calculatedHours = 0;

    if (selectedProject === 'Half-Day Leave') {
      calculatedHours = workingDays * 4;
    } else {
      calculatedHours = workingDays * 8;
    }

    setHours(calculatedHours.toString());
  }, [selectedCategory, selectedProject, startDate, endDate]);

  useEffect(() => {
    fetchSystemActuals();
  }, [startDate, endDate]);

  useEffect(() => {
    if (error && (startDate || endDate || selectedProject)) {
      setError(null);
    }
  }, [startDate, endDate, selectedProject]);



  const fetchProjects = async () => {
    try {
      console.log('🔍 Fetching projects from /plan/master...');

      const response = await apiFetch('/plan/master', {
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
      const response = await apiFetch('/actuals', {
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

  const fetchHolidays = async () => {
    try {
      const year = new Date().getFullYear();

      const response = await apiFetch(
        `/actuals/holidays?year=${year}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setHolidays(data);
        console.log('🎌 Holidays loaded:', data);
      }
    } catch (err) {
      console.error('❌ Error fetching holidays:', err);
    }
  };

  const fetchSystemActuals = async () => {
    if (!startDate || !endDate) return;

    try {
      const response = await apiFetch(
        `/actuals/system?startDate=${startDate}&endDate=${endDate}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setSystemActuals(data);
      }
    } catch (err) {
      console.error('❌ Error fetching system actuals:', err);
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

  // Reset auto-selection when user manually changes project
  const handleProjectChange = (value) => {
    if (value === '__custom__') {
      setSelectedProject(''); // ✅ Clear the value instead of showing "__custom__"
      setIsCustomInput(true);
    } else {
      setSelectedProject(value);
    }
  };

  const getSectionTitle = () => {
    return section === 'actuals' ? 'Actuals' : 'View Logs';
  };

  const handleMatchActivities = async () => {
    if (!startDate || !endDate) {
      alert('Please select dates first');
      return;
    }

    // If no project selected, use ALL assigned projects/operations
    let projectsToMatch = [];

    if (!selectedProject) {
      if (selectedCategory === 'Project') {
        projectsToMatch = userAssignedProjects; // All assigned projects
      } else if (selectedCategory === 'Operations') {
        // You need to fetch user's assigned operations similar to projects
        // For now, assuming all operations are assigned:
        projectsToMatch = operations;
      } else if (selectedCategory === 'Admin/Others') {
        alert('Please select a leave type to match activities');
        return;
      }

      if (projectsToMatch.length === 0) {
        alert('You have no assigned projects/operations to match');
        return;
      }

      console.log(`🎯 No project selected - searching ALL assigned: ${projectsToMatch.join(', ')}`);
    } else {
      projectsToMatch = [selectedProject]; // Only the selected project
      console.log(`🎯 Specific project selected: ${selectedProject}`);
    }

    setAiLoading(true);
    setError(null);
    setMatchingResult(null);

    try {
      console.log('🤖 Matching project activities with AI...');

      const response = await apiFetch('/api/actuals/match-project', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          projectNames: projectsToMatch, // Array of projects instead of single project
          startDate,
          endDate,
          systemActivities: systemActuals,
          category: selectedCategory
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "AI matching failed");
      }

      setMatchingResult(data);

      // Auto-fill hours with matched hours
      if (data.matching?.totalMatchedHours) {
        setHours(data.matching.totalMatchedHours.toString());
      }

    } catch (err) {
      console.error("❌ Error during AI matching:", err);
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const checkForDuplicateDates = () => {
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    const duplicate = actuals.find(actual => {
      if (actual.Project !== selectedProject) {
        return false;
      }

      const existingStart = new Date(actual.StartDate);
      const existingEnd = new Date(actual.EndDate);

      // Check for date overlap for the SAME project
      return (
        (newStart >= existingStart && newStart <= existingEnd) ||
        (newEnd >= existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd) ||
        (existingStart <= newStart && existingEnd >= newEnd)
      );
    });

    return duplicate;
  };

  const calculateWorkingDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      // Exclude weekends (0 = Sunday, 6 = Saturday)
      if (day !== 0 && day !== 6) {
        workingDays++;
      }
    }

    return workingDays;
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

    // ✅ Frontend validation - Quick check before hitting backend
    const duplicate = checkForDuplicateDates();
    if (duplicate) {
      const duplicateStart = new Date(duplicate.StartDate).toLocaleDateString('en-GB');
      const duplicateEnd = new Date(duplicate.EndDate).toLocaleDateString('en-GB');

      setError(
        `⚠️ Duplicate Entry Detected!\n\n` +
        `You already have an entry for dates that overlap with your selection:\n\n` +
        `• Project: ${duplicate.Project}\n` +
        `• Category: ${duplicate.Category}\n` +
        `• Date Range: ${duplicateStart} - ${duplicateEnd}\n` +
        `• Hours: ${duplicate.Hours}h\n\n` +
        `Please select different dates or edit the existing entry.`
      );

      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
    const maxAllowedHours = totalDays * 24; // 24 hours per day
    const enteredHours = parseFloat(hours);

    if (enteredHours > maxAllowedHours) {
      const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB');
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-GB');

      setError(
        `⚠️ Hours Exceed Maximum Allowed!\n\n` +
        `Date Range: ${formattedStartDate} - ${formattedEndDate}\n` +
        `Total Days: ${totalDays} day${totalDays !== 1 ? 's' : ''}\n` +
        `Maximum Allowed: ${maxAllowedHours} hours (${totalDays} × 24h)\n` +
        `You Entered: ${enteredHours.toFixed(1)} hours\n\n` +
        `Please reduce your hours to ${maxAllowedHours} or less.`
      );

      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      console.log('🌐 Fetching /actuals...');

      const response = await apiFetch('/actuals', {
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
        const savedHours = responseData.actual?.Hours;
        console.log('✅ Success response:', responseData);

        alert('Actual entry added successfully!');
        // Reset form
        setSelectedProject('');
        setStartDate('');
        setEndDate('');
        setHours('');
        setManDays('0.00');
        setMatchingResult(null);
        setError(null); // Clear any errors
        // Refresh actuals list
        fetchActuals();
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        
        // ✅ Handle duplicate error from backend (status 409)
        if (response.status === 409) {
          setError(errorData.error || errorData.message);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setError(errorData.message || 'Failed to add actual entry');
        }
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Error adding actual entry: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  // Update the getProjectOptions function to prioritize user's projects
  const getProjectOptions = () => {
    switch (selectedCategory) {
      case 'Project':
        // Separate user's assigned projects from all projects
        const assignedSet = new Set(userAssignedProjects);
        const userProjects = projects.filter(p => assignedSet.has(p));
        const otherProjects = projects.filter(p => !assignedSet.has(p));

        // Return user's projects first, then others
        return [...userProjects, ...otherProjects];
      case 'Operations':
        return operations;
      case 'Admin/Others':
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
      case 'Admin/Others':
        return 'Leave Type:';
      default:
        return 'Select:';
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '30px 40px', // Increase horizontal padding from 40px
      background: isDarkMode
        ? 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 60%, #e0e7ff 100%)',
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
      gap: '40px', // Use percentage instead of fixed pixels
      alignItems: 'flex-start',
      width: '100%',
      margin: '0'
    },
    leftSection: {
      flex: '1 1 65%', // Takes 65% of available space
      minWidth: '600px' // Minimum width for smaller screens
    },
    rightSection: {
      flex: '1 1 30%', // Takes 30% of available space
      minWidth: '400px',
      maxWidth: '550px' // Max width so it doesn't get too wide
    },
    categoryTabs: {
      display: 'flex',
      gap: '20px',
      marginBottom: '40px',
      justifyContent: 'flex-start', //  
      flexWrap: 'wrap' //   for responsiveness
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
      background: isDarkMode
        ? 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)'
        : 'linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(224,242,254,0.95) 100%)',
      borderRadius: '20px',
      padding: '32px',
      border: isDarkMode
        ? '1px solid rgba(99,102,241,0.35)'
        : '1px solid rgba(79,70,229,0.35)',

      boxShadow: isDarkMode
        ? '0 20px 50px rgba(99,102,241,0.15)'
        : '0 24px 60px rgba(79,70,229,0.18)',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '350px'
    },
    aiCardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px'
    },
    aiIcon: {
      color: '#6366f1',
      animation: 'sparkle 2s ease-in-out infinite'
    },

    aiDescription: {
      fontSize: '14px',
      color: isDarkMode ? '#cbd5e1' : '#334155',
      lineHeight: '1.6',
      marginBottom: '16px'
    },
    aiTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e5e7eb' : '#1e293b'
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
      color: isDarkMode ? '#e5e7eb' : '#1e293b',
      lineHeight: '1.4'
    },
    errorMessage: {
      backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2',
      color: isDarkMode ? '#fca5a5' : '#dc2626',
      padding: '16px 20px',
      borderRadius: '12px',
      marginBottom: '20px',
      fontSize: '14px',
      border: isDarkMode ? '2px solid rgba(239,68,68,0.3)' : '2px solid #fecaca',
      fontWeight: '500',
      lineHeight: '1.6',
      whiteSpace: 'pre-line', // Allows line breaks in error message
      boxShadow: '0 4px 12px rgba(239,68,68,0.15)'
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
                    <div style={styles.tooltipStatNumber}>
                      {capacity?.utilizationPercentage !== undefined
                        ? `${Number(capacity.utilizationPercentage).toFixed(0)}%`
                        : '--'}
                    </div>
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
            {['Project', 'Operations', 'Admin/Others'].map((category) => (
              <div
                key={category}
                style={styles.categoryTab(
                  selectedCategory === category,
                  hoveredCard === `category-${category}`
                )}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedProject('');
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
              <div
                style={{ ...styles.formGroup, cursor: 'pointer' }}
                onClick={() => {
                  if (startDateRef.current?.showPicker) {
                    startDateRef.current.showPicker();
                  } else {
                    startDateRef.current?.focus();
                  }
                }}
              >
                <label style={styles.label}>Start Date:</label>
                <input
                  ref={startDateRef}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    ...styles.input(false),
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div
                style={{ ...styles.formGroup, cursor: 'pointer' }}
                onClick={() => {
                  if (endDateRef.current?.showPicker) {
                    endDateRef.current.showPicker();
                  } else {
                    endDateRef.current?.focus();
                  }
                }}
              >
                <label style={styles.label}>End Date:</label>
                <input
                  ref={endDateRef}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    ...styles.input(false),
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>

            {/* Project / Operation / Leave Row */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{getProjectLabel()}</label>

                {!isCustomInput ? (
                  <>
                    <select
                      value={selectedProject}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      style={styles.select(false)}
                    >
                      <option value="">
                        {userAssignedProjects.length > 0
                          ? 'Select your project...'
                          : 'Select project...'}
                      </option>

                      {selectedCategory === 'Project' && userAssignedProjects.length > 0 && (
                        <>
                          <optgroup label="Your Assigned Projects">
                            {userAssignedProjects.map((option, index) => (
                              <option key={`assigned-${index}`} value={option}>
                                ⭐ {option}
                              </option>
                            ))}
                          </optgroup>

                          <optgroup label="All Projects">
                            {projects
                              .filter(p => !userAssignedProjects.includes(p))
                              .map((option, index) => (
                                <option key={`other-${index}`} value={option}>
                                  {option}
                                </option>
                              ))}
                          </optgroup>
                        </>
                      )}

                      {selectedCategory !== 'Project' && (
                        <>
                          {getProjectOptions().map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </>
                      )}

                      <option value="__custom__">➕ Custom / Other</option>
                    </select>
                  </>
                ) : (
                  <input
                    type="text"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    placeholder={
                      selectedCategory === 'Project'
                        ? 'Enter custom project name'
                        : selectedCategory === 'Operations'
                          ? 'Enter custom operation'
                          : 'Enter custom leave type'
                    }
                    style={styles.input(false)}
                    onBlur={() => {
                      if (!selectedProject) {
                        setIsCustomInput(false);
                      }
                    }}
                  />
                )}

                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Select from list or choose <strong>Custom / Other</strong> to enter your own
                </div>
              </div>
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
                  disabled={selectedCategory === 'Admin/Others'}
                  placeholder={
                    selectedCategory === 'Admin/Others'
                      ? 'Auto-calculated'
                      : 'Enter hours worked'
                  }
                />
                {selectedCategory !== 'Admin/Others' && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    Enter expected hours — system will adjust if capacity is exceeded
                  </div>
                )}
                {systemActuals.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    padding: '14px',
                    borderRadius: '12px',
                    backgroundColor: isDarkMode
                      ? 'rgba(30,41,59,0.7)'
                      : 'rgba(248,250,252,0.9)',
                    border: isDarkMode
                      ? '1px solid rgba(99,102,241,0.25)'
                      : '1px solid rgba(226,232,240,0.8)',
                    color: isDarkMode ? '#e5e7eb' : '#1e293b',
                    fontSize: '12px'
                  }}>
                    <strong style={{ color: isDarkMode ? '#e0e7ff' : '#1e3a8a' }}>
                      System-detected activity (ManicTime):
                    </strong>

                    {systemActuals.slice(0, 6).map((a, idx) => (
                      <div key={idx} style={{ marginTop: '4px' }}>
                        • {a.activityName} — {a.hours.toFixed(2)}h
                      </div>
                    ))}

                    {systemActuals.length > 6 && (
                      <div style={{ fontStyle: 'italic', marginTop: '4px' }}>
                        + {systemActuals.length - 6} more…
                      </div>
                    )}
                  </div>
                )}
                {selectedCategory === 'Admin/Others' ? (
                  <div style={styles.autoCalculated}>
                    Hours auto-calculated:
                    • Half-Day = 4h/day
                    • Other Leave = 8h/day
                    (Weekends & public holidays excluded)
                  </div>
                ) : (
                  <div style={styles.autoCalculated}>
                    (validated against remaining capacity, leave & public holidays)
                  </div>
                )}
                <div style={styles.manDaysDisplay}>
                  ≈ {manDays} man-days
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.buttonRow}>
              <button
                style={styles.recommendButton(hoveredCard === 'match')}
                onMouseEnter={() => setHoveredCard('match')}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={handleMatchActivities}
                disabled={loading || aiLoading}
              >
                <Sparkles size={20} />
                {aiLoading ? 'Matching...' : 'Match Activities'}
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
          <div style={styles.aiCard} className="ai-card-fade">
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: isDarkMode
                  ? 'radial-gradient(circle at top right, rgba(99,102,241,0.18), transparent 60%)'
                  : 'radial-gradient(circle at top right, rgba(59,130,246,0.18), transparent 60%)',
                pointerEvents: 'none'
              }}
            />
            <div style={styles.aiCardHeader}>
              <Sparkles size={20} style={styles.aiIcon} />
              <span style={styles.aiTitle}>AI Activity Matching</span>
            </div>

            {aiLoading ? (
              <div
                style={{
                  color: isDarkMode ? '#e0e7ff' : '#1e3a8a',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ⏳ Analyzing your ManicTime activities...
              </div>
            ) : matchingResult ? (
              <div>

                {console.log('🧠 AI matchingResult:', matchingResult)}

                <p style={{ fontSize: '14px', color: isDarkMode ? '#e5e7eb' : '#1e293b', marginBottom: '12px' }}>
                  <strong>{matchingResult.matching.summary}</strong>
                </p>

                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e5e7eb' : '#1e293b',
                  marginBottom: '16px'
                }}>
                  Total Matched: {matchingResult.matching.totalMatchedHours} hours
                </div>

                <div style={{ fontSize: '12px', fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#1e293b', marginBottom: '8px' }}>
                  MATCHED ACTIVITIES:
                </div>

                {(matchingResult?.matching?.matchedActivities || []).map((activity, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: isDarkMode
                        ? 'rgba(30,41,59,0.6)'
                        : 'rgba(255,255,255,0.9)',
                      borderRadius: '10px',
                      padding: '14px',
                      marginBottom: '10px',
                      border: '1px solid rgba(99,102,241,0.25)',
                      boxShadow: '0 4px 14px rgba(99,102,241,0.08)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#1e293b' }}>
                        {activity.activityName}
                      </span>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        backgroundColor: activity.confidence === 'high' ? '#10b98120' :
                          activity.confidence === 'medium' ? '#f59e0b20' : '#ef444420',
                        color: activity.confidence === 'high' ? '#10b981' :
                          activity.confidence === 'medium' ? '#f59e0b' : '#ef4444'
                      }}>
                        {activity.confidence}
                      </span>
                    </div>

                    {/* ✅   SECTION - Shows which project the activity belongs to */}
                    {activity.projectName && (
                      <div style={{
                        fontSize: '11px',
                        color: '#6366f1',
                        fontWeight: '600',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        📁 {activity.projectName}
                      </div>
                    )}

                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#cbd5e1' : '#475569',
                      marginBottom: '4px'
                    }}>
                      {activity.hours} hours
                    </div>

                    <div style={{
                      fontSize: '11px',
                      color: isDarkMode ? '#9ca3af' : '#64748b',
                      fontStyle: 'italic'
                    }}>
                      {activity.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.aiDescription}>
                Select a project and click "Match Activities" to see which ManicTime activities correspond to your project work.
                <div style={styles.aiFeatures}>
                  <br />
                  • AI analyzes your PC activity<br />
                  • Matches apps/files to projects<br />
                  • Suggests actual hours worked<br />
                  • Confidence-based recommendations
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActuals;