// src/components/ui/Dropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

const Dropdown = ({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Select option...',
  isDarkMode,
  disabled = false,
  searchable = false,
  groupedOptions = null, // { "Group Name": ["option1", "option2"] }
  allowCustom = false,
  customPlaceholder = 'Enter custom value...',
  compact = false,
  hasIcon = false,
  variant = 'blue'
}) => {

  const colors = {
    blue: {
      primary: '#3b82f6',
      hover: 'rgba(59,130,246,0.1)',
      border: 'rgba(59,130,246,0.3)',
      shadow: 'rgba(59,130,246,0.1)'
    },
    purple: {
      primary: '#8b5cf6',
      hover: 'rgba(139,92,246,0.1)',
      border: 'rgba(139,92,246,0.3)',
      shadow: 'rgba(139,92,246,0.1)'
    }
  };

  const theme = colors[variant];

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredOption, setHoveredOption] = useState(null);
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
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
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable
    ? options.filter(opt =>
      opt.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : options;

  const filteredGroupedOptions = groupedOptions && searchable
    ? Object.keys(groupedOptions).reduce((acc, group) => {
      const filtered = groupedOptions[group].filter(opt =>
        opt.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[group] = filtered;
      }
      return acc;
    }, {})
    : groupedOptions;

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
    setIsCustomInput(false);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsOpen(false);
      setIsCustomInput(false);
      setCustomValue('');
    }
  };

  const clearValue = (e) => {
    e.stopPropagation();
    onChange('');
    setIsCustomInput(false);
    setCustomValue('');
  };

  const getDisplayValue = () => {
    if (isCustomInput) return customPlaceholder;
    if (!value) return placeholder;
    return value;
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

    select: (isFocused) => ({
      width: '100%',
      padding: compact ? '12px 16px' : '16px 20px',
      paddingLeft: hasIcon ? '44px' : (compact ? '16px' : '20px'),// 🆕 Smaller padding when compact
      paddingRight: value ? (compact ? '70px' : '80px') : (compact ? '45px' : '50px'),
      borderRadius: compact ? '12px' : '12px',  // Keep same
      border: isFocused
        ? `2px solid ${theme.primary}`
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
      boxShadow: isFocused ? `0 0 0 3px ${theme.shadow}` : '0 2px 4px rgba(0,0,0,0.02)',
      opacity: disabled ? 0.6 : 1,
      userSelect: 'none',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
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
    icon: (isOpen) => ({
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
    }),
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
      right: 0,
      zIndex: 1000,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)',
      animation: 'slideIn 0.2s ease-out',
      maxHeight: '320px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    },
    searchContainer: {
      padding: '12px',
      borderBottom: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)'
    },
    searchInput: {
      width: '100%',
      padding: '10px 12px',
      paddingLeft: '36px',
      borderRadius: '8px',
      border: isDarkMode ? '1px solid #4b5563' : '1px solid #e2e8f0',
      fontSize: '14px',
      backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      outline: 'none',
      transition: 'all 0.2s ease'
    },
    searchIcon: {
      position: 'absolute',
      left: '24px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      pointerEvents: 'none'
    },
    optionsList: {
      overflowY: 'auto',
      padding: '8px',
      flex: 1
    },
    option: (isHovered, isSelected) => ({
      padding: '12px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: isSelected ? '600' : '500',
      transition: 'all 0.2s ease',
      backgroundColor: isHovered
        ? theme.hover
        : 'transparent',
      color: isSelected
        ? theme.primary
        : isDarkMode
          ? '#e2e8f0'
          : '#374151',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderLeft: isHovered ? `3px solid ${theme.primary}` : '3px solid transparent',
      marginBottom: '2px'
    }),
    groupLabel: {
      padding: '8px 16px',
      fontSize: '12px',
      fontWeight: '700',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginTop: '8px'
    },
    customInputContainer: {
      padding: '12px',
      borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)'
    },
    customInput: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: isDarkMode ? '1px solid #4b5563' : '1px solid #e2e8f0',
      fontSize: '14px',
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      outline: 'none',
      transition: 'all 0.2s ease',
      marginBottom: '8px'
    },
    customButton: (isHovered) => ({
      width: '100%',
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? theme.primary : theme.hover,
      color: isHovered ? '#fff' : theme.primary,
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }),
    noResults: {
      padding: '20px',
      textAlign: 'center',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '14px'
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

      <div style={styles.container} ref={dropdownRef}>
        {label && <label style={styles.label}>{label}</label>}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isCustomInput ? (
            <input
              type="text"
              autoFocus
              value={customValue}
              placeholder={customPlaceholder}
              style={styles.select(true)}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSubmit();
                }
                if (e.key === 'Escape') {
                  setIsCustomInput(false);
                  setCustomValue('');
                }
              }}
              onBlur={() => {
                if (customValue.trim()) {
                  handleCustomSubmit();
                } else {
                  setIsCustomInput(false);
                }
              }}
            />
          ) : (
            <div
              onClick={() => !disabled && setIsOpen(!isOpen)}
              style={styles.select(isOpen)}
            >
              {getDisplayValue()}
            </div>
          )}

          <div style={styles.iconContainer}>
            {value && !disabled && (
              <X
                size={18}
                style={styles.clearButton(hoveredOption === 'clear')}
                onMouseEnter={() => setHoveredOption('clear')}
                onMouseLeave={() => setHoveredOption(null)}
                onClick={clearValue}
              />
            )}
            {!isCustomInput && <ChevronDown size={18} style={styles.icon(isOpen)} />}
          </div>
        </div>

        {isOpen && !disabled && (
          <div style={styles.dropdown}>
            {searchable && (
              <div style={styles.searchContainer}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={styles.searchIcon} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    style={styles.searchInput}
                  />
                </div>
              </div>
            )}

            <div style={styles.optionsList}>
              {groupedOptions ? (
                <>
                  {Object.keys(filteredGroupedOptions || {}).length === 0 && (
                    <div style={styles.noResults}>No results found</div>
                  )}
                  {Object.keys(filteredGroupedOptions || {}).map((group) => (
                    <div key={group}>
                      <div style={styles.groupLabel}>{group}</div>
                      {filteredGroupedOptions[group].map((option, index) => (
                        <div
                          key={`${group}-${index}`}
                          onClick={() => handleSelect(option)}
                          onMouseEnter={() => setHoveredOption(`${group}-${index}`)}
                          onMouseLeave={() => setHoveredOption(null)}
                          style={styles.option(
                            hoveredOption === `${group}-${index}`,
                            value === option
                          )}
                        >
                          {option}
                          {value === option && <Check size={16} />}
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {filteredOptions.length === 0 && (
                    <div style={styles.noResults}>No results found</div>
                  )}
                  {filteredOptions.map((option, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHoveredOption(index)}
                      onMouseLeave={() => setHoveredOption(null)}
                      style={styles.option(
                        hoveredOption === index,
                        value === option
                      )}
                    >
                      {option}
                      {value === option && <Check size={16} />}
                    </div>
                  ))}
                </>
              )}

              {allowCustom && !isCustomInput && (
                <div
                  onClick={() => {
                    setIsCustomInput(true);
                    setCustomValue('');
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHoveredOption('custom')}
                  onMouseLeave={() => setHoveredOption(null)}
                  style={{
                    ...styles.option(hoveredOption === 'custom', false),
                    borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)',
                    marginTop: '8px',
                    color: theme.primary,
                    fontWeight: '600'
                  }}
                >
                  ➕ Custom / Other
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dropdown;