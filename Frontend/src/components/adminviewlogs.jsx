import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bell, User, Calendar, FolderOpen, Activity, Clock, TrendingUp, Loader, Search, X, Download, ArrowUpDown } from 'lucide-react';
import { apiFetch } from '../utils/api';
import Dropdown from '../components/Dropdown';
import DatePicker from '../components/DatePicker';

const AnimatedNumber = ({ value, decimals = 0 }) => {
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

  return <>{decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue)}</>;
};

// 🆕 Log Card Skeleton Component
const LogCardSkeleton = ({ isDarkMode }) => (
  <div style={{
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    borderRadius: '20px',
    padding: '24px',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
  }}>
    {[60, 80, 40, 100].map((width, i) => (
      <div key={i} style={{
        height: i === 3 ? '60px' : '20px',
        width: `${width}%`,
        background: isDarkMode
          ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
          : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '8px',
        marginBottom: '12px'
      }} />
    ))}
  </div>
);

const AdminViewLogs = () => {
  const [section, setSection] = useState('view-logs');
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest First');
  const [actuals, setActuals] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({
    category: '',
    project: '',
    startDate: '',
    endDate: '',
    hours: ''
  });

  const handleEditClick = (log) => {
    setEditingLog(log);
    setEditForm({
      category: log.category,
      project: log.project,
      startDate: log.date, // Already in DD/MM/YYYY format
      endDate: log.dateEnd, // Already in DD/MM/YYYY format
      hours: log.hours.toString()
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editForm.hours) {
      alert('Please enter hours');
      return;
    }

    try {
      // Convert DD/MM/YYYY to YYYY-MM-DD for API
      const formatForAPI = (dateStr) => {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
      };

      const response = await apiFetch(`/actuals/${editingLog.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: editForm.category, // Send existing values
          project: editForm.project,
          startDate: formatForAPI(editForm.startDate),
          endDate: formatForAPI(editForm.endDate),
          hours: editForm.hours // Only this is editable
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update entry');
      }

      alert('Entry updated successfully!');
      setShowEditModal(false);
      setEditingLog(null);

      // Refresh the actuals list
      const fetchResponse = await apiFetch('/actuals', {
        credentials: 'include'
      });

      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setActuals(data);
      }
    } catch (err) {
      console.error('Edit error:', err);
      alert(err.message || 'Failed to update entry');
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingLog(null);
    setEditForm({
      category: '',
      project: '',
      startDate: '',
      endDate: '',
      hours: ''
    });
  };


  const sortOptions = [
    'Newest First',
    'Oldest First',
    'Most Hours',
    'Least Hours',
    'Project A-Z',
    'Project Z-A'
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    weeklyHours: 0,
    capacityUtilization: 0,
    projectHours: 0
  });
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    department: ''
  });

  const sectionToggleRef = useRef(null);
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  // Fetch actuals data
  useEffect(() => {
    const fetchActuals = async () => {
      try {
        setLoading(true);
        const response = await apiFetch('/actuals', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch actuals');
        }

        const data = await response.json();
        setActuals(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching actuals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActuals();
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch('/user/profile', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, []);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiFetch('/actuals/stats', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (sectionToggleRef.current && isSectionOpen) {
      const rect = sectionToggleRef.current.getBoundingClientRect();
      setSectionDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isSectionOpen]);

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

  // Helper function to assign colors to projects
  const getProjectColor = (project) => {
    const colors = {
      'JRET': '#3b82f6',
      'MaxCap': '#10b981',
      'Analytics': '#f59e0b',
      'Training': '#8b5cf6',
      'Research': '#ec4899',
      'Development': '#06b6d4',
      'default': '#64748b'
    };
    return colors[project] || colors.default;
  };

  // Helper function to get category icon color
  const getCategoryColor = (category) => {
    const colors = {
      'Project': '#3b82f6',
      'Admin': '#10b981',
      'Training': '#f59e0b',
      'Meeting': '#8b5cf6',
      'Leave': '#ef4444',
      'default': '#64748b'
    };
    return colors[category] || colors.default;
  };

  // Transform actuals to display format
  const transformedActuals = actuals.map(actual => ({
    id: actual.Id,
    date: new Date(actual.StartDate).toLocaleDateString('en-GB'),
    dateEnd: new Date(actual.EndDate).toLocaleDateString('en-GB'),
    project: actual.Project || actual.Category,
    projectColor: actual.Project ? getProjectColor(actual.Project) : getCategoryColor(actual.Category),
    category: actual.Category,
    hours: Number(actual.Hours) || 0,
    manDays: (parseFloat(actual.Hours) / 8).toFixed(2),
    createdAt: new Date(actual.CreatedAt).toLocaleString('en-GB'),
    updatedAt: actual.UpdatedAt ? new Date(actual.UpdatedAt).toLocaleString('en-GB') : null,
    isEdited: actual.UpdatedAt && new Date(actual.UpdatedAt).getTime() !== new Date(actual.CreatedAt).getTime()
  }));

  const projects = [...new Set(transformedActuals.map(log => log.project).filter(Boolean))];
  const categories = [...new Set(transformedActuals.map(log => log.category))];

  const filteredLogs = transformedActuals.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toString().includes(searchQuery);

    const matchesProject = !filterProject ||
      filterProject === 'All Projects/Operations/Admin' ||
      log.project === filterProject;

    const matchesCategory = !filterCategory ||
      filterCategory === 'All Categories' ||
      log.category === filterCategory;

    return matchesSearch && matchesProject && matchesCategory;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    // Map display value to sort logic
    const sortMapping = {
      'Newest First': 'newest',
      'Oldest First': 'oldest',
      'Most Hours': 'most-hours',
      'Least Hours': 'least-hours',
      'Project A-Z': 'project-az',
      'Project Z-A': 'project-za'
    };

    const actualSort = sortMapping[sortBy] || 'newest';

    switch (actualSort) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'most-hours':
        return b.hours - a.hours;
      case 'least-hours':
        return a.hours - b.hours;
      case 'project-az':
        return a.project.localeCompare(b.project);
      case 'project-za':
        return b.project.localeCompare(a.project);
      default:
        return 0;
    }
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
    try {
      localStorage.setItem('darkMode', (!isDarkMode).toString());
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const handleSectionChange = (newSection) => {
    setSection(newSection);
    setIsSectionOpen(false);

    if (newSection === 'actuals') {
      window.location.href = '/adminactuals';
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Project', 'Category', 'Start Date', 'End Date', 'Hours', 'Man-Days', 'Created At'];
    const rows = sortedLogs.map(log => [
      log.id,
      `"${log.project}"`, // Wrap in quotes for CSV safety
      log.category,
      log.date,
      log.dateEnd,
      log.hours.toFixed(1),
      log.manDays,
      `"${log.createdAt}"` // Wrap in quotes for CSV safety
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `actuals-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getSectionTitle = () => {
    return section === 'actuals' ? 'Actuals' : 'Logs';
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
      
      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-6px);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
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

      @keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

      
      .floating {
        animation: float 3s ease-in-out infinite;
      }
      
      .spinning {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
    /* Number input spinner styling */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      opacity: 1;
      cursor: pointer;
      height: 40px;
      ${isDarkMode ? `
        background-color: #6b7280;
        border-left: 1px solid #4b5563;
      ` : `
        background-color: #e5e7eb;
        border-left: 1px solid #d1d5db;
      `}
    }

    input[type="number"]::-webkit-inner-spin-button:hover,
    input[type="number"]::-webkit-outer-spin-button:hover {
      background-color: ${isDarkMode ? '#9ca3af' : '#cbd5e1'};
    }
    
    /* Firefox */
    input[type="number"] {
      -moz-appearance: textfield;
    }
  `;
    document.head.appendChild(spinnerStyle);
    return () => document.head.removeChild(spinnerStyle);
  }, [isDarkMode]);

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
      color: isOpen || isHovered ? '#3b82f6' : isDarkMode ? '#94a3b8' : '#64748b'
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
    filtersContainer: {
      display: 'flex',
      gap: '20px',
      marginBottom: '32px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    filterLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transition: 'all 0.3s ease'
    },
    filterSelect: {
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e2e8f0',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '150px',
      outline: 'none'
    },
    statsRow: {
      display: 'flex',
      gap: '20px',
      marginBottom: '32px',
      flexWrap: 'wrap'
    },
    statCard: (color, isHovered) => ({
      flex: '1',
      minWidth: '200px',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: isHovered ? '0 12px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)',
      transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)',
      borderLeft: `4px solid ${color}`
    }),
    statIcon: {
      marginBottom: '12px',
      color: '#3b82f6'
    },
    statLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '800',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    logsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
      gap: '24px'
    },
    logCard: (isHovered) => ({
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: isHovered ? '0 12px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)',
      transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)',
      position: 'relative',
      overflow: 'hidden'
    }),
    cardHeader: {
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    cardNumber: {
      fontSize: '12px',
      fontWeight: '700',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
      padding: '4px 8px',
      borderRadius: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    projectInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    },
    projectBadge: (color) => ({
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0
    }),
    projectName: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    categoryBadge: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      backgroundColor: isDarkMode ? '#4b5563' : '#f1f5f9',
      padding: '4px 8px',
      borderRadius: '6px',
      marginLeft: 'auto'
    },
    dateInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: isDarkMode ? '#e2e8f0' : '#64748b',
      marginBottom: '16px'
    },
    hoursDisplay: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      padding: '16px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '12px'
    },
    hoursItem: {
      textAlign: 'center',
      flex: 1
    },
    hoursLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    hoursValue: (color) => ({
      fontSize: '20px',
      fontWeight: '700',
      color: color || '#3b82f6'
    }),
    hoursDivider: {
      width: '1px',
      height: '30px',
      backgroundColor: isDarkMode ? '#6b7280' : '#d1d5db',
      margin: '0 16px'
    },
    createdInfo: {
      marginTop: '16px',
      padding: '12px',
      backgroundColor: isDarkMode ? '#4b556350' : '#f8fafc50',
      borderRadius: '8px',
      borderLeft: `3px solid ${isDarkMode ? '#6b7280' : '#d1d5db'}`
    },
    createdLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    createdText: {
      fontSize: '13px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      lineHeight: '1.4'
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
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: '20px'
    },
    loadingText: {
      fontSize: '18px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    errorContainer: {
      backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
      color: isDarkMode ? '#fca5a5' : '#991b1b',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '20px',
      border: isDarkMode ? '1px solid #991b1b' : '1px solid #fca5a5'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    emptyStateIcon: {
      marginBottom: '16px',
      opacity: 0.5
    },
    emptyStateText: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '8px'
    },
    emptyStateSubtext: {
      fontSize: '14px',
      opacity: 0.8
    },
    searchContainer: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '12px',
      padding: '12px 16px',
      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e2e8f0',
      marginBottom: '24px',
      transition: 'all 0.3s ease',
      maxWidth: '500px'
    },
    searchInput: {
      flex: 1,
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: '14px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      outline: 'none',
      fontFamily: '"Montserrat", sans-serif'
    },
    exportButton: (isHovered) => ({
      padding: '12px 20px',
      borderRadius: '12px',
      border: '2px solid #10b981',
      backgroundColor: isHovered ? '#10b981' : 'transparent',
      color: isHovered ? '#fff' : '#10b981',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 8px 25px rgba(16,185,129,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
      marginLeft: 'auto'
    }),
    controlsRow: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '20px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    editButton: (isHovered) => ({
      position: 'absolute',
      top: '16px',
      right: '16px',
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
      color: '#3b82f6',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }),
    editedBadge: {
      fontSize: '11px',
      fontWeight: '700',
      color: '#3b82f6',
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
      padding: '4px 8px',
      borderRadius: '6px',
      marginLeft: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.98)' : 'rgba(255,255,255,0.98)',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '500px',
      width: '100%',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(226,232,240,0.8)',
      boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      backdropFilter: 'blur(20px)'
    },
    modalHeader: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: isDarkMode ? '2px solid rgba(75,85,99,0.3)' : '2px solid rgba(226,232,240,0.5)'
    },
    formGroup: {
      marginBottom: '20px'
    },
    formLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      marginBottom: '8px'
    },
    formInput: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '2px solid #4b5563' : '2px solid #e2e8f0',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      fontSize: '14px',
      fontFamily: '"Montserrat", sans-serif',
      outline: 'none',
      transition: 'all 0.3s ease'
    },
    formActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    formButton: (variant, isHovered) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      border: variant === 'primary' ? 'none' : `2px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'}`,
      backgroundColor: variant === 'primary'
        ? (isHovered ? '#2563eb' : '#3b82f6')
        : (isHovered ? (isDarkMode ? '#4b5563' : '#f1f5f9') : 'transparent'),
      color: variant === 'primary' ? '#fff' : (isDarkMode ? '#e2e8f0' : '#374151'),
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isHovered && variant === 'primary' ? '0 8px 25px rgba(59,130,246,0.25)' : 'none'
    })
  };



  if (loading) {
    return (
      <div style={styles.page}>
        {/* Header - keep it visible even when loading */}
        <div style={styles.headerRow}>
          <div style={styles.headerLeft}>
            <div style={styles.header}>Logs</div>
          </div>
        </div>

        {/* Skeleton Stats */}
        <div style={styles.statsRow}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1,
              minWidth: '200px',
              backgroundColor: isDarkMode ? '#374151' : '#fff',
              borderRadius: '16px',
              padding: '24px',
              border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
            }}>
              <div style={{
                height: '80px',
                background: isDarkMode
                  ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
                  : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '8px'
              }} />
            </div>
          ))}
        </div>

        {/* Skeleton Cards */}
        <div style={styles.logsGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <LogCardSkeleton key={i} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>
    );
  }


  return (
    <div style={styles.page}>
      {/* Header with Dropdown */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <div
            ref={sectionToggleRef}
            style={styles.toggleViewContainer}
            onClick={() => setIsSectionOpen((prev) => !prev)}
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
            onClick={() => window.location.href = '/adminalerts'}
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
              }}
              onClick={() => window.location.href = '/adminprofile'}
            >
              <User size={20} />
            </button>

            {/* Profile Tooltip */}
            {showProfileTooltip && (
              <div
                style={styles.profileTooltip}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
              >
                <div style={styles.tooltipArrow}></div>
                <div style={styles.userInfo}>
                  <div style={styles.avatar}>
                    {user.firstName && user.lastName
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : '??'}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : 'Loading...'}
                    </div>
                    <div style={styles.userRole}>
                      {user.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` : 'User'} • {user.department || 'Loading...'}
                    </div>
                  </div>
                </div>
                <div style={styles.userStats}>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>{stats.totalHours || 0}</div>
                    <div style={styles.tooltipStatLabel}>Hours</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {stats.projectHours > 0 ? Math.ceil(stats.projectHours / 40) : 0}
                    </div>
                    <div style={styles.tooltipStatLabel}>Projects</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>{stats.capacityUtilization}%</div>
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
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {['actuals', 'view-logs'].map((sectionKey, idx) => (
              <div
                key={sectionKey}
                style={styles.blurOption(hoveredCard === `section-${idx}`)}
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
                {sectionKey === 'actuals' ? 'Actuals' : 'View Logs'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={styles.errorContainer}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={styles.searchContainer}>
        <Search size={20} style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }} />
        <input
          type="text"
          placeholder="Search by project, category, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        {searchQuery && (
          <X
            size={20}
            onClick={() => setSearchQuery('')}
            style={{ cursor: 'pointer', color: isDarkMode ? '#94a3b8' : '#64748b' }}
          />
        )}
      </div>

      {/* Filters */}
      <div style={styles.controlsRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Project:</label>
          <Dropdown
            value={filterProject}
            onChange={(value) => setFilterProject(value)}
            options={projects}
            placeholder="All Projects/Operations/Admin"
            isDarkMode={isDarkMode}
            compact={true}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Filter by Category:</label>
          <Dropdown
            value={filterCategory}
            onChange={(value) => setFilterCategory(value)}
            options={categories}
            placeholder="All Categories"
            isDarkMode={isDarkMode}
            compact={true}
          />
        </div>

        {/* 🆕 Sort Dropdown */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Sort by:</label>
          <Dropdown
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            options={sortOptions}
            placeholder="Select sort order..."
            isDarkMode={isDarkMode}
            searchable={false}
            compact={true}
          />
        </div>

        {/* 🆕 Export Button */}
        <button
          onClick={exportToCSV}
          style={styles.exportButton(hoveredCard === 'export')}
          onMouseEnter={() => setHoveredCard('export')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <Download size={16} />
          Export CSV ({sortedLogs.length})
        </button>
      </div>

      {/* Stats Overview */}
      <div style={styles.statsRow}>
        <div
          style={styles.statCard('#3b82f6', hoveredCard === 'total')}
          onMouseEnter={() => setHoveredCard('total')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <Activity size={24} />
          </div>
          <div style={styles.statLabel}>Total Entries</div>
          <div style={styles.statValue}>
            <AnimatedNumber value={sortedLogs.length} />
          </div>
        </div>
        <div
          style={styles.statCard('#10b981', hoveredCard === 'hours')}
          onMouseEnter={() => setHoveredCard('hours')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <Clock size={24} />
          </div>
          <div style={styles.statLabel}>Total Hours</div>
          <div style={styles.statValue}>
            <AnimatedNumber
              value={sortedLogs.reduce((sum, log) => sum + (log.hours || 0), 0)}
              decimals={1}
            />
          </div>
        </div>
        <div
          style={styles.statCard('#f59e0b', hoveredCard === 'mandays')}
          onMouseEnter={() => setHoveredCard('mandays')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div style={styles.statLabel}>Total Man-Days</div>
          <div style={styles.statValue}>
            <AnimatedNumber
              value={sortedLogs.reduce((sum, log) => sum + (log.hours || 0), 0) / 8}
              decimals={2}
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {sortedLogs.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>
            <FolderOpen size={64} />
          </div>
          <div style={styles.emptyStateText}>No logs found</div>
          <div style={styles.emptyStateSubtext}>
            {actuals.length === 0
              ? 'Start tracking your actuals to see them here'
              : 'Try adjusting your filters'}
          </div>
        </div>
      )}

      {/* Logs Grid */}
      <div style={styles.logsGrid}>
        {sortedLogs.map((log, index) => (
          <div
            key={log.id}
            style={styles.logCard(hoveredRow === index)}
            onMouseEnter={() => setHoveredRow(index)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            {/* Edit Button */}
            <button
              style={styles.editButton(hoveredCard === `edit-${log.id}`)}
              onMouseEnter={() => setHoveredCard(`edit-${log.id}`)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleEditClick(log)}
              title="Edit entry"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>

            {/* Card Header */}
            <div style={styles.cardHeader}>
              <div style={styles.cardNumber}>
                #{log.id}
                {log.isEdited && (
                  <span style={styles.editedBadge}>Edited by you</span>
                )}
              </div>
            </div>

            {/* Project/Category Info */}
            <div style={styles.projectInfo}>
              <div style={styles.projectBadge(log.projectColor)}></div>
              <div style={styles.projectName}>{log.project}</div>
              <div style={styles.categoryBadge}>{log.category}</div>
            </div>

            {/* Date Range */}
            <div style={styles.dateInfo}>
              <Calendar size={14} />
              {log.date === log.dateEnd ? log.date : `${log.date} - ${log.dateEnd}`}
            </div>

            {/* Hours Display */}
            <div style={styles.hoursDisplay}>
              <div style={styles.hoursItem}>
                <div style={styles.hoursLabel}>Hours</div>
                <div style={styles.hoursValue('#3b82f6')}>{log.hours.toFixed(1)}</div>
              </div>
              <div style={styles.hoursDivider}></div>
              <div style={styles.hoursItem}>
                <div style={styles.hoursLabel}>Man-Days</div>
                <div style={styles.hoursValue('#10b981')}>{log.manDays}</div>
              </div>
            </div>

            {/* Created At */}
            <div style={styles.createdInfo}>
              <div style={styles.createdLabel}>
                <Clock size={14} />
                Created
              </div>
              <div style={styles.createdText}>{log.createdAt}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Edit Modal */}
      {showEditModal && editingLog && (
        <div style={styles.modalOverlay} onClick={closeEditModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              Edit Entry #{editingLog.id}
            </div>

            {/* Read-only information */}
            <div style={{
              padding: '16px',
              backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
              borderRadius: '12px',
              marginBottom: '20px',
              border: isDarkMode ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.1)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '13px'
              }}>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    marginBottom: '4px'
                  }}>Category</div>
                  <div style={{
                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                    fontWeight: '500'
                  }}>{editForm.category}</div>
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    marginBottom: '4px'
                  }}>Project</div>
                  <div style={{
                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                    fontWeight: '500'
                  }}>{editForm.project || 'N/A'}</div>
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    marginBottom: '4px'
                  }}>Start Date</div>
                  <div style={{
                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                    fontWeight: '500'
                  }}>{editForm.startDate}</div>
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    marginBottom: '4px'
                  }}>End Date</div>
                  <div style={{
                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                    fontWeight: '500'
                  }}>{editForm.endDate}</div>
                </div>
              </div>
            </div>

            {/* Editable Hours field */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Hours (Editable)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                style={{
                  ...styles.formInput,
                  fontSize: '16px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}
                value={editForm.hours}
                onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                placeholder="Enter hours"
                autoFocus
              />
            </div>

            <div style={styles.formActions}>
              <button
                style={styles.formButton('secondary', hoveredCard === 'cancel-edit')}
                onMouseEnter={() => setHoveredCard('cancel-edit')}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={closeEditModal}
              >
                Cancel
              </button>
              <button
                style={styles.formButton('primary', hoveredCard === 'confirm-edit')}
                onMouseEnter={() => setHoveredCard('confirm-edit')}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={handleEditSubmit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminViewLogs;