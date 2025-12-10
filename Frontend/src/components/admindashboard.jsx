import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, TrendingUp, Clock, Users, Activity, ChevronLeft, ChevronRight, Bell, User, X, MapPin, Video } from 'lucide-react';
import { useSidebar } from '../context/sidebarcontext';
import WorkloadStatusModal from '../components/WorkloadStatusModal';

// Calendar Popup Modal Component
const CalendarPopup = ({ isOpen, onClose, selectedDate, events, isDarkMode }) => {
  if (!isOpen) return null;

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  const formatTime = (dateTime) =>
    new Date(dateTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const getDuration = (start, end) => {
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Filter events for selected date
  const dayEvents = events.filter(evt => {
    const evtDate = new Date(evt.start.dateTime).toDateString();
    const selected = new Date(selectedDate).toDateString();
    return evtDate === selected;
  }).sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

  const popupStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-out',
      padding: '20px'
    },
    modal: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
      width: '90%',
      maxWidth: '700px',
      maxHeight: '85vh',
      overflow: 'hidden',
      animation: 'slideUp 0.3s ease-out',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)'
    },
    header: {
      padding: '24px 28px',
      borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px'
    },
    headerDate: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    content: {
      padding: '24px 28px',
      maxHeight: 'calc(85vh - 100px)',
      overflowY: 'auto'
    },
    noEvents: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    noEventsIcon: {
      fontSize: '48px',
      marginBottom: '16px',
      opacity: 0.5
    },
    eventCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      borderLeft: '4px solid #3b82f6',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    },
    eventTime: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#3b82f6',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    eventTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px',
      lineHeight: '1.4'
    },
    eventDetails: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontSize: '13px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    eventDetail: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    eventBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
      color: '#3b82f6',
      marginTop: '8px'
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .event-card:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 20px rgba(59,130,246,0.15);
        }
      `}</style>
      
      <div style={popupStyles.overlay} onClick={onClose}>
        <div style={popupStyles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={popupStyles.header}>
            <div>
              <div style={popupStyles.headerTitle}>
                {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'}
              </div>
              <div style={popupStyles.headerDate}>
                {formatDate(selectedDate)}
              </div>
            </div>
            <button 
              style={popupStyles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={24} />
            </button>
          </div>
          
          <div style={popupStyles.content}>
            {dayEvents.length === 0 ? (
              <div style={popupStyles.noEvents}>
                <div style={popupStyles.noEventsIcon}>📅</div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  No events scheduled
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  You're free this day!
                </div>
              </div>
            ) : (
              dayEvents.map((event, index) => (
                <div 
                  key={index}
                  className="event-card"
                  style={popupStyles.eventCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={popupStyles.eventTime}>
                    <Clock size={14} />
                    {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontSize: '12px', 
                      opacity: 0.7 
                    }}>
                      {getDuration(event.start.dateTime, event.end.dateTime)}
                    </span>
                  </div>
                  
                  <div style={popupStyles.eventTitle}>
                    {event.subject || 'Untitled Event'}
                  </div>
                  
                  <div style={popupStyles.eventDetails}>
                    {event.location?.displayName && (
                      <div style={popupStyles.eventDetail}>
                        <MapPin size={14} />
                        {event.location.displayName}
                      </div>
                    )}
                    
                    {event.isOnlineMeeting && (
                      <div style={popupStyles.eventBadge}>
                        <Video size={14} />
                        Online Meeting
                      </div>
                    )}
                    
                    {event.organizer?.emailAddress?.name && (
                      <div style={popupStyles.eventDetail}>
                        <User size={14} />
                        Organized by {event.organizer.emailAddress.name}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const MiniCalendar = ({ isDarkMode, events = [], onDateClick }) => {
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

  const hasEvent = (day) => {
    if (!day) return false;
    const checkDate = new Date(currentYear, currentMonth, day).toDateString();
    return events.some(evt =>
      new Date(evt.start.dateTime).toDateString() === checkDate
    );
  };

  const getEventCount = (day) => {
    if (!day) return 0;
    const checkDate = new Date(currentYear, currentMonth, day).toDateString();
    return events.filter(evt =>
      new Date(evt.start.dateTime).toDateString() === checkDate
    ).length;
  };

  const handleDateClick = (day) => {
    if (!day) return;
    const clickedDate = new Date(currentYear, currentMonth, day);
    onDateClick(clickedDate);
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
    day: (day, isToday, isHovered, hasEvents) => ({
      textAlign: 'center',
      padding: '12px 4px',
      fontSize: '14px',
      fontWeight: isToday ? '700' : '500',
      color: day ? (isToday ? '#fff' : isDarkMode ? '#e2e8f0' : '#374151') : 'transparent',
      border: hasEvents ? "2px solid #3b82f6" : "none",
      backgroundColor: hasEvents
        ? "rgba(59,130,246,0.15)"
        : isToday ? "#3b82f6" : (isHovered ? "rgba(59,130,246,0.1)" : "transparent"),
      borderRadius: '8px',
      cursor: day ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      transform: isHovered && day ? 'scale(1.1)' : 'scale(1)',
      boxShadow: isToday ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
      position: 'relative'
    }),
    eventDot: {
      position: 'absolute',
      bottom: '4px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '8px',
      color: '#3b82f6'
    }
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
        {calendarDays.map((day, index) => {
          const eventCount = getEventCount(day);
          return (
            <div
              key={index}
              onClick={() => handleDateClick(day)}
              style={calendarStyles.day(
                day, 
                isToday(day), 
                hoveredDate === `day-${index}`,
                hasEvent(day)
              )}
              onMouseEnter={() => day && setHoveredDate(`day-${index}`)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {day}
              {eventCount > 0 && (
                <div style={calendarStyles.eventDot}>
                  {'●'.repeat(Math.min(eventCount, 3))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { collapsed } = useSidebar();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [view, setView] = useState('calendar');
  const [section, setSection] = useState('personal');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
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

  const [isHovered, setIsHovered] = useState(false);
  const [isSectionHovered, setIsSectionHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredStat, setHoveredStat] = useState(null);
  const [selectedStatusData, setSelectedStatusData] = useState(null); // ← ADD THIS
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const sectionToggleRef = useRef(null);
  const statusToggleRef = useRef(null);
  const injectedStyleRef = useRef(null);
  const originalBodyStyleRef = useRef(null);

  const [sectionDropdownPosition, setSectionDropdownPosition] = useState({ top: 64, left: 0 });

  const [workloadStatus, setWorkloadStatus] = useState({
    summary: { totalUsers: 0, overworked: 0, underutilized: 0, optimal: 0 },
    users: [],
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (!originalBodyStyleRef.current) {
      originalBodyStyleRef.current = {
        background: document.body.style.background,
        margin: document.body.style.margin,
        padding: document.body.style.padding
      };
    }

    if (injectedStyleRef.current) {
      document.head.removeChild(injectedStyleRef.current);
    }

    const pageStyle = document.createElement('style');
    pageStyle.setAttribute('data-component', 'admin-dashboard-background');

    const backgroundGradient = isDarkMode
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';

    pageStyle.textContent = `
      .admin-dashboard-page {
        min-height: 100vh;
        background: ${backgroundGradient};
      }
      
      body {
        background: ${backgroundGradient} !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      html, body, #root {
        margin: 0 !important;
        padding: 0 !important;
        background: ${backgroundGradient} !important;
      }
      
      #root > div:first-child,
      .app > div:first-child,
      .main-content,
      .page-container {
        background: transparent !important;
        min-height: 100vh;
      }
      
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
      
      * {
        transition: background-color 0.3s ease, background 0.3s ease;
      }
    `;

    document.head.appendChild(pageStyle);
    injectedStyleRef.current = pageStyle;

    return () => {
      if (injectedStyleRef.current && document.head.contains(injectedStyleRef.current)) {
        document.head.removeChild(injectedStyleRef.current);
        injectedStyleRef.current = null;
      }

      if (originalBodyStyleRef.current) {
        const existingStyles = document.querySelectorAll('[data-component="admin-dashboard-background"]');
        if (existingStyles.length === 0) {
          Object.assign(document.body.style, originalBodyStyleRef.current);
        }
      }
    };
  }, [isDarkMode]);

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
          setUserData(null);
        }
      } catch (error) {
        console.error('💥 Error fetching user data:', error);
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

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        console.log("🔵 Starting calendar fetch...");
        console.log("🔵 User data exists:", !!userData);
        console.log("🔵 Fetching from: http://localhost:3000/calendar/events");
        
        const res = await fetch("http://localhost:3000/calendar/events", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });

        console.log("🟣 Calendar response status:", res.status);

        if (res.ok) {
          const data = await res.json();
          console.log("✅ Calendar data received:", data);
          console.log("📅 Number of events:", data.events?.length || 0);
          
          setCalendarEvents(data.events || []);
        } else {
          const errorText = await res.text();
          console.error("❌ Calendar fetch failed:", res.status);
          console.error("❌ Error response:", errorText);
        }
      } catch (err) {
        console.error("💥 Calendar fetch error:", err);
        console.error("💥 Error details:", err.message);
      }
    };

    console.log("🔍 Calendar useEffect running, userData:", userData);
    
    if (userData) {
      console.log("✅ User data available, fetching calendar...");
      fetchCalendar();
    } else {
      console.log("⏳ Waiting for user data...");
    }
  }, [userData]);

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

  useEffect(() => {
    const fetchWorkloadStatus = async () => {
      if (!userData || userData.role !== 'admin') return;

      try {
        const response = await fetch('http://localhost:3000/api/workload-status', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setWorkloadStatus(data);
        }
      } catch (error) {
        console.error('Error fetching workload status:', error);
      }
    };

    if (userData) {
      fetchWorkloadStatus();
    }
  }, [userData]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setShowProfileTooltip(false);

    try {
      localStorage.setItem('darkMode', newMode.toString());
    } catch (error) {
      console.log('Dark mode preference cannot be saved in this environment');
    }
  };

  const handleDateClick = (date) => {
    setSelectedCalendarDate(date);
    setIsCalendarPopupOpen(true);
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
    statusBox: (bgColor, darkBgColor, isHovered) => ({
      flex: 1,
      background: isDarkMode 
        ? `linear-gradient(135deg, ${darkBgColor} 0%, ${darkBgColor}dd 100%)`
        : `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)`,
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
      border: isDarkMode 
        ? '1px solid rgba(75,85,99,0.5)' 
        : '1px solid rgba(255,255,255,0.5)',
      position: 'relative',
      overflow: 'hidden'
    }),
    statusTitle: {
      fontSize: '16px',
      fontWeight: '700',
      marginBottom: '8px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transition: 'all 0.3s ease'
    },
    statusCount: {
      fontSize: '24px',
      fontWeight: '800',
      marginBottom: '8px',
      color: isDarkMode ? '#f1f5f9' : '#1f2937',
      transition: 'all 0.3s ease'
    },
    statusNote: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#6b7280',
      fontWeight: '500',
      transition: 'all 0.3s ease'
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

  const handleStatusBoxClick = (statusData) => {
    setSelectedStatusData(statusData);
    setIsStatusModalOpen(true);
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
    switch (section) {
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
                      <div style={styles.tooltipStatNumber}>{stats.weeklyHours}</div>
                      <div style={styles.tooltipStatLabel}>Hours</div>
                    </div>
                    <div style={styles.tooltipStatItem}>
                      <div style={styles.tooltipStatNumber}>{stats.projectHours > 0 ? Math.ceil(stats.projectHours / 40) : 0}</div>
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

          {view === 'status' && isAdmin ? (
            <div style={styles.statusFlex} key={`status-cards-${isDarkMode}`}>
              {[
                { 
                  title: 'Overloaded', 
                  count: `${workloadStatus.summary.overworked}/${workloadStatus.summary.totalUsers}`,
                  users: workloadStatus.users?.filter(u => u.status === 'Overworked') || [], 
                  note: 'Users working over capacity', 
                  color: '#fee2e2',
                  darkColor: 'rgba(239,68,68,0.15)'
                },
                { 
                  title: 'Underutilized', 
                  count: `${workloadStatus.summary.underutilized}/${workloadStatus.summary.totalUsers}`,
                  users: workloadStatus.users?.filter(u => u.status === 'Underutilized') || [],  
                  note: 'Users working under capacity', 
                  color: '#fef9c3',
                  darkColor: 'rgba(234,179,8,0.15)'
                },
                { 
                  title: 'Optimal', 
                  count: `${workloadStatus.summary.optimal}/${workloadStatus.summary.totalUsers}`,
                  users: workloadStatus.users?.filter(u => u.status === 'Optimal') || [],  
                  note: 'Users working at optimal capacity', 
                  color: '#dcfce7',
                  darkColor: 'rgba(34,197,94,0.15)'
                }
              ].map((status, idx) => (
                <div
                  key={`${idx}-${isDarkMode}`}
                  style={styles.statusBox(status.color, status.darkColor, hoveredCard === `status-${idx}`)}
                  onMouseEnter={() => setHoveredCard(`status-${idx}`)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleStatusBoxClick(status)}
                >
                  {isDarkMode && (
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: status.title === 'Overloaded' 
                        ? 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)'
                        : status.title === 'Underutilized'
                        ? 'radial-gradient(circle, rgba(234,179,8,0.1) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)',
                      opacity: hoveredCard === `status-${idx}` ? 1 : 0.5,
                      transition: 'opacity 0.4s ease',
                      pointerEvents: 'none'
                    }}></div>
                  )}
                  <div style={styles.statusTitle}>{status.title}</div>
                  <div style={styles.statusCount}>{status.count}</div>
                  <div style={styles.statusNote}>{status.note}</div>
                </div>
              ))}
            </div>
          ) : (
            <MiniCalendar 
              isDarkMode={isDarkMode} 
              events={calendarEvents}
              onDateClick={handleDateClick}
            />
          )}
        </div>

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
                <th style={styles.th}>Meeting</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const now = new Date();
                const pastMeetings = calendarEvents
                  .filter(event => new Date(event.end.dateTime) < now)
                  .sort((a, b) => new Date(b.start.dateTime) - new Date(a.start.dateTime))
                  .slice(0, 10);

                if (pastMeetings.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" style={{
                        ...styles.td,
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        fontStyle: 'italic'
                      }}>
                        No recent meetings found
                      </td>
                    </tr>
                  );
                }

                return pastMeetings.map((event, index) => {
                  // Force Singapore timezone for start & end
                  const startDate = new Date(event.start.dateTime);
                  const endDate = new Date(event.end.dateTime)

                  const formattedDate = startDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  });

                  const durationMs = endDate - startDate;
                  const hours = Math.floor(durationMs / (1000 * 60 * 60));
                  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                  let meetingType = 'Meeting';
                  let typeIcon = '👥';
                  let typeColor = isDarkMode ? '#94a3b8' : '#64748b';

                  if (event.isOnlineMeeting) {
                    meetingType = 'Online Meeting';
                    typeIcon = '🎥';
                    typeColor = '#3b82f6';
                  } else if (event.location?.displayName) {
                    meetingType = 'In-Person';
                    typeIcon = '📍';
                    typeColor = '#10b981';
                  }

                  const subject = event.subject?.toLowerCase() || '';
                  if (subject.includes('call') || subject.includes('phone')) {
                    meetingType = 'Call';
                    typeIcon = '📞';
                    typeColor = '#8b5cf6';
                  }

                  return (
                    <tr 
                      key={index}
                      className="table-row" 
                      style={{
                        ...styles.tableRow,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedCalendarDate(startDate);
                        setIsCalendarPopupOpen(true);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.05)';
                        e.currentTarget.style.transform = 'scale(1.01)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <td style={styles.td}>{formattedDate}</td>
                      <td style={{
                        ...styles.td,
                        fontWeight: '600',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {event.subject || 'Untitled Meeting'}
                      </td>
                      <td style={{
                        ...styles.td,
                        color: typeColor,
                        fontWeight: '600'
                      }}>
                        <span style={{ marginRight: '6px' }}>{typeIcon}</span>
                        {meetingType}
                      </td>
                      <td style={styles.td}>{durationStr}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendar Popup Modal */}
      <CalendarPopup
        isOpen={isCalendarPopupOpen}
        onClose={() => setIsCalendarPopupOpen(false)}
        selectedDate={selectedCalendarDate}
        events={calendarEvents}
        isDarkMode={isDarkMode}
      />

      {/* Workload Status Modal */}
      <WorkloadStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        statusData={selectedStatusData}
        isDarkMode={isDarkMode}
      />
    </div>

  );
};

export default AdminDashboard;