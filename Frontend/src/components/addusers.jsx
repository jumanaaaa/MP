import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Calendar, Building, Users, Briefcase, Check, AlertCircle, Lock, Shield } from 'lucide-react';

const AddUserPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode to match sidebar
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
    role: 'member'
  });
  const [errors, setErrors] = useState({});
  const [hoveredField, setHoveredField] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      console.log('Submitting user data to localhost:3000/signup:', formData);
      
      const response = await fetch('http://localhost:3000/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('User created successfully:', result);
        setSubmitSuccess(true);
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            dateOfBirth: '',
            phoneNumber: '',
            department: '',
            project: '',
            team: '',
            password: '',
            role: 'member'
          });
          setSubmitSuccess(false);
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('Failed to create user:', errorData);
        setSubmitError(errorData.message || 'Failed to create user. Please try again.');
        setTimeout(() => setSubmitError(''), 5000);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setSubmitError('Network error. Please check your connection and try again.');
      setTimeout(() => setSubmitError(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
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
      alignItems: 'center',
      gap: '16px',
      marginBottom: '32px'
    },
    backButton: {
      padding: '12px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    formContainer: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '24px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)',
      maxWidth: '800px',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden'
    },
    formGlow: {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)',
      pointerEvents: 'none'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    },
    fieldGroup: {
      position: 'relative'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    inputContainer: {
      position: 'relative'
    },
    baseInput: {
      width: '100%',
      padding: '16px 20px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '500',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      backdropFilter: 'blur(10px)'
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
    buttonContainer: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      marginTop: '32px'
    },
    submitButton: {
      padding: '16px 48px',
      borderRadius: '12px',
      border: 'none',
      background: isSubmitting 
        ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: '#fff',
      fontSize: '16px',
      fontWeight: '700',
      cursor: isSubmitting ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 4px 12px rgba(59,130,246,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: '160px',
      justifyContent: 'center'
    },
    cancelButton: {
      padding: '16px 48px',
      borderRadius: '12px',
      border: `2px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
      backgroundColor: 'transparent',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
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
      animation: 'slideIn 0.5s ease-out'
    },
    loadingSpinner: {
      width: '20px',
      height: '20px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  const getInputStyle = (field, hasError) => {
    return {
      ...styles.baseInput,
      border: hasError 
        ? '2px solid #ef4444' 
        : focusedField === field 
          ? '2px solid #3b82f6' 
          : isDarkMode 
            ? '2px solid rgba(75,85,99,0.5)' 
            : '2px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      transform: hoveredField === field ? 'translateY(-1px)' : 'translateY(0)',
      boxShadow: focusedField === field 
        ? '0 8px 25px rgba(59,130,246,0.15)' 
        : hoveredField === field 
          ? '0 4px 12px rgba(0,0,0,0.1)' 
          : '0 2px 8px rgba(0,0,0,0.05)'
    };
  };

  const getSelectStyle = (field, hasError) => {
    return {
      ...getInputStyle(field, hasError),
      cursor: 'pointer'
    };
  };

  // Add CSS animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const fieldIcons = {
    firstName: User,
    lastName: User,
    email: Mail,
    dateOfBirth: Calendar,
    phoneNumber: Phone,
    department: Building,
    project: Briefcase,
    team: Users,
    password: Lock,
    role: Shield
  };

  const fieldLabels = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    dateOfBirth: 'Date of Birth',
    phoneNumber: 'Phone Number',
    department: 'Department',
    project: 'Project',
    team: 'Team',
    password: 'Password',
    role: 'Role'
  };

  return (
    <div style={styles.page}>
      {submitSuccess && (
        <div style={styles.successMessage}>
          <Check size={20} />
          User added successfully!
        </div>
      )}
      
      {submitError && (
        <div style={styles.errorMessage}>
          <AlertCircle size={20} />
          {submitError}
        </div>
      )}
      
      <div style={styles.header}>
        <button 
          style={styles.backButton}
          onClick={() => window.history.back()}
          className="floating"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={styles.title}>Add New User</h1>
      </div>

      <div style={styles.formContainer}>
        <div style={styles.formGlow}></div>
        
        <div>
          <div style={styles.formGrid}>
            {Object.keys(fieldLabels).map((field) => {
              const Icon = fieldIcons[field];
              const hasError = errors[field];
              
              return (
                <div key={field} style={styles.fieldGroup}>
                  <div style={styles.label}>
                    <Icon size={16} />
                    {fieldLabels[field]}
                  </div>
                  <div style={styles.inputContainer}>
                    {field === 'role' ? (
                      <select
                        value={formData[field]}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onFocus={() => setFocusedField(field)}
                        onBlur={() => setFocusedField(null)}
                        onMouseEnter={() => setHoveredField(field)}
                        onMouseLeave={() => setHoveredField(null)}
                        style={getSelectStyle(field, hasError)}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <input
                        type={
                          field === 'email' ? 'email' : 
                          field === 'dateOfBirth' ? 'date' : 
                          field === 'phoneNumber' ? 'tel' : 
                          field === 'password' ? 'password' : 
                          'text'
                        }
                        value={formData[field]}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        onFocus={() => setFocusedField(field)}
                        onBlur={() => setFocusedField(null)}
                        onMouseEnter={() => setHoveredField(field)}
                        onMouseLeave={() => setHoveredField(null)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                        style={getInputStyle(field, hasError)}
                        placeholder={`Enter ${fieldLabels[field].toLowerCase()}`}
                      />
                    )}
                    {hasError && (
                      <div style={styles.errorText}>
                        <AlertCircle size={12} />
                        {hasError}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.buttonContainer}>
            <button
              style={styles.cancelButton}
              onMouseEnter={() => setHoveredField('cancel')}
              onMouseLeave={() => setHoveredField(null)}
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              style={styles.submitButton}
              onMouseEnter={() => setHoveredField('submit')}
              onMouseLeave={() => setHoveredField(null)}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <div style={styles.loadingSpinner}></div>
                  Adding User...
                </>
              ) : (
                <>
                  <User size={20} />
                  Add User
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserPage;