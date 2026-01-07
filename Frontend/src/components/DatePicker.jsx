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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const pickerRef = useRef(null);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
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

  const styles = {
    container: {
      position: 'relative',
      width: '100%'
    },
    label: {
      fontSize: compact ? '14px' : '14px',  // Keep same
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      marginBottom: compact ? '8px' : '8px',  // Keep same
      display: 'block',
      transition: 'all 0.3s ease'
    },
    
    input: (isFocused) => ({
      width: '100%',
      padding: compact ? '12px 16px' : '16px 20px',  // 🆕 Smaller padding when compact
      paddingRight: value ? (compact ? '70px' : '80px') : (compact ? '45px' : '50px'),
      borderRadius: compact ? '12px' : '12px',  // Keep same
      border: isFocused 
        ? '2px solid #3b82f6' 
        : isDarkMode 
          ? (compact ? '1px solid rgba(75,85,99,0.3)' : '2px solid #4b5563')  // 🆕 Thinner border when compact
          : (compact ? '1px solid rgba(226,232,240,0.5)' : '2px solid #e2e8f0'),
      fontSize: compact ? '14px' : '16px',  // 🆕 Smaller text when compact
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
      zIndex: 1000,
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
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
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
    })
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
                onClick={goToPreviousMonth}
                style={styles.navButton(hoveredDate === 'prev')}
                onMouseEnter={() => setHoveredDate('prev')}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <ChevronLeft size={18} />
              </button>
              
              <div style={styles.monthYear}>
                {monthNames[currentMonth]} {currentYear}
              </div>
              
              <button
                onClick={goToNextMonth}
                style={styles.navButton(hoveredDate === 'next')}
                onMouseEnter={() => setHoveredDate('next')}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <ChevronRight size={18} />
              </button>
            </div>

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
          </div>
        )}
      </div>
    </>
  );
};

export default DatePicker;