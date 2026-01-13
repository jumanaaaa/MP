// src/components/ui/DatePicker.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DatePicker = ({ 
  value, 
  onChange, 
  label, 
  isDarkMode, 
  placeholder = 'Select date',
  disabled = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const [viewMode, setViewMode] = useState('days'); // 'days', 'months', 'years'
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(new Date().getFullYear() / 12) * 12);
  const pickerRef = useRef(null);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
        setViewMode('days'); // Reset view mode when closing
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value));
    } else {
      setCurrentDate(new Date()); // Reset to current month when cleared
    }
  }, [value]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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

  const isSelected = (day) => {
    if (!day || !selectedDate) return false;
    return day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear();
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear();
  };

  const handleDateSelect = (day) => {
    if (!day) return;
    const selected = new Date(currentYear, currentMonth, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
    setViewMode('days');
  };

  const handleMonthSelect = (monthIndex) => {
    setCurrentDate(new Date(currentYear, monthIndex, 1));
    setViewMode('days');
  };

  const handleYearSelect = (year) => {
    setCurrentDate(new Date(year, currentMonth, 1));
    setViewMode('months');
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentMonth, 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentMonth, 1));
  };

  const goToPreviousYearRange = () => {
    setYearRangeStart(yearRangeStart - 12);
  };

  const goToNextYearRange = () => {
    setYearRangeStart(yearRangeStart + 12);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const toggleViewMode = () => {
    if (viewMode === 'days') {
      setViewMode('months');
    } else if (viewMode === 'months') {
      setViewMode('years');
      setYearRangeStart(Math.floor(currentYear / 12) * 12);
    }
  };

  const styles = {
    container: {
      position: 'relative',
      width: '100%',
      marginBottom: compact ? '16px' : '20px'
    },
    label: {
      fontSize: compact ? '14px' : '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      marginBottom: compact ? '8px' : '8px',
      display: 'block',
      transition: 'all 0.3s ease'
    },
    
    input: (isFocused) => ({
      width: '100%',
      padding: compact ? '12px 16px' : '16px 20px',
      paddingRight: value ? (compact ? '70px' : '80px') : (compact ? '45px' : '50px'),
      borderRadius: compact ? '12px' : '12px',
      border: isFocused 
        ? '2px solid #3b82f6' 
        : isDarkMode 
          ? (compact ? '1px solid rgba(75,85,99,0.3)' : '2px solid #4b5563')
          : (compact ? '1px solid rgba(226,232,240,0.5)' : '2px solid #e2e8f0'),
      fontSize: compact ? '14px' : '16px',
      transition: 'all 0.3s ease',
      backgroundColor: disabled 
        ? (isDarkMode ? '#374151' : '#f3f4f6') 
        : (isDarkMode ? (compact ? 'rgba(51,65,85,0.5)' : '#4b5563') : '#fff'),
      color: isDarkMode ? '#e2e8f0' : '#374151',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      boxShadow: isFocused ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
      opacity: disabled ? 0.6 : 1,
      userSelect: 'none'
    }),
    
    iconContainer: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      pointerEvents: 'none'
    },
    icon: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      pointerEvents: 'auto',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    clearButton: (isHovered) => ({
      color: isHovered ? '#ef4444' : (isDarkMode ? '#94a3b8' : '#64748b'),
      pointerEvents: 'auto',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }),
    dropdown: {
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: 0,
      zIndex: 9999,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      padding: '20px',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)',
      animation: 'slideIn 0.2s ease-out',
      minWidth: '320px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    monthYear: {
      fontSize: '16px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      cursor: 'pointer',
      padding: '6px 12px',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
      userSelect: 'none'
    },
    monthYearHover: {
      backgroundColor: 'rgba(59,130,246,0.1)'
    },
    navButton: (isHovered) => ({
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '6px',
      borderRadius: '6px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.2s ease',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    weekDays: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px',
      marginBottom: '8px'
    },
    weekDay: {
      textAlign: 'center',
      fontSize: '11px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      padding: '6px 0',
      textTransform: 'uppercase'
    },
    daysGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px'
    },
    monthsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px'
    },
    yearsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px'
    },
    day: (day, isSelected, isToday, isHovered) => ({
      textAlign: 'center',
      padding: '10px',
      fontSize: '14px',
      fontWeight: isSelected || isToday ? '700' : '500',
      color: day
        ? isSelected
          ? '#fff'
          : isToday
            ? '#3b82f6'
            : isDarkMode
              ? '#e2e8f0'
              : '#374151'
        : 'transparent',
      backgroundColor: isSelected
        ? '#3b82f6'
        : isToday
          ? 'rgba(59,130,246,0.1)'
          : isHovered && day
            ? 'rgba(59,130,246,0.05)'
            : 'transparent',
      borderRadius: '8px',
      cursor: day ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      transform: isHovered && day ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
    }),
    monthItem: (isCurrentMonth, isHovered) => ({
      textAlign: 'center',
      padding: '12px',
      fontSize: '14px',
      fontWeight: isCurrentMonth ? '700' : '500',
      color: isCurrentMonth
        ? '#3b82f6'
        : isDarkMode
          ? '#e2e8f0'
          : '#374151',
      backgroundColor: isCurrentMonth
        ? 'rgba(59,130,246,0.1)'
        : isHovered
          ? 'rgba(59,130,246,0.05)'
          : 'transparent',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      transform: isHovered ? 'scale(1.05)' : 'scale(1)'
    }),
    yearItem: (isCurrentYear, isHovered) => ({
      textAlign: 'center',
      padding: '12px',
      fontSize: '14px',
      fontWeight: isCurrentYear ? '700' : '500',
      color: isCurrentYear
        ? '#3b82f6'
        : isDarkMode
          ? '#e2e8f0'
          : '#374151',
      backgroundColor: isCurrentYear
        ? 'rgba(59,130,246,0.1)'
        : isHovered
          ? 'rgba(59,130,246,0.05)'
          : 'transparent',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      transform: isHovered ? 'scale(1.05)' : 'scale(1)'
    })
  };

  const renderDaysView = () => (
    <>
      <div style={styles.weekDays}>
        {daysOfWeek.map((day, index) => (
          <div key={index} style={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>

      <div style={styles.daysGrid}>
        {calendarDays.map((day, index) => (
          <div
            key={index}
            onClick={() => handleDateSelect(day)}
            style={styles.day(
              day,
              isSelected(day),
              isToday(day),
              hoveredDate === `day-${index}`
            )}
            onMouseEnter={() => day && setHoveredDate(`day-${index}`)}
            onMouseLeave={() => setHoveredDate(null)}
          >
            {day}
          </div>
        ))}
      </div>
    </>
  );

  const renderMonthsView = () => (
    <div style={styles.monthsGrid}>
      {monthNamesShort.map((month, index) => (
        <div
          key={index}
          onClick={() => handleMonthSelect(index)}
          style={styles.monthItem(
            index === currentMonth,
            hoveredDate === `month-${index}`
          )}
          onMouseEnter={() => setHoveredDate(`month-${index}`)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          {month}
        </div>
      ))}
    </div>
  );

  const renderYearsView = () => {
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(yearRangeStart + i);
    }

    return (
      <div style={styles.yearsGrid}>
        {years.map((year) => (
          <div
            key={year}
            onClick={() => handleYearSelect(year)}
            style={styles.yearItem(
              year === currentYear,
              hoveredDate === `year-${year}`
            )}
            onMouseEnter={() => setHoveredDate(`year-${year}`)}
            onMouseLeave={() => setHoveredDate(null)}
          >
            {year}
          </div>
        ))}
      </div>
    );
  };

  const getHeaderText = () => {
    if (viewMode === 'days') {
      return `${monthNames[currentMonth]} ${currentYear}`;
    } else if (viewMode === 'months') {
      return currentYear;
    } else {
      return `${yearRangeStart} - ${yearRangeStart + 11}`;
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'days') {
      goToPreviousMonth();
    } else if (viewMode === 'months') {
      goToPreviousYear();
    } else {
      goToPreviousYearRange();
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      goToNextMonth();
    } else if (viewMode === 'months') {
      goToNextYear();
    } else {
      goToNextYearRange();
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={styles.container} ref={pickerRef}>
        {label && <label style={styles.label}>{label}</label>}
        
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            value={formatDisplayDate(value)}
            placeholder={placeholder}
            readOnly
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            style={styles.input(isOpen)}
          />
          
          <div style={styles.iconContainer}>
            {value && !disabled && (
              <X
                size={18}
                style={styles.clearButton(hoveredDate === 'clear')}
                onMouseEnter={() => setHoveredDate('clear')}
                onMouseLeave={() => setHoveredDate(null)}
                onClick={clearDate}
              />
            )}
            <Calendar size={18} style={styles.icon} />
          </div>
        </div>

        {isOpen && !disabled && (
          <div style={styles.dropdown}>
            <div style={styles.header}>
              <button
                onClick={handlePrevious}
                style={styles.navButton(hoveredDate === 'prev')}
                onMouseEnter={() => setHoveredDate('prev')}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <ChevronLeft size={18} />
              </button>
              
              <div 
                style={{
                  ...styles.monthYear,
                  ...(hoveredDate === 'header' ? styles.monthYearHover : {})
                }}
                onClick={toggleViewMode}
                onMouseEnter={() => setHoveredDate('header')}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {getHeaderText()}
              </div>
              
              <button
                onClick={handleNext}
                style={styles.navButton(hoveredDate === 'next')}
                onMouseEnter={() => setHoveredDate('next')}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {viewMode === 'days' && renderDaysView()}
            {viewMode === 'months' && renderMonthsView()}
            {viewMode === 'years' && renderYearsView()}
          </div>
        )}
      </div>
    </>
  );
};

export default DatePicker;