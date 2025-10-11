import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, TrendingUp, Clock, Users, Activity, ChevronLeft, ChevronRight, Bell, User } from 'lucide-react';
import { useSidebar } from '../context/sidebarcontext';

const MiniCalendar = ({ isDarkMode }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  
  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const calendarDays = [];
  
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  const isToday = (day) => {
    return day === today.getDate() && 
          currentMonth === today.getMonth() && 
          currentYear === today.getFullYear();
  };
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  const calendarStyles = {
    container: {
      marginTop: '24px',
      padding: '20px',
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '0 8px'
    },
    monthYear: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      transition: 'all 0.3s ease'
    },
    navButton: (isHovered) => ({
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '8px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.2s ease',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }),
    weekDays: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px',
      marginBottom: '12px'
    },
    weekDay: {
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      padding: '8px 4px',
      textTransform: 'uppercase',
      transition: 'all 0.3s ease'
    },
    daysGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px'
    },
    day: (day, isToday, isHovered) => ({
      textAlign: 'center',
      padding: '12px 4px',
      fontSize: '14px',
      fontWeight: isToday ? '700' : '500',
      color: day ? (isToday ? '#fff' : isDarkMode ? '#e2e8f0' : '#374151') : 'transparent',
      backgroundColor: isToday ? '#3b82f6' : (isHovered ? 'rgba(59,130,246,0.1)' : 'transparent'),
      borderRadius: '8px',
      cursor: day ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      transform: isHovered && day ? 'scale(1.1)' : 'scale(1)',
      boxShadow: isToday ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
    })
  };
  
  return (
    <div style={calendarStyles.container}>
      <div style={calendarStyles.header}>
        <button 
          onClick={goToPreviousMonth}
          style={calendarStyles.navButton(hoveredDate === 'prev')}
          onMouseEnter={() => setHoveredDate('prev')}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={calendarStyles.monthYear}>
          {monthNames[currentMonth]} {currentYear}
        </div>
        <button 
          onClick={goToNextMonth}
          style={calendarStyles.navButton(hoveredDate === 'next')}
          onMouseEnter={() => setHoveredDate('next')}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div style={calendarStyles.weekDays}>
        {daysOfWeek.map((day, index) => (
          <div key={index} style={calendarStyles.weekDay}>
            {day}
          </div>
        ))}
      </div>
      
      <div style={calendarStyles.daysGrid}>
        {calendarDays.map((day, index) => (
          <div
            key={index}
            style={calendarStyles.day(day, isToday(day), hoveredDate === `day-${index}`)}
            onMouseEnter={() => day && setHoveredDate(`day-${index}`)}
            onMouseLeave={() => setHoveredDate(null)}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { collapsed } = useSidebar();
  const [view, setView] = useState('calendar');
  const [section, setSection] = useState('personal');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize dark mode from localStorage (only works outside Claude.ai)
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      // localStorage not available (e.g., in Claude.ai artifacts)
      return false;
    }
  });
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    weeklyHours: 0,
    capacityUtilization: 0,
    projectHours: 0,
    targetHours: 32
  });
  
  // Hover states
  const [isHovered, setIsHovered] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredStat, setHoveredStat] = useState(null);

  // Refs for better cleanup and tracking
  const sectionToggleRef = useRef(null);
  const statusToggleRef = useRef(null);
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);
  
  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

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
    pageStyle.setAttribute('data-component', 'admin-dashboard-background');
    
    const backgroundGradient = isDarkMode 
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      /* More specific targeting to avoid conflicts */
      .admin-dashboard-page {
        min-height: 100vh;
        background: ${backgroundGradient};
      }
      
      /* Target common parent containers more carefully */
      body {
        background: ${backgroundGradient} !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Ensure no gaps or borders */
      html, body, #root {
        margin: 0 !important;
        padding: 0 !important;
        background: ${backgroundGradient} !important;
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
      
      .table-row:hover {
        background-color: rgba(59,130,246,0.05) !important;
        transform: scale(1.01);
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
        const existingStyles = document.querySelectorAll('[data-component="admin-dashboard-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('🔄 Fetching user data from /user/profile...');
        const response = await fetch('http://localhost:3000/user/profile', {
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
          
          // Set default view based on role
          if (data.role === 'admin') {
            console.log('👑 Admin user detected - setting status view');
            setView('status');
          } else {
            console.log('👤 Member user detected - setting calendar view');
            setView('calendar');
          }
        } else {
          const errorData = await response.text();
          console.error('❌ Failed to fetch user data:', response.status, errorData);
          console.error('❌ Unable to load user profile. Please ensure you are logged in.');
          setUserData(null);
        }
      } catch (error) {
        console.error('💥 Error fetching user data:', error);
        console.error('💥 Network error. Please check your connection and try again.');
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (sectionToggleRef.current && isSectionOpen) {
      const rect = sectionToggleRef.current.getBoundingClientRect();
      setSectionDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isSectionOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sectionToggleRef.current && !sectionToggleRef.current.contains(event.target)) {
        setIsSectionOpen(false);
      }
      if (statusToggleRef.current && !statusToggleRef.current.contains(event.target)) {
        setIsOverlayOpen(false);
      }
    };

    if (isSectionOpen || isOverlayOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSectionOpen, isOverlayOpen]);

  // Add this with your other useEffects
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('📊 Fetching user stats...');
        const response = await fetch('http://localhost:3000/actuals/stats', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Stats received:', data);
          setStats(data);
        } else {
          console.error('❌ Failed to fetch stats');
        }
      } catch (error) {
        console.error('💥 Error fetching stats:', error);
      }
    };

    if (userData) {
      fetchStats();
    }
  }, [userData]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setShowProfileTooltip(false);
    
    // Save to localStorage (only works outside Claude.ai)
    try {
      localStorage.setItem('darkMode', newMode.toString());
    } catch (error) {
      // localStorage not available (e.g., in Claude.ai artifacts)
      console.log('Dark mode preference cannot be saved in this environment');
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '0',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      overflowY: 'auto',
      fontFamily: '"Montserrat", sans-serif',
      position: 'relative',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
      width: '100%'
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
      gap: '12px'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    header: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    },
    card: (isHovered) => ({
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.9)' : 'rgba(255,255,255,0.9)',
      borderRadius: '20px',
      padding: '28px',
      marginBottom: '28px',
      boxShadow: isHovered 
        ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.1)' 
        : '0 8px 25px rgba(0,0,0,0.08)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }),
    cardGlow: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)',
      opacity: 0,
      transition: 'opacity 0.4s ease',
      pointerEvents: 'none'
    },
    flexRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '32px',
      flexWrap: 'wrap'
    },
    statItem: (isHovered) => ({
      flex: 1,
      textAlign: 'center',
      padding: '20px',
      borderRadius: '16px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.05)' : 'transparent',
      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      position: 'relative'
    }),
    statLabel: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '8px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      transition: 'all 0.3s ease'
    },
    statValue: (isHovered) => ({
      fontSize: '36px',
      fontWeight: '800',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      textShadow: isHovered ? '0 4px 8px rgba(30,41,59,0.3)' : 'none'
    }),
    capacityValue: (isHovered) => ({
      fontSize: '36px',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }),
    statusFlex: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap',
      marginTop: '24px'
    },
    statusBox: (bgColor, isHovered) => ({
      flex: 1,
      background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)`,
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center',
      minWidth: '160px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      transform: isHovered ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
      boxShadow: isHovered 
        ? '0 12px 24px rgba(0,0,0,0.15)' 
        : '0 4px 12px rgba(0,0,0,0.08)',
      border: '1px solid rgba(255,255,255,0.5)',
      position: 'relative',
      overflow: 'hidden'
    }),
    statusTitle: {
      fontSize: '16px',
      fontWeight: '700',
      marginBottom: '8px',
      color: '#374151'
    },
    statusCount: {
      fontSize: '24px',
      fontWeight: '800',
      marginBottom: '8px',
      color: '#1f2937'
    },
    statusNote: {
      fontSize: '12px',
      color: '#6b7280',
      fontWeight: '500'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    },
    th: {
      textAlign: 'left',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      padding: '16px 12px',
      fontSize: '14px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      transition: 'all 0.3s ease'
    },
    td: {
      padding: '16px 12px',
      fontSize: '15px',
      color: isDarkMode ? '#e2e8f0' : '#1f2937',
      borderBottom: isDarkMode ? '1px solid #4b5563' : '1px solid #f1f5f9',
      transition: 'all 0.3s ease'
    },
    tableRow: {
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    },
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
    statusOverlay: {
      position: 'absolute',
      top: '100%',
      left: 0,
      zIndex: 9999,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.98)' : 'rgba(255,255,255,0.98)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
      padding: '12px 0',
      minWidth: '160px',
      border: isDarkMode ? '2px solid rgba(51,65,85,0.8)' : '2px solid rgba(255,255,255,0.8)',
      marginTop: '8px',
      animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'auto',
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
    toggleViewContainer: {
      fontSize: '18px',
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
    toggleViewContainerStatic: {
      fontSize: '18px',
      fontWeight: '700',
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
    floatingIcon: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      opacity: 0.1,
      fontSize: '48px',
      color: '#3b82f6'
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
    activityTitle: {
      marginBottom: '20px', 
      fontSize: '18px', 
      fontWeight: '700', 
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      transition: 'all 0.3s ease'
    },
    loadingSpinner: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      fontSize: '18px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    }
  };

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
    if (!userData) return 'Loading...';
    
    const firstName = userData.firstName || 'User';
    switch(section) {
      case 'personal':
        return `Welcome back, ${firstName}!`;
      case 'team':
        return 'Team Capacity Summary';
      case 'utilization':
        return 'Utilization Overview';
      default:
        return `Welcome back, ${firstName}!`;
    }
  };

  const isAdmin = userData?.role === 'admin';

  if (loading) {
    return (
      <div className="admin-dashboard-page" style={styles.page}>
        <div style={styles.loadingSpinner}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="admin-dashboard-page" style={styles.page}>
        <div style={styles.loadingSpinner}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
            <div>Unable to load user profile</div>
            <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
              Please ensure you are logged in and try again
            </div>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page" style={styles.page}>
      <div style={{ padding: '30px', background: 'transparent', minHeight: '100vh' }}>
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          {/* Admin gets dropdown, Member gets static title */}
          {isAdmin ? (
            <div
              ref={sectionToggleRef}
              style={styles.toggleViewContainer}
              onClick={() => setIsSectionOpen((prev) => !prev)}
              onMouseEnter={() => setIsSectionHovered(true)}
              onMouseLeave={() => setIsSectionHovered(false)}
              className="floating"
            >
              <span style={styles.header}>{getSectionTitle()}</span>
              <ChevronDown style={styles.chevron(isSectionOpen, isSectionHovered)} size={20} />
            </div>
          ) : (
            <div style={styles.toggleViewContainerStatic} className="floating">
              <span style={styles.header}>{getSectionTitle()}</span>
            </div>
          )}
        </div>

        <div style={styles.headerRight}>
          {/* Alerts Button - Only for admins */}
          {isAdmin && (
            <button
              style={styles.topButton(hoveredCard === 'alerts')}
              onMouseEnter={() => setHoveredCard('alerts')}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => {
                window.location.href = '/adminalerts';
              }}
            >
              <Bell size={20} />
              <div style={styles.notificationBadge}></div>
            </button>
          )}

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
              onClick={() => {
                const profileRoute = isAdmin ? '/adminprofile' : '/memberprofile';
                window.location.href = profileRoute;
              }}
            >
              <User size={20} />
            </button>

            {/* Profile Tooltip */}
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

      {/* Admin Section Dropdown */}
      {isAdmin && isSectionOpen && (
        <div 
          style={styles.sectionOverlay}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {['personal', 'team', 'utilization'].map((sectionKey, idx) => (
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
                {sectionKey === 'personal' ? 'Personal Dashboard' : 
                sectionKey === 'team' ? 'Team Capacity' : 'Utilization Overview'}
              </div>
            ))}
          </div>
        </div>
      )}

        {/* Stats Card */}
        <div
          style={styles.card(hoveredCard === 'stats')}
          onMouseEnter={() => setHoveredCard('stats')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>
          <div style={styles.floatingIcon}>
            <TrendingUp />
          </div>
          <div style={styles.flexRow}>
            <div
              style={styles.statItem(hoveredStat === 'hours')}
              onMouseEnter={() => setHoveredStat('hours')}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div style={styles.statLabel}>
                <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                Hours Logged This Week
              </div>
              <div style={styles.statValue(hoveredStat === 'hours')}>
                {stats.weeklyHours}
              </div>
            </div>
            <div
              style={styles.statItem(hoveredStat === 'capacity')}
              onMouseEnter={() => setHoveredStat('capacity')}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div style={styles.statLabel}>
                <Activity size={16} style={{ display: 'inline', marginRight: '4px' }} />
                Capacity Utilization
              </div>
              <div style={styles.capacityValue(hoveredStat === 'capacity')}>
                {stats.capacityUtilization}%
              </div>
            </div>
          </div>
        </div>

      {/* Status/Calendar Card */}
      <div 
        style={styles.card(hoveredCard === 'status')}
        onMouseEnter={() => setHoveredCard('status')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.cardGlow}></div>
        <div style={styles.floatingIcon}>
          <Users />
        </div>
        <div style={{ position: 'relative' }}>
          {/* Admin gets dropdown toggle, Member gets static "Mini Calendar" */}
          {isAdmin ? (
            <div
              ref={statusToggleRef}
              style={styles.toggleViewContainer}
              onClick={() => setIsOverlayOpen((prev) => !prev)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {view === 'status' ? 'Status' : 'Mini Calendar'}
              <ChevronDown style={styles.chevron(isOverlayOpen, isHovered)} size={18} />
            </div>
          ) : (
            <div style={styles.toggleViewContainerStatic}>
              Mini Calendar
            </div>
          )}
          
          {/* Admin Status/Calendar Toggle Dropdown */}
          {isAdmin && isOverlayOpen && (
            <div 
              style={styles.statusOverlay}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div 
                style={styles.blurOption(hoveredCard === 'view-0')} 
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setView('status'); 
                  setIsOverlayOpen(false); 
                }}
                onMouseEnter={() => setHoveredCard('view-0')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                Status
              </div>
              <div 
                style={styles.blurOption(hoveredCard === 'view-1')} 
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setView('calendar'); 
                  setIsOverlayOpen(false); 
                }}
                onMouseEnter={() => setHoveredCard('view-1')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                Mini Calendar
              </div>
            </div>
          )}
        </div>

        {/* Render Status (Admin only) or Calendar */}
        {view === 'status' && isAdmin ? (
          <div style={styles.statusFlex}>
            {[
              { title: 'Overloaded', count: '0/3', note: 'Users working over capacity', color: '#fee2e2' },
              { title: 'Underutilized', count: '1/3', note: 'Users working under capacity', color: '#fef9c3' },
              { title: 'Optimal', count: '0/3', note: 'Users working at optimal capacity', color: '#dcfce7' }
            ].map((status, idx) => (
              <div 
                key={idx}
                style={styles.statusBox(status.color, hoveredCard === `status-${idx}`)}
                onMouseEnter={() => setHoveredCard(`status-${idx}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={styles.statusTitle}>{status.title}</div>
                <div style={styles.statusCount}>{status.count}</div>
                <div style={styles.statusNote}>{status.note}</div>
              </div>
            ))}
          </div>
        ) : (
          <MiniCalendar isDarkMode={isDarkMode} />
        )}
      </div>

      {/* Activity Card */}
      <div 
        style={styles.card(hoveredCard === 'activity')}
        onMouseEnter={() => setHoveredCard('activity')}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <div style={styles.cardGlow}></div>
        <div style={styles.activityTitle}>
          Recent Activity
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Project</th>
              <th style={styles.th}>Activity type</th>
              <th style={styles.th}>Time spent</th>
            </tr>
          </thead>
          <tbody>
            <tr className="table-row" style={styles.tableRow}>
              <td style={styles.td}>28/04/2025</td>
              <td style={styles.td}>JRET</td>
              <td style={styles.td}>Meeting</td>
              <td style={styles.td}>35 m</td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;