import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, Calendar, Sparkles, FolderOpen } from 'lucide-react';
import { apiFetch } from '../utils/api';
import DatePicker from '../components/DatePicker';
import Dropdown from '../components/Dropdown';

const AnimatedNumber = ({ value, suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value || 0;
    const duration = 1000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <>{decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue)}{suffix}</>;
};


const FormSkeleton = ({ isDarkMode }) => (
  <div style={{
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
  }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{
        height: '60px',
        background: isDarkMode
          ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
          : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '12px',
        marginBottom: '24px'
      }} />
    ))}
  </div>
);

const LoadingSpinner = () => (
  <div style={{
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  }} />
);

const SuccessToast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#10b981',
      color: '#fff',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 8px 25px rgba(16,185,129,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{ fontSize: '24px' }}>✅</div>
      <div style={{ fontWeight: '600' }}>{message}</div>
    </div>
  );
};

const AdminActuals = () => {
  const [section, setSection] = useState('actuals');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Project');

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasManicTimeSetup, setHasManicTimeSetup] = useState(false);

  const [fieldValidation, setFieldValidation] = useState({
    startDate: null,
    endDate: null,
    project: null,
    hours: null
  });

  const [userAssignedProjects, setUserAssignedProjects] = useState([]);
  const [userAssignedOperations, setUserAssignedOperations] = useState([]);

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
  const [isMultiProjectMode, setIsMultiProjectMode] = useState(false)
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
  const [initialLoading, setInitialLoading] = useState(true);
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

  const [dateError, setDateError] = useState('');

  // Add this helper function near the top of the component, after state declarations
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

  const sectionToggleRef = useRef(null);
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

        // ✅ Check if user has ManicTime setup
        const hasSetup = !!(
          data.deviceName &&
          data.timelineKey &&
          data.subscriptionId
        );

        setHasManicTimeSetup(hasSetup);

        console.log('📊 ManicTime Setup Status:', hasSetup ? 'READY' : 'NOT CONFIGURED');
        console.log('  Device:', data.deviceName || 'MISSING');
        console.log('  Timeline Key:', data.timelineKey || 'MISSING');
        console.log('  Subscription:', data.subscriptionId || 'MISSING');

        // Extract assigned projects and operations
        if (data.assignedProjects && data.assignedProjects.length > 0) {
          const projectNames = data.assignedProjects
            .filter(p => p.projectType === 'Project')
            .map(p => p.name);

          const operationNames = data.assignedProjects
            .filter(p => p.projectType === 'Operations')
            .map(p => p.name);

          setUserAssignedProjects(projectNames);
          setUserAssignedOperations(operationNames);
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
    
    body > div, #root > div, .app > div {
      background: transparent !important;
    }
    
    input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  opacity: 1;
  cursor: pointer;
  ${isDarkMode ? `
    background-color: #9ca3af;
    border-left: 1px solid #6b7280;
  ` : `
    background-color: #e5e7eb;
    border-left: 1px solid #d1d5db;
  `}
}

input[type="number"]::-webkit-inner-spin-button:hover {
  background-color: ${isDarkMode ? '#d1d5db' : '#cbd5e1'};
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

    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    .floating {
      animation: float 3s ease-in-out infinite;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
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
    const loadInitialData = async () => {
      setInitialLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchProjects(),
        fetchActuals(),
        fetchHolidays(),
        fetchCapacity()
      ]);
      setInitialLoading(false);
    };

    loadInitialData();
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

  useEffect(() => {
    if (error && (startDate || endDate || selectedProject)) {
      setError(null);
    }
  }, [startDate, endDate, selectedProject]);

  // 🆕 Update field validation
  useEffect(() => {
    setFieldValidation({
      startDate: startDate ? 'valid' : null,
      endDate: endDate ? 'valid' : null,
      project: selectedProject ? 'valid' : null,
      hours: hours && parseFloat(hours) > 0 ? 'valid' : null
    });
  }, [startDate, endDate, selectedProject, hours]);

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

  const getSectionTitle = () => {
    return section === 'actuals' ? 'Actuals' : 'View Logs';
  };

  const handleAdd = async () => {
    console.log('🚀 handleAdd called');

    const today = getTodayDate();
    if (startDate > today || endDate > today) {
      setError('❌ Cannot log actuals for future dates. Please select today or earlier.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!startDate || !endDate || !hours) {
      alert('Please fill in dates and hours');
      return;
    }

    // Validation for date range vs hours
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const maxAllowedHours = totalDays * 24;
    const enteredHours = parseFloat(hours);

    if (enteredHours > maxAllowedHours) {
      const formattedStartDate = start.toLocaleDateString('en-GB');
      const formattedEndDate = end.toLocaleDateString('en-GB');

      setError(
        `⚠️ Hours Exceed Maximum Allowed!\n\n` +
        `Date Range: ${formattedStartDate} - ${formattedEndDate}\n` +
        `Total Days: ${totalDays} day${totalDays !== 1 ? 's' : ''}\n` +
        `Maximum Allowed: ${maxAllowedHours} hours (${totalDays} × 24h)\n` +
        `You Entered: ${enteredHours.toFixed(1)} hours\n\n` +
        `Please reduce your hours to ${maxAllowedHours} or less.`
      );

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Multi-project mode: Create separate entries for each matched project
      if (isMultiProjectMode && matchingResult?.matching?.matchedActivities) {
        console.log('📦 Multi-project mode: Creating separate entries');

        // Group activities by project and sum hours
        const projectHours = {};

        matchingResult.matching.matchedActivities.forEach(activity => {
          const projectName = activity.projectName;
          if (!projectHours[projectName]) {
            projectHours[projectName] = 0;
          }
          projectHours[projectName] += activity.hours;
        });

        console.log('📊 Hours breakdown by project:', projectHours);

        // Create one entry per project
        const promises = Object.entries(projectHours).map(async ([projectName, projectHours]) => {
          const requestBody = {
            category: selectedCategory,
            project: projectName,
            startDate,
            endDate,
            hours: parseFloat(projectHours.toFixed(2))
          };

          console.log(`📤 Creating entry for ${projectName}: ${projectHours}h`);

          const response = await apiFetch('/actuals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to add entry for ${projectName}: ${errorData.message || errorData.error}`);
          }

          return response.json();
        });

        // Wait for all entries to be created
        await Promise.all(promises);

        setSuccessMessage(`✅ Successfully created ${Object.keys(projectHours).length} actuals entries!`);
        setShowSuccess(true);

      } else {
        // Single project mode OR manual entry
        if (!selectedProject) {
          alert('Please select a project');
          setLoading(false);
          return;
        }

        console.log('📦 Single project mode: Creating one entry');

        const requestBody = {
          category: selectedCategory,
          project: selectedProject,
          startDate,
          endDate,
          hours: parseFloat(hours)
        };

        const response = await apiFetch('/actuals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json();

          if (response.status === 409) {
            setError(errorData.error || errorData.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setLoading(false);
            return;
          } else {
            throw new Error(errorData.message || 'Failed to add actual entry');
          }
        }

        setSuccessMessage('Actual entry added successfully!');
        setShowSuccess(true);
      }

      // Reset form
      setSelectedProject('');
      setStartDate('');
      setEndDate('');
      setHours('');
      setManDays('0.00');
      setMatchingResult(null);
      setIsMultiProjectMode(false);
      setError(null);

      // Refresh actuals list
      fetchActuals();

    } catch (err) {
      console.error('❌ Add error:', err);
      setError('Error adding actual entry: ' + err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handleMatchActivities = async () => {
    if (!startDate || !endDate) {
      alert('Please select date range first');
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      // Build projectNames array based on mode
      let projectNames;

      if (selectedProject) {
        // Single project mode: send as array with one project
        projectNames = [selectedProject];
      } else {
        // Multi-project mode: send all assigned projects
        projectNames = selectedCategory === 'Project'
          ? userAssignedProjects
          : selectedCategory === 'Operations'
            ? userAssignedOperations
            : [];
      }

      // Validate we have projects to match
      if (!projectNames || projectNames.length === 0) {
        alert('No projects to match. Please select a project or ensure you have assigned projects.');
        setAiLoading(false);
        return;
      }

      const requestBody = {
        projectNames, // ✅ Correct: array of project names
        startDate,
        endDate,
        category: selectedCategory
      };

      console.log('📤 Sending match request:', requestBody);

      const response = await apiFetch('/actuals/match-activities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to match activities');
      }

      const data = await response.json();
      setMatchingResult(data);

      // Set multi-project mode if no specific project selected
      setIsMultiProjectMode(!selectedProject);

      // Auto-populate hours with total matched hours
      if (data.matching?.totalMatchedHours) {
        setHours(data.matching.totalMatchedHours.toString());
      }

    } catch (err) {
      console.error('❌ Match activities error:', err);
      setError('Failed to match activities: ' + err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        return userAssignedOperations; // USE ASSIGNED OPERATIONS
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
      border: !hasManicTimeSetup
        ? '2px solid #6b7280'
        : '2px solid #f59e0b',
      backgroundColor: !hasManicTimeSetup
        ? '#6b7280'
        : (isHovered ? '#f59e0b' : 'transparent'),
      color: !hasManicTimeSetup
        ? '#9ca3af'
        : (isHovered ? '#fff' : '#f59e0b'),
      fontSize: '18px',
      fontWeight: '600',
      cursor: !hasManicTimeSetup ? 'not-allowed' : (loading ? 'not-allowed' : 'pointer'),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      transform: (!hasManicTimeSetup || loading) ? 'translateY(0) scale(1)' : (isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)'),
      boxShadow: (!hasManicTimeSetup || loading) ? 'none' : (isHovered ? '0 8px 25px rgba(245,158,11,0.25)' : '0 2px 8px rgba(0,0,0,0.05)'),
      minHeight: '60px',
      opacity: (!hasManicTimeSetup || loading) ? 0.5 : 1,
      pointerEvents: (!hasManicTimeSetup || loading) ? 'none' : 'auto'
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
      {showSuccess && (
        <SuccessToast
          message={successMessage}
          onClose={() => setShowSuccess(false)}
        />
      )}
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
          {initialLoading ? (
            <FormSkeleton isDarkMode={isDarkMode} />
          ) : (
            <div style={styles.formContainer}>
              {error && <div style={styles.errorMessage}>{error}</div>}

              {dateError && (
                <div style={{
                  ...styles.errorMessage,
                  animation: 'shake 0.5s ease-in-out'
                }}>
                  {dateError}
                </div>
              )}

              {/* Date Row */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    label={
                      <span>
                        Start Date:
                        {fieldValidation.startDate === 'valid' && (
                          <span style={{ color: '#10b981', marginLeft: '8px', fontSize: '16px' }}>✓</span>
                        )}
                      </span>
                    }
                    isDarkMode={isDarkMode}
                    placeholder="Select start date"
                    max={getTodayDate()}
                  />
                </div>
                <div style={styles.formGroup}>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    label={
                      <span>
                        End Date:
                        {fieldValidation.endDate === 'valid' && (
                          <span style={{ color: '#10b981', marginLeft: '8px', fontSize: '16px' }}>✓</span>
                        )}
                      </span>
                    }
                    isDarkMode={isDarkMode}
                    placeholder="Select end date"
                    max={getTodayDate()}
                  />
                </div>
              </div>

              {/* Project / Operation / Leave Row */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <Dropdown
                    value={selectedProject}
                    onChange={(value) => {
                      setSelectedProject(value);
                      setIsCustomInput(false);
                    }}
                    label={
                      <span>
                        {getProjectLabel()}
                        {fieldValidation.project === 'valid' && (
                          <span style={{ color: '#10b981', marginLeft: '8px', fontSize: '16px' }}>✓</span>
                        )}
                      </span>
                    }
                    placeholder={
                      userAssignedProjects.length > 0 && selectedCategory === 'Project'
                        ? 'Select your project...'
                        : userAssignedOperations.length > 0 && selectedCategory === 'Operations'
                          ? 'Select your operation...'
                          : `Select ${selectedCategory.toLowerCase()}...`
                    }
                    isDarkMode={isDarkMode}
                    searchable={selectedCategory === 'Project' && projects.length > 10}
                    groupedOptions={
                      selectedCategory === 'Project' && userAssignedProjects.length > 0
                        ? {
                          'Your Assigned Projects': userAssignedProjects,
                          'All Projects': projects.filter(p => !userAssignedProjects.includes(p))
                        }
                        : null
                    }
                    options={
                      selectedCategory === 'Project'
                        ? (userAssignedProjects.length === 0 ? projects : null)
                        : getProjectOptions()
                    }
                    allowCustom={true}
                    customPlaceholder={
                      selectedCategory === 'Project'
                        ? 'Enter custom project name'
                        : selectedCategory === 'Operations'
                          ? 'Enter custom operation'
                          : 'Enter custom leave type'
                    }
                  />

                  {selectedCategory === 'Project' && userAssignedProjects.length === 0 && projects.length === 0 ? (
                    <div style={{
                      fontSize: '12px',
                      color: '#ef4444',
                      marginTop: '6px',
                      padding: '8px 12px',
                      backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2',
                      borderRadius: '8px',
                      border: isDarkMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid #fecaca'
                    }}>
                      ⚠️ No projects available. Please contact your administrator to be assigned to a project, or use <strong>Custom / Other</strong> to enter manually.
                    </div>
                  ) : selectedCategory === 'Project' && userAssignedProjects.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>
                      ℹ️ You're not assigned to any projects. Showing all available projects. Select from list or choose <strong>Custom / Other</strong> to enter your own.
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                      Select from list or choose <strong>Custom / Other</strong> to enter your own
                    </div>
                  )}
                </div>
              </div>

              {/* Hours Row */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Hours:
                    {fieldValidation.hours === 'valid' && (
                      <span style={{ color: '#10b981', marginLeft: '8px', fontSize: '16px' }}>✓</span>
                    )}
                  </label>
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
                    ≈ <AnimatedNumber value={parseFloat(manDays)} decimals={2} /> man-days
                  </div>
                </div>
              </div>

                {!hasManicTimeSetup && (
                  <div style={{
                    backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                    color: isDarkMode ? '#fca5a5' : '#dc2626',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    border: isDarkMode ? '2px solid rgba(239,68,68,0.3)' : '2px solid #fecaca',
                    fontWeight: '500',
                    lineHeight: '1.6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div>
                      <strong>ManicTime Not Configured</strong>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>
                        AI Activity Matching requires ManicTime setup. Please contact your administrator to configure:
                        <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                          <li>Device Name</li>
                          <li>Timeline Key</li>
                          <li>ManicTime Subscription</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div style={styles.buttonRow}>
                <button
                  style={styles.recommendButton(hoveredCard === 'match')}
                  onMouseEnter={() => setHoveredCard('match')}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={handleMatchActivities}
                  disabled={loading || aiLoading || !hasManicTimeSetup}
                >
                  {aiLoading ? (
                    <>
                      <LoadingSpinner />
                      <span>Matching...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>Match Activities</span>
                    </>
                  )}
                </button>
                <button
                  style={styles.addButton(hoveredCard === 'add')}
                  onMouseEnter={() => setHoveredCard('add')}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={handleAdd}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner />
                      <span>Adding...</span>
                    </>
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            </div>
          )}
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
                <p style={{ fontSize: '14px', color: isDarkMode ? '#e5e7eb' : '#1e293b', marginBottom: '12px' }}>
                  <strong>{matchingResult.matching.summary}</strong>
                </p>

                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: isDarkMode ? '#e5e7eb' : '#1e293b',
                  marginBottom: '16px'
                }}>
                  Total Matched: <AnimatedNumber value={matchingResult.matching.totalMatchedHours} /> hours
                </div>

                {/* Group activities by project */}
                {(() => {
                  const projectGroups = {};

                  matchingResult.matching.matchedActivities.forEach(activity => {
                    const projectName = activity.projectName || 'Unassigned';
                    if (!projectGroups[projectName]) {
                      projectGroups[projectName] = [];
                    }
                    projectGroups[projectName].push(activity);
                  });

                  return Object.entries(projectGroups).map(([projectName, activities]) => {
                    const projectTotalHours = activities.reduce((sum, a) => sum + a.hours, 0);

                    return (
                      <div key={projectName} style={{ marginBottom: '20px' }}>
                        {/* Project Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '10px',
                          padding: '10px 14px',
                          backgroundColor: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
                          borderRadius: '10px',
                          border: `2px solid ${isDarkMode ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`
                        }}>
                          <FolderOpen size={18} style={{ color: '#3b82f6' }} />
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: isDarkMode ? '#e5e7eb' : '#1e293b',
                            flex: 1
                          }}>
                            {projectName}
                          </span>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#3b82f6',
                            backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)',
                            padding: '4px 10px',
                            borderRadius: '8px'
                          }}>
                            <AnimatedNumber value={projectTotalHours} decimals={2} />h
                          </span>
                        </div>

                        {/* Activities for this project */}
                        {activities.map((activity, idx) => (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: isDarkMode
                                ? 'rgba(30,41,59,0.6)'
                                : 'rgba(255,255,255,0.9)',
                              borderRadius: '10px',
                              padding: '12px 14px',
                              marginBottom: '8px',
                              marginLeft: '26px',
                              border: '1px solid rgba(99,102,241,0.2)',
                              boxShadow: '0 2px 8px rgba(99,102,241,0.06)',
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '4px'
                            }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#1e293b' }}>
                                {activity.activityName}
                              </span>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 6px',
                                borderRadius: '6px',
                                fontSize: '10px',
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

                            <div style={{
                              fontSize: '11px',
                              color: isDarkMode ? '#cbd5e1' : '#475569',
                              marginBottom: '4px'
                            }}>
                              {activity.hours} hours
                            </div>

                            <div style={{
                              fontSize: '10px',
                              color: isDarkMode ? '#9ca3af' : '#64748b',
                              fontStyle: 'italic'
                            }}>
                              {activity.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div style={styles.aiDescription}>
                <strong>Two Ways to Use:</strong>
                <div style={styles.aiFeatures}>
                  <br />
                  <strong>1. Match All Projects:</strong><br />
                  • Leave project field empty<br />
                  • Click "Match Activities"<br />
                  • AI matches ALL assigned projects<br />
                  • One-click adds all entries<br />
                  <br />
                  <strong>2. Single Project:</strong><br />
                  • Select specific project<br />
                  • Match & add as usual
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default AdminActuals;