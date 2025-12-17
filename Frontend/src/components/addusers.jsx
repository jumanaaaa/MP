import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Calendar, Building, Users, Lock,
  ArrowLeft, Save, AlertTriangle, CheckCircle, Eye, EyeOff,
  Briefcase, UserCheck, X, Bell
} from 'lucide-react';

const AddUsersPage = () => {
  const dateRef = React.useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    department: '',
    project: '',
    team: '',
    password: '',
    confirmPassword: '',
    role: 'member',
    deviceName: '',
    assignedUnder: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [hoveredButton, setHoveredButton] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [userData, setUserData] = useState({
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    email: 'admin@example.com',
    department: 'Engineering'
  });

  // Backend-aligned departments
  const departments = ['DTO', 'P&A', 'PPC', 'Finance', 'A&I', 'Marketing'];
  const roles = ['admin', 'member'];

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('http://localhost:3000/user/profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const [assignableUsers, setAssignableUsers] = useState([]);

  useEffect(() => {
    const fetchAssignableUsers = async () => {
      try {
        const res = await fetch('http://localhost:3000/user/list', {
          credentials: 'include'
        });
        const data = await res.json();
        setAssignableUsers(data.users || []);
      } catch (err) {
        console.error('Failed to fetch assignable users', err);
      }
    };

    fetchAssignableUsers();
  }, []);

  // Validation functions
  const validateForm = () => {
    const newErrors = {};

    // First Name
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    // Last Name
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Date of Birth
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'Invalid date format (YYYY-MM-DD)';
    }

    // Phone Number (Singapore format: starts with 6, 8, or 9, 8 digits total)
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[689]\d{7}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must start with 6, 8, or 9 and be 8 digits long';
    }

    // Department
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    // Project
    if (!formData.project.trim()) {
      newErrors.project = 'Project is required';
    }

    // Team
    if (!formData.team.trim()) {
      newErrors.team = 'Team is required';
    }

    // Password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Confirm Password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setApiError('Please fix the errors in the form');
      setTimeout(() => setApiError(''), 5000);
      return;
    }

    setLoading(true);
    setApiError('');
    setApiSuccess('');

    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...submitData } = formData;

      const response = await fetch('http://localhost:3000/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (response.ok) {
        setApiSuccess('User created successfully! Redirecting...');
        console.log('User created successfully:', data);

        // Redirect to users management page after 2 seconds
        setTimeout(() => {
          window.location.href = '/users';
        }, 2000);
      } else {
        setApiError(data.message || 'Failed to create user');
        setTimeout(() => setApiError(''), 5000);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setApiError('Network error. Please check your connection.');
      setTimeout(() => setApiError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.location.href = '/users';
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '30px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif',
      transition: 'all 0.3s ease'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    backButton: (isHovered) => ({
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
      justifyContent: 'center'
    }),
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
      alignItems: 'center'
    },
    userAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#3b82f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: '600',
      fontSize: '14px',
      marginRight: '12px'
    },
    userDetails: {
      flex: 1
    },
    userName: {
      fontWeight: '600',
      marginBottom: '2px',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    userRole: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'all 0.3s ease'
    },
    userStats: {
      borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)',
      paddingTop: '12px',
      marginTop: '12px',
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
    formCard: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.3s ease',
      marginBottom: '24px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
      marginBottom: '24px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    required: {
      color: '#ef4444',
      fontSize: '14px'
    },
    inputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    input: (hasError) => ({
      width: '100%',
      padding: '12px 16px',
      paddingLeft: '44px',
      borderRadius: '10px',
      border: hasError
        ? '2px solid #ef4444'
        : isDarkMode
          ? '2px solid rgba(75,85,99,0.5)'
          : '2px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      letterSpacing: '0.1px',
      fontFamily: 'Montserrat',
      outline: 'none',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    }),
    passwordInput: {
      fontFamily: 'Montserrat',
      fontSize: '14px',
      letterSpacing: '0.1px',
    },
    inputIcon: {
      position: 'absolute',
      left: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      pointerEvents: 'none',
      zIndex: 5
    },
    select: (hasError) => ({
      width: '100%',
      padding: '12px 16px',
      paddingLeft: '44px',
      borderRadius: '10px',
      border: hasError
        ? '2px solid #ef4444'
        : isDarkMode
          ? '2px solid rgba(75,85,99,0.5)'
          : '2px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${isDarkMode ? '%2394a3b8' : '%2364748b'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center',
      backgroundSize: '20px',
      paddingRight: '44px'
    }),
    passwordToggle: {
      position: 'absolute',
      right: '14px',
      cursor: 'pointer',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      transition: 'color 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px'
    },
    errorText: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: '500'
    },
    helperText: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '12px',
      marginTop: '4px',
      fontStyle: 'italic'
    },
    section: {
      marginTop: '32px',
      paddingTop: '32px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '32px'
    },
    button: (variant, isHovered, isDisabled) => ({
      padding: '12px 24px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transform: isHovered && !isDisabled ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
      opacity: isDisabled ? 0.6 : 1,
      ...(variant === 'primary' && {
        background: isDisabled
          ? isDarkMode ? '#4b5563' : '#cbd5e1'
          : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: '#fff',
        boxShadow: isHovered && !isDisabled
          ? '0 12px 24px rgba(59,130,246,0.4)'
          : '0 4px 12px rgba(59,130,246,0.2)'
      }),
      ...(variant === 'secondary' && {
        backgroundColor: isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
        color: isDarkMode ? '#e2e8f0' : '#64748b',
        boxShadow: isHovered
          ? '0 8px 20px rgba(0,0,0,0.15)'
          : '0 4px 12px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(10px)'
      })
    }),
    successMessage: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#10b981',
      color: '#fff',
      padding: '16px 24px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      boxShadow: '0 8px 25px rgba(16,185,129,0.3)',
      zIndex: 1000,
      animation: 'slideIn 0.5s ease-out'
    },
    errorMessage: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#ef4444',
      color: '#fff',
      padding: '16px 24px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      boxShadow: '0 8px 25px rgba(239,68,68,0.3)',
      zIndex: 1000,
      animation: 'slideIn 0.5s ease-out',
      maxWidth: '400px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#fff',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto'
    }
  };

  // Add CSS animations
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
      
      .floating {
        animation: float 3s ease-in-out infinite;
      }
      
      input:focus, select:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
      }

      input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0;
        display: none;
      }

      input[type="date"]::-webkit-inner-spin-button,
      input[type="date"]::-webkit-clear-button {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={styles.page}>
      {/* Success Notification */}
      {apiSuccess && (
        <div style={styles.successMessage}>
          <CheckCircle size={20} />
          {apiSuccess}
        </div>
      )}

      {/* Error Notification */}
      {apiError && (
        <div style={styles.errorMessage}>
          <AlertTriangle size={20} />
          {apiError}
          <button
            style={styles.closeButton}
            onClick={() => setApiError('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton(hoveredButton === 'back')}
            onMouseEnter={() => setHoveredButton('back')}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={handleCancel}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title} className="floating">Add New User</h1>
        </div>
        <div style={styles.headerRight}>
          {/* Admin Alerts Button */}
          <button
            style={styles.topButton(hoveredButton === 'alerts')}
            onMouseEnter={() => setHoveredButton('alerts')}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={() => {
              window.location.href = '/adminalerts';
            }}
          >
            <Bell size={20} />
            <div style={styles.notificationBadge}></div>
          </button>

          {/* Admin Profile Button */}
          <div style={{ position: 'relative' }}>
            <button
              style={styles.topButton(hoveredButton === 'profile')}
              onMouseEnter={() => {
                setHoveredButton('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => {
                setHoveredButton(null);
              }}
              onClick={() => {
                window.location.href = '/adminprofile';
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
                  <div style={styles.userAvatar}>
                    {userData.firstName?.[0]}{userData.lastName?.[0]}
                  </div>
                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {userData.firstName} {userData.lastName}
                    </div>
                    <div style={styles.userRole}>
                      {userData.role === 'admin' ? 'Admin' : 'Member'} • {userData.department}
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
                  onClick={() => {
                    setIsDarkMode(!isDarkMode);
                    try {
                      localStorage.setItem('darkMode', (!isDarkMode).toString());
                    } catch (error) {
                      console.log('LocalStorage not available');
                    }
                  }}
                >
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={styles.formCard}>
          {/* Personal Information Section */}
          <div>
            <div style={styles.sectionTitle}>
              <User size={20} />
              Personal Information
            </div>
            <div style={styles.formGrid}>
              {/* First Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  First Name <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <User size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.firstName)}
                    type="text"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                  />
                </div>
                {errors.firstName && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.firstName}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Last Name <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <User size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.lastName)}
                    type="text"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                  />
                </div>
                {errors.lastName && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.lastName}
                  </div>
                )}
              </div>

              {/* Email */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.email)}
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                {errors.email && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Phone Number <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Phone size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.phoneNumber)}
                    type="tel"
                    placeholder="81234567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  />
                </div>
                {errors.phoneNumber && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.phoneNumber}
                  </div>
                )}
                {!errors.phoneNumber && (
                  <div style={styles.helperText}>
                    Must start with 6, 8, or 9 and be 8 digits long
                  </div>
                )}
              </div>

              {/* Date of Birth */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Date of Birth <span style={styles.required}>*</span>
                </label>
                <div
                  style={styles.inputWrapper}
                  onClick={() => dateRef.current?.showPicker()}
                >
                  <Calendar size={18} style={styles.inputIcon} />
                  <input
                    ref={dateRef}
                    style={styles.input(errors.dateOfBirth)}
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  />
                </div>
                {errors.dateOfBirth && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.dateOfBirth}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Work Information Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Building size={20} />
              Work Information
            </div>
            <div style={styles.formGrid}>
              {/* Department */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Department <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Building size={18} style={styles.inputIcon} />
                  <select
                    style={styles.select(errors.department)}
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                {errors.department && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.department}
                  </div>
                )}
              </div>

              {/* Project */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Project <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Briefcase size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.project)}
                    type="text"
                    placeholder="Enter project name"
                    value={formData.project}
                    onChange={(e) => handleChange('project', e.target.value)}
                  />
                </div>
                {errors.project && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.project}
                  </div>
                )}
              </div>

              {/* Team */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Team <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Users size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.team)}
                    type="text"
                    placeholder="Enter team name"
                    value={formData.team}
                    onChange={(e) => handleChange('team', e.target.value)}
                  />
                </div>
                {errors.team && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.team}
                  </div>
                )}
              </div>

              {/* Role */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Role <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <UserCheck size={18} style={styles.inputIcon} />
                  <select
                    style={styles.select(errors.role)}
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.role && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.role}
                  </div>
                )}
              </div>

              {/* Assigned Under */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Assigned Under
                </label>
                <div style={styles.inputWrapper}>
                  <UserCheck size={18} style={styles.inputIcon} />
                  <select
                    style={styles.select(false)}
                    value={formData.assignedUnder}
                    onChange={(e) => handleChange('assignedUnder', e.target.value)}
                  >
                    <option value="">None</option>
                    {assignableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.helperText}>
                  Optional: Assign reporting / approval line
                </div>
              </div>

              {/* Device Name - ADD THIS NEW FIELD */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Device Name
                </label>
                <div style={styles.inputWrapper}>
                  <Briefcase size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.deviceName)}
                    type="text"
                    placeholder="IHRP-WLT-XXX"
                    value={formData.deviceName}
                    onChange={(e) => handleChange('deviceName', e.target.value)}
                  />
                </div>
                {errors.deviceName && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.deviceName}
                  </div>
                )}
                {!errors.deviceName && (
                  <div style={styles.helperText}>
                    Optional: Assign a device to this user
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Lock size={20} />
              Security
            </div>
            <div style={styles.formGrid}>
              {/* Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Password <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.inputIcon} />
                  <input
                    style={{
                      ...styles.input(errors.confirmPassword),
                      ...styles.passwordInput
                    }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                  />
                  <div
                    style={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
                {errors.password && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.password}
                  </div>
                )}
                {!errors.password && (
                  <div style={styles.helperText}>
                    Must be at least 8 characters long
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Confirm Password <span style={styles.required}>*</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.inputIcon} />
                  <input
                    style={styles.input(errors.confirmPassword)}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  />
                  <div
                    style={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
                {errors.confirmPassword && (
                  <div style={styles.errorText}>
                    <AlertTriangle size={12} />
                    {errors.confirmPassword}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={styles.buttonGroup}>
            <button
              type="button"
              style={styles.button('secondary', hoveredButton === 'cancel', false)}
              onMouseEnter={() => setHoveredButton('cancel')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.button('primary', hoveredButton === 'submit', loading)}
              onMouseEnter={() => setHoveredButton('submit')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={loading}
            >
              <Save size={18} />
              {loading ? 'Creating User...' : 'Create User'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddUsersPage;