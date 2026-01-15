import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Filter,
  TrendingUp,
  Download,
  RefreshCw,
  Clock,
  Target,
  Activity,
  Users,
  Bell,
  User,
  Info,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import Dropdown from '../components/Dropdown';
import DatePicker from '../components/DatePicker';

const AdminReports = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [selectedDateRange, setSelectedDateRange] = useState('Last 30 Days');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [isGenerating, setIsGenerating] = useState(false);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [userData, setUserData] = useState({
    firstName: 'User',
    lastName: 'Name',
    role: 'member',
    department: 'Department'
  });
  const [availableProjects, setAvailableProjects] = useState(['All Projects']);
  const [userAssignedProjects, setUserAssignedProjects] = useState([]);
  const [userAssignedOperations, setUserAssignedOperations] = useState([]);

  // 🆕 Dropdown state
  const [section, setSection] = useState('reports');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const sectionToggleRef = useRef(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  const dateRanges = ['Today', 'Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last 6 Months', 'This Year', 'Custom'];

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    try {
      localStorage.setItem('darkMode', (!isDarkMode).toString());
    } catch (error) {
      console.log('LocalStorage not available');
    }
    setShowProfileTooltip(false);
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 95 && efficiency <= 105) return '#10b981'; // Green
    if (efficiency >= 90 && efficiency < 95) return '#f59e0b'; // Orange
    if (efficiency > 105) return '#8b5cf6'; // Purple (ahead of schedule)
    return '#ef4444'; // Red (needs attention)
  };

  const getButtonStyle = (isHovered) => ({
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
  });

  const getCardStyle = (isHovered) => ({
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: isHovered
      ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.1)'
      : '0 8px 25px rgba(0,0,0,0.08)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden'
  });

  const calculateDateRange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let fromDate, toDate;

    switch (preset) {
      case 'Today':
        fromDate = toDate = new Date(today);
        break;
      case 'Last 7 Days':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 7);
        toDate = new Date(today);
        break;
      case 'Last 30 Days':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 30);
        toDate = new Date(today);
        break;
      case 'Last 3 Months':
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 3);
        toDate = new Date(today);
        break;
      case 'Last 6 Months':
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 6);
        toDate = new Date(today);
        break;
      case 'This Year':
        fromDate = new Date(today.getFullYear(), 0, 1);
        toDate = new Date(today);
        break;
      default:
        fromDate = toDate = new Date(today);
    }

    return {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0]
    };
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateRange = selectedDateRange === 'Custom'
        ? { from: customFromDate, to: customToDate }
        : calculateDateRange(selectedDateRange);

      // Validate custom date range
      if (selectedDateRange === 'Custom' && (!customFromDate || !customToDate)) {
        setError('Please select both start and end dates for custom range');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        fromDate: dateRange.from,
        toDate: dateRange.to
      });

      if (selectedProject && selectedProject !== 'All Projects') {
        params.append('projectFilter', selectedProject);
      }

      console.log('Fetching report with params:', params.toString());

      const response = await apiFetch(
        `/api/reports?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      console.log('Report data received:', data);
      setReportData(data);

      // Update available projects
      if (data.availableProjects) {
        setAvailableProjects(data.availableProjects);
      }

    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    fetchReportData();
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };

  // 🆕 Dropdown handlers
  const handleSectionChange = (newSection) => {
    setSection(newSection);
    setIsSectionOpen(false);

    if (newSection === 'team') {
      window.location.href = '/adminteamcapacity';
    } else if (newSection === 'utilization') {
      window.location.href = '/adminutilization';
    }
  };

  const getSectionTitle = () => {
    switch (section) {
      case 'reports':
        return 'Personal Reports';
      case 'team':
        return 'Team Capacity Summary';
      case 'utilization':
        return 'Utilization Overview';
      default:
        return 'Personal Reports';
    }
  };

  // Dropdown positioning
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

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiFetch('/user/profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);

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
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchReportData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (selectedDateRange !== 'Custom') {
      fetchReportData();
    }
  }, [selectedDateRange, selectedProject]);

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
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
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

      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Get avatar initials
  const getAvatarInitials = (firstName, lastName) => {
    if (!firstName) return '?';
    if (!lastName || lastName.trim() === '') {
      return firstName[0].toUpperCase();
    }
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const StatCardSkeleton = () => (
    <div style={{
      ...getCardStyle(false),
      pointerEvents: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(59,130,246,0.3) 25%, rgba(59,130,246,0.4) 50%, rgba(59,130,246,0.3) 75%)'
            : 'linear-gradient(90deg, rgba(59,130,246,0.2) 25%, rgba(59,130,246,0.3) 50%, rgba(59,130,246,0.2) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            width: '80px',
            height: '24px',
            borderRadius: '8px',
            marginBottom: '8px',
            background: isDarkMode
              ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
              : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />
          <div style={{
            width: '120px',
            height: '14px',
            borderRadius: '6px',
            background: isDarkMode
              ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
              : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />
        </div>
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: isDarkMode
          ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
          : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
    </div>
  );

  const ChartSkeleton = () => (
    <div style={{
      ...getCardStyle(false),
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '220px',
          height: '20px',
          borderRadius: '8px',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
            : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(16,185,129,0.3) 25%, rgba(16,185,129,0.4) 50%, rgba(16,185,129,0.3) 75%)'
            : 'linear-gradient(90deg, rgba(16,185,129,0.2) 25%, rgba(16,185,129,0.3) 50%, rgba(16,185,129,0.2) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>

      <div style={{ height: '400px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'end',
          justifyContent: 'space-between',
          height: '320px',
          padding: '0 40px 20px 40px',
          borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
        }}>
          {/* Y-axis labels skeleton */}
          <div style={{
            position: 'absolute',
            left: '0',
            top: '0',
            height: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                width: '30px',
                height: '12px',
                borderRadius: '4px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                  : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: `${i * 0.1}s`
              }} />
            ))}
          </div>

          {/* Bar chart skeleton */}
          {[...Array(6)].map((_, idx) => (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              flex: 1
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'end',
                gap: '6px',
                height: '280px'
              }}>
                {/* Two bars per month */}
                {[...Array(2)].map((_, barIdx) => (
                  <div key={barIdx} style={{
                    width: '24px',
                    height: `${100 + Math.random() * 120}px`,
                    borderRadius: '6px 6px 0 0',
                    background: isDarkMode
                      ? 'linear-gradient(90deg, rgba(59,130,246,0.3) 25%, rgba(59,130,246,0.4) 50%, rgba(59,130,246,0.3) 75%)'
                      : 'linear-gradient(90deg, rgba(59,130,246,0.2) 25%, rgba(59,130,246,0.3) 50%, rgba(59,130,246,0.2) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    animationDelay: `${(idx * 2 + barIdx) * 0.1}s`
                  }} />
                ))}
              </div>
              {/* Month label */}
              <div style={{
                width: '40px',
                height: '13px',
                borderRadius: '6px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                  : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: `${idx * 0.1}s`
              }} />
            </div>
          ))}
        </div>

        {/* Legend skeleton */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginTop: '20px',
          padding: '16px',
          backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.5)',
          borderRadius: '12px'
        }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, rgba(59,130,246,0.3) 25%, rgba(59,130,246,0.4) 50%, rgba(59,130,246,0.3) 75%)'
                  : 'linear-gradient(90deg, rgba(59,130,246,0.2) 25%, rgba(59,130,246,0.3) 50%, rgba(59,130,246,0.2) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }} />
              <div style={{
                width: '100px',
                height: '13px',
                borderRadius: '6px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                  : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: `${i * 0.1}s`
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TableSkeleton = () => (
    <div style={{
      ...getCardStyle(false),
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '180px',
          height: '20px',
          borderRadius: '8px',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
            : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
        <div style={{
          width: '80px',
          height: '32px',
          borderRadius: '8px',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(59,130,246,0.3) 25%, rgba(59,130,246,0.4) 50%, rgba(59,130,246,0.3) 75%)'
            : 'linear-gradient(90deg, rgba(59,130,246,0.2) 25%, rgba(59,130,246,0.3) 50%, rgba(59,130,246,0.2) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>

      <div style={{
        borderRadius: '12px',
        border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
          padding: '16px',
          backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)',
          borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
        }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              height: '14px',
              borderRadius: '6px',
              background: isDarkMode
                ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
                : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              animationDelay: `${i * 0.1}s`,
              width: i === 0 ? '60%' : '70%',
              marginLeft: i === 0 ? '0' : 'auto',
              marginRight: i === 0 ? 'auto' : 'auto'
            }} />
          ))}
        </div>

        {/* Table Rows */}
        {[...Array(5)].map((_, rowIdx) => (
          <div key={rowIdx} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr',
            padding: '16px',
            borderBottom: rowIdx < 4
              ? (isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)')
              : 'none'
          }}>
            {[...Array(5)].map((_, colIdx) => (
              <div key={colIdx} style={{
                height: '14px',
                borderRadius: '6px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, rgba(51,65,85,0.5) 25%, rgba(75,85,99,0.5) 50%, rgba(51,65,85,0.5) 75%)'
                  : 'linear-gradient(90deg, rgba(241,245,249,0.8) 25%, rgba(226,232,240,0.8) 50%, rgba(241,245,249,0.8) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                animationDelay: `${(rowIdx * 5 + colIdx) * 0.05}s`,
                width: colIdx === 0 ? '80%' : colIdx === 1 ? '60%' : '50%',
                marginLeft: colIdx === 0 ? '0' : 'auto',
                marginRight: colIdx === 0 ? 'auto' : 'auto'
              }} />
            ))}
          </div>
        ))}
      </div>

      {/* Summary skeleton */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          width: '140px',
          height: '14px',
          borderRadius: '6px',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
            : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
        <div style={{
          width: '200px',
          height: '14px',
          borderRadius: '6px',
          background: isDarkMode
            ? 'linear-gradient(90deg, rgba(75,85,99,0.5) 25%, rgba(100,116,139,0.5) 50%, rgba(75,85,99,0.5) 75%)'
            : 'linear-gradient(90deg, rgba(226,232,240,0.8) 25%, rgba(203,213,225,0.8) 50%, rgba(226,232,240,0.8) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      padding: '30px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif',
      transition: 'all 0.3s ease'
    }}>
      {/* Header with Dropdown */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        position: 'relative'
      }}>

        <div></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            style={getButtonStyle(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => window.location.href = '/adminalerts'}
          >
            <Bell size={20} />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              border: '2px solid #fff'
            }}></div>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={getButtonStyle(hoveredCard === 'profile')}
              onMouseEnter={() => {
                setHoveredCard('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => window.location.href = '/adminprofile'}
            >
              <User size={20} />
            </button>

            {showProfileTooltip && userData && (
              <div
                style={{
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
                  animation: 'slideIn 0.2s ease-out'
                }}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
              >
                <div style={{
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
                }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
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
                  }}>
                    {getAvatarInitials(userData.firstName, userData.lastName)}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isDarkMode ? '#e2e8f0' : '#1e293b'
                    }}>
                      {userData.firstName} {userData.lastName || ''}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }}>
                      {userData.role === 'admin' ? 'Admin' : 'Member'} • {userData.department}
                    </div>
                  </div>
                </div>

                <button
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    color: '#3b82f6',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%'
                  }}
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
      {userData?.role === 'admin' && isSectionOpen && (
        <div
          style={{
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
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {['reports', 'team', 'utilization'].map((sectionKey, idx) => (
              <div
                key={sectionKey}
                style={{
                  backgroundColor: hoveredCard === `section-${idx}` ? 'rgba(59,130,246,0.1)' : 'transparent',
                  padding: '14px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '8px',
                  margin: '0 8px',
                  color: isDarkMode ? '#e2e8f0' : '#374151',
                  transform: hoveredCard === `section-${idx}` ? 'translateX(4px)' : 'translateX(0)',
                  borderLeft: hoveredCard === `section-${idx}` ? '3px solid #3b82f6' : '3px solid transparent',
                  pointerEvents: 'auto',
                  userSelect: 'none'
                }}
                onClick={(e) => {
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
                {sectionKey === 'reports' ? 'Personal Reports' :
                  sectionKey === 'team' ? 'Team Capacity' : 'Utilization Overview'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ef4444'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }} />
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b'
          }}>Date Range:</span>
          <Dropdown
            value={selectedDateRange}
            onChange={(value) => setSelectedDateRange(value)}
            options={dateRanges}
            placeholder="Select date range..."
            isDarkMode={isDarkMode}
            compact={true}
            clearable={false}
          />
        </div>

        {selectedDateRange === 'Custom' && (
          <>
            <div style={{ minWidth: '200px' }}>
              <DatePicker
                value={customFromDate}
                onChange={(value) => setCustomFromDate(value)}
                label="From Date"
                isDarkMode={isDarkMode}
                placeholder="Select start date"
                compact={true}
              />
            </div>

            <div style={{ minWidth: '200px' }}>
              <DatePicker
                value={customToDate}
                onChange={(value) => setCustomToDate(value)}
                label="To Date"
                isDarkMode={isDarkMode}
                placeholder="Select end date"
                compact={true}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={20} style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }} />
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b'
          }}>Project:</span>
          <Dropdown
            value={selectedProject}
            onChange={(value) => setSelectedProject(value)}
            groupedOptions={(() => {
              // Only use user's assigned projects/operations
              const assignedProjects = (userData?.assignedProjects || [])
                .filter(p => p.projectType === 'Project')
                .map(p => p.name);

              const assignedOperations = (userData?.assignedProjects || [])
                .filter(p => p.projectType === 'Operations')
                .map(p => p.name);

              // If no assignments, return null (will use flat options)
              if (assignedProjects.length === 0 && assignedOperations.length === 0) {
                return null;
              }

              const grouped = {};

              // Always show "All" option at top
              grouped['All'] = ['All Projects'];

              if (assignedProjects.length > 0) {
                grouped['Your Assigned Projects'] = assignedProjects;
              }

              if (assignedOperations.length > 0) {
                grouped['Your Assigned Operations'] = assignedOperations;
              }

              return Object.keys(grouped).length > 1 ? grouped : null;
            })()}
            options={(() => {
              // Fallback flat list - only assigned items
              const assignedItems = (userData?.assignedProjects || []).map(p => p.name);
              return ['All Projects', ...assignedItems];
            })()}
            placeholder="Select project or operation..."
            isDarkMode={isDarkMode}
            searchable={userData?.assignedProjects?.length > 5}
            compact={true}
            clearable={false}
          />
        </div>

        <button
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: isGenerating
              ? '#6b7280'
              : hoveredItem === 'generate'
                ? '#2563eb'
                : '#3b82f6',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            transform: hoveredItem === 'generate' && !isGenerating ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: hoveredItem === 'generate' && !isGenerating ? '0 8px 25px rgba(59,130,246,0.3)' : '0 4px 12px rgba(59,130,246,0.2)'
          }}
          onMouseEnter={() => !isGenerating && setHoveredItem('generate')}
          onMouseLeave={() => setHoveredItem(null)}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          <RefreshCw size={16} style={{
            animation: isGenerating ? 'spin 1s linear infinite' : 'none'
          }} />
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Statistics Cards */}
      {loading && !reportData ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div
            style={getCardStyle(hoveredCard === 'stat1')}
            onMouseEnter={() => setHoveredCard('stat1')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: '#10b981',
                position: 'relative'
              }}>
                <Target size={24} />
                <div style={{ position: 'relative' }}>
                  <Info
                    size={14}
                    style={{
                      position: 'absolute',
                      top: '-30px',
                      right: '-8px',
                      cursor: 'pointer',
                      opacity: 0.6
                    }}
                    onMouseEnter={() => setShowFormulaTooltip(true)}
                    onMouseLeave={() => setShowFormulaTooltip(false)}
                  />
                  {showFormulaTooltip && (
                    <div style={{
                      position: 'absolute',
                      bottom: '40px',
                      right: '-50px',
                      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                      padding: '12px',
                      minWidth: '200px',
                      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
                      zIndex: 1000,
                      animation: 'slideIn 0.2s ease-out'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b',
                        marginBottom: '6px'
                      }}>Accuracy Formula:</div>
                      <div style={{
                        fontSize: '11px',
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        fontFamily: 'monospace'
                      }}>
                        (Actuals / Planned) × 100
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        marginTop: '6px',
                        fontStyle: 'italic'
                      }}>
                        Optimal: 95-105%
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: isDarkMode ? '#e2e8f0' : '#1e293b'
                }}>
                  {reportData ? `${reportData.summary.accuracy}%` : loading ? '...' : 'N/A'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}>Actuals vs Planned</div>
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${reportData ? Math.min(parseFloat(reportData.summary.accuracy), 100) : 0}%`,
                height: '100%',
                backgroundColor: getEfficiencyColor(reportData ? parseFloat(reportData.summary.accuracy) : 0),
                borderRadius: '3px',
                transition: 'width 0.8s ease'
              }}></div>
            </div>
          </div>

          <div
            style={getCardStyle(hoveredCard === 'stat2')}
            onMouseEnter={() => setHoveredCard('stat2')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59,130,246,0.1)',
                color: '#3b82f6'
              }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: isDarkMode ? '#e2e8f0' : '#1e293b'
                }}>
                  {reportData ? `${reportData.individualPlans.total}h` : loading ? '...' : 'N/A'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}>Total Planned Hours</div>
              </div>
            </div>
          </div>

          <div
            style={getCardStyle(hoveredCard === 'stat3')}
            onMouseEnter={() => setHoveredCard('stat3')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245,158,11,0.1)',
                color: '#f59e0b'
              }}>
                <Activity size={24} />
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: isDarkMode ? '#e2e8f0' : '#1e293b'
                }}>
                  {reportData ? `${reportData.actuals.total}h` : loading ? '...' : 'N/A'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}>Total Actual Hours</div>
              </div>
            </div>
          </div>

          <div
            style={getCardStyle(hoveredCard === 'stat4')}
            onMouseEnter={() => setHoveredCard('stat4')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(139,92,246,0.1)',
                color: '#8b5cf6'
              }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: reportData?.summary.difference >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {reportData ? `${reportData.summary.difference >= 0 ? '+' : ''}${reportData.summary.difference}h` : loading ? '...' : 'N/A'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}>Difference</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Capacity Utilization Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={getCardStyle(hoveredCard === 'chart')}
          onMouseEnter={() => setHoveredCard('chart')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: isDarkMode ? '#e2e8f0' : '#1e293b',
              margin: 0
            }}>Capacity Utilization Overview</h3>
            <TrendingUp size={20} style={{ color: '#10b981' }} />
          </div>

          {loading && !reportData ? (
            <ChartSkeleton />
          ) : !reportData || !reportData.capacityByMonth || reportData.capacityByMonth.length === 0 ? (
            <div style={{
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              gap: '12px'
            }}>
              <AlertCircle size={48} style={{ opacity: 0.5 }} />
              <div style={{ fontSize: '16px', fontWeight: '600' }}>No data available</div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>Try adjusting your date range or project filter</div>
            </div>
          ) : (
            <div style={{ height: '400px', position: 'relative' }}>
              <div style={{
                display: 'flex',
                alignItems: 'end',
                justifyContent: 'space-between',
                height: '320px',
                padding: '0 40px 20px 40px',
                borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
                position: 'relative'
              }}>
                {/* Y-axis labels */}
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}>
                  <span>200h</span>
                  <span>150h</span>
                  <span>100h</span>
                  <span>50h</span>
                  <span>0h</span>
                </div>

                {reportData.capacityByMonth.map((data, index) => (
                  <div key={`${data.month}-${data.year}`} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    position: 'relative'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'end',
                      gap: '6px',
                      height: '280px',
                      position: 'relative'
                    }}>
                      {/* Planned Hours Bar */}
                      <div
                        style={{
                          width: '24px',
                          height: `${(data.planned / 200) * 260}px`,
                          backgroundColor: '#3b82f6',
                          borderRadius: '6px 6px 0 0',
                          transition: 'all 0.5s ease',
                          transform: hoveredCard === 'chart' ? 'scaleY(1.02)' : 'scaleY(1)',
                          opacity: hoveredCard === 'chart' ? 0.9 : 0.8,
                          position: 'relative'
                        }}
                        title={`Planned: ${data.planned}h`}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '-25px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '10px',
                          color: '#3b82f6',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>{data.planned}h</div>
                      </div>
                      {/* Actual Hours Bar */}
                      <div
                        style={{
                          width: '24px',
                          height: `${(data.actual / 200) * 260}px`,
                          backgroundColor: getEfficiencyColor(data.efficiency),
                          borderRadius: '6px 6px 0 0',
                          transition: 'all 0.5s ease',
                          transform: hoveredCard === 'chart' ? 'scaleY(1.02)' : 'scaleY(1)',
                          position: 'relative'
                        }}
                        title={`Actual: ${data.actual}h`}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '-25px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '10px',
                          color: getEfficiencyColor(data.efficiency),
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>{data.actual}h</div>
                      </div>
                    </div>

                    {/* Efficiency percentage indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '30px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: getEfficiencyColor(data.efficiency),
                      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      border: `1px solid ${getEfficiencyColor(data.efficiency)}20`
                    }}>
                      {data.efficiency}%
                    </div>

                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }}>{data.month}</div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '32px',
                marginTop: '20px',
                padding: '16px',
                backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.5)',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '4px'
                  }}></div>
                  <span style={{
                    fontSize: '13px',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontWeight: '500'
                  }}>Planned Hours</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)',
                    borderRadius: '4px'
                  }}></div>
                  <span style={{
                    fontSize: '13px',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontWeight: '500'
                  }}>Actual Hours (Color = Efficiency)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div
        style={getCardStyle(hoveredCard === 'table')}
        onMouseEnter={() => setHoveredCard('table')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            margin: 0
          }}>Project Performance</h3>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: hoveredItem === 'download' ? '#2563eb' : '#3b82f6',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setHoveredItem('download')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {loading && !reportData ? (
          <TableSkeleton />
        ) : !reportData || !reportData.projectPerformance || reportData.projectPerformance.length === 0 ? (
          <div style={{
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            gap: '12px'
          }}>
            <AlertCircle size={48} style={{ opacity: 0.5 }} />
            <div style={{ fontSize: '16px', fontWeight: '600' }}>No project data available</div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              {selectedProject !== 'All Projects'
                ? 'No data found for the selected project'
                : 'No master plans found in this date range'}
            </div>
          </div>
        ) : (
          <>
            <div style={{
              overflowX: 'auto',
              borderRadius: '12px',
              border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)'
                  }}>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: isDarkMode ? '#e2e8f0' : '#374151',
                      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                    }}>Project</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: isDarkMode ? '#e2e8f0' : '#374151',
                      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                    }}>Activity Type</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: isDarkMode ? '#e2e8f0' : '#374151',
                      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                    }}>Planned Hours</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: isDarkMode ? '#e2e8f0' : '#374151',
                      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                    }}>Spent Hours</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: isDarkMode ? '#e2e8f0' : '#374151',
                      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
                    }}>Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.projectPerformance.map((project, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: hoveredItem === `row-${index}`
                          ? isDarkMode ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.02)'
                          : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={() => setHoveredItem(`row-${index}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <td style={{
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isDarkMode ? '#e2e8f0' : '#374151',
                        borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                      }}>{project.project}</td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: isDarkMode ? 'rgba(75,85,99,0.3)' : 'rgba(226,232,240,0.3)',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {project.activityType}
                        </span>
                      </td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#3b82f6',
                        borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                      }}>{project.plannedHours}h</td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: getEfficiencyColor(project.efficiency),
                        borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                      }}>{project.spentHours}h</td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: getEfficiencyColor(project.efficiency),
                        borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.1)' : '1px solid rgba(226,232,240,0.3)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}>
                          {project.efficiency}%
                          <div style={{
                            width: '40px',
                            height: '4px',
                            backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(project.efficiency, 100)}%`,
                              height: '100%',
                              backgroundColor: getEfficiencyColor(project.efficiency),
                              borderRadius: '2px',
                              transition: 'width 0.5s ease'
                            }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Summary */}
            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '14px',
                color: isDarkMode ? '#94a3b8' : '#64748b'
              }}>
                Showing {reportData.projectPerformance.length} of {reportData.projectPerformance.length} projects
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                <span style={{ color: isDarkMode ? '#e2e8f0' : '#374151' }}>
                  Total: {reportData.projectPerformance.reduce((sum, item) => sum + item.plannedHours, 0).toFixed(1)}h planned, {reportData.projectPerformance.reduce((sum, item) => sum + item.spentHours, 0).toFixed(1)}h spent
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminReports;