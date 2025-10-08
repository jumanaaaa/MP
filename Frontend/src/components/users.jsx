import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Edit3, Trash2, User, Mail, Building, 
  Calendar, Shield, Users, Eye, EyeOff, MoreVertical, ChevronDown,
  CheckCircle, XCircle, AlertTriangle, X, Bell, Save, RefreshCw
} from 'lucide-react';

const UsersManagementPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false; // Fallback for Claude.ai
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [users, setUsers] = useState([]);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [editErrors, setEditErrors] = useState({});
  
  // Sample admin user data for profile
  const [userData, setUserData] = useState({
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    email: 'admin@example.com',
    department: 'Engineering'
  });

  // Backend-aligned departments
  const departments = ['DTO', 'P&A', 'PPC', 'Finance', 'A&I', 'Marketing'];

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    setApiError('');
    try {
      const response = await fetch('http://localhost:3000/users', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
        console.log('Users fetched successfully:', usersData);
      } else if (response.status === 401) {
        setApiError('Authentication required. Please log in.');
      } else {
        const errorData = await response.json();
        setApiError(errorData.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setApiError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = (userId) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setEditFormData({ ...user });
    setEditErrors({});
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    const newErrors = {};
    
    if (!editFormData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!editFormData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!editFormData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!editFormData.department) newErrors.department = 'Department is required';
    if (editFormData.phoneNumber && !/^[689]\d{7}$/.test(editFormData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must start with 6, 8, or 9 and be 8 digits long';
    }
    
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:3000/users/${userToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(prev => prev.filter(user => user.id !== userToDelete));
        setApiSuccess('User deleted successfully');
        setTimeout(() => setApiSuccess(''), 3000);
        console.log('User deleted successfully:', result);
      } else {
        const errorData = await response.json();
        setApiError(errorData.message || 'Failed to delete user');
        setTimeout(() => setApiError(''), 5000);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setApiError('Network error. Please try again.');
      setTimeout(() => setApiError(''), 5000);
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const saveEdit = async () => {
    if (!validateEditForm()) return;

    try {
      const response = await fetch(`http://localhost:3000/users/${userToEdit.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(prev => prev.map(user => 
          user.id === userToEdit.id ? { ...editFormData, avatar: `${editFormData.firstName[0]}${editFormData.lastName[0]}` } : user
        ));
        setApiSuccess('User updated successfully');
        setTimeout(() => setApiSuccess(''), 3000);
        setShowEditModal(false);
        setUserToEdit(null);
        setEditFormData({});
        setEditErrors({});
        console.log('User updated successfully:', result);
      } else {
        const errorData = await response.json();
        setApiError(errorData.message || 'Failed to update user');
        setTimeout(() => setApiError(''), 5000);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setApiError('Network error. Please try again.');
      setTimeout(() => setApiError(''), 5000);
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddUser = () => {
    // Navigate to Add User page which should submit to localhost:3000/signup
    window.location.href = '/addusers';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    
    return matchesSearch && matchesRole && matchesDepartment;
  });

  const uniqueDepartments = [...new Set(users.map(user => user.department))];
  const roles = ['admin', 'member'];

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
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    headerActions: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center'
    },
    controlsCard: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.3s ease'
    },
    controlsTop: {
      display: 'flex',
      gap: '20px',
      alignItems: 'center',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      minWidth: '300px'
    },
    searchInput: {
      width: '100%',
      padding: '14px 20px 14px 50px',
      borderRadius: '12px',
      border: isDarkMode ? '2px solid rgba(75,85,99,0.5)' : '2px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    filterButton: (isActive) => ({
      padding: '14px 20px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isActive ? '#3b82f6' : isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
      color: isActive ? '#fff' : isDarkMode ? '#e2e8f0' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(10px)'
    }),
    filtersGrid: {
      display: showFilters ? 'grid' : 'none',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      paddingTop: '16px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
    },
    select: {
      padding: '12px 16px',
      borderRadius: '10px',
      border: isDarkMode ? '2px solid rgba(75,85,99,0.5)' : '2px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    actionButton: (variant, isHovered) => ({
      padding: '12px 24px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
      ...(variant === 'primary' && {
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: '#fff',
        boxShadow: isHovered ? '0 12px 24px rgba(59,130,246,0.4)' : '0 4px 12px rgba(59,130,246,0.2)'
      }),
      ...(variant === 'secondary' && {
        backgroundColor: isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
        color: isDarkMode ? '#e2e8f0' : '#64748b',
        boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(10px)'
      })
    }),
    tableContainer: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      padding: '20px 24px',
      fontSize: '14px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0'
    },
    td: {
      padding: '20px 24px',
      fontSize: '15px',
      color: isDarkMode ? '#e2e8f0' : '#1f2937',
      borderBottom: isDarkMode ? '1px solid #4b5563' : '1px solid #f1f5f9'
    },
    tableRow: (isHovered) => ({
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.05)' : 'transparent'
    }),
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
    userInfo: {
      display: 'flex',
      alignItems: 'center'
    },
    userName: {
      fontWeight: '600',
      marginBottom: '2px'
    },
    userEmail: {
      fontSize: '13px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    roleChip: (role) => ({
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      ...(role === 'admin' && {
        backgroundColor: '#fef3c7',
        color: '#92400e'
      }),
      ...(role === 'member' && {
        backgroundColor: '#dbeafe',
        color: '#1e40af'
      })
    }),
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    iconButton: (variant, isHovered) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      ...(variant === 'edit' && {
        backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
        color: '#3b82f6'
      }),
      ...(variant === 'delete' && {
        backgroundColor: isHovered ? 'rgba(239,68,68,0.1)' : 'transparent',
        color: '#ef4444'
      })
    }),
    floatingAddButton: (isHovered) => ({
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      border: 'none',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: '#fff',
      cursor: 'pointer',
      boxShadow: isHovered 
        ? '0 20px 40px rgba(59,130,246,0.4)' 
        : '0 8px 25px rgba(59,130,246,0.3)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }),
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(4px)'
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)',
      animation: 'modalSlideIn 0.3s ease-out'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    },
    modalText: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '24px',
      lineHeight: '1.5'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    },
    statsCard: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px'
    },
    statItem: {
      flex: 1,
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)'
    },
    statNumber: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600'
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
    userDetails: {
      flex: 1
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
    editModalGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    editInput: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '8px',
      border: isDarkMode ? '2px solid rgba(75,85,99,0.5)' : '2px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s ease'
    },
    editLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '4px',
      display: 'block',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
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
    loadingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    editErrorText: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: '500'
    }
  };

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
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
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={styles.page}>
      {/* Success/Error Messages */}
      {apiSuccess && (
        <div style={styles.successMessage}>
          <CheckCircle size={20} />
          {apiSuccess}
        </div>
      )}
      
      {apiError && (
        <div style={styles.errorMessage}>
          <AlertTriangle size={20} />
          {apiError}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title} className="floating">Users Management</h1>
        <div style={styles.headerActions}>
          <button
            style={styles.actionButton('secondary', hoveredButton === 'refresh')}
            onMouseEnter={() => setHoveredButton('refresh')}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw size={16} style={{animation: loading ? 'spin 1s linear infinite' : 'none'}} />
            Refresh
          </button>

          <button
            style={styles.actionButton('secondary', hoveredButton === 'export')}
            onMouseEnter={() => setHoveredButton('export')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <Eye size={16} />
            Export
          </button>
          
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
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsCard}>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{users.length}</div>
          <div style={styles.statLabel}>Total Users</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{users.filter(u => u.role === 'admin').length}</div>
          <div style={styles.statLabel}>Admins</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{users.filter(u => u.role === 'member').length}</div>
          <div style={styles.statLabel}>Members</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statNumber}>{uniqueDepartments.length}</div>
          <div style={styles.statLabel}>Departments</div>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controlsCard}>
        <div style={styles.controlsTop}>
          <div style={styles.searchContainer}>
            <Search style={styles.searchIcon} size={20} />
            <input
              style={styles.searchInput}
              placeholder="Search users by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            style={styles.filterButton(showFilters)}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
            <ChevronDown 
              size={16} 
              style={{ 
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} 
            />
          </button>
        </div>

        <div style={styles.filtersGrid}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '4px', display: 'block' }}>
              ROLE
            </label>
            <select
              style={styles.select}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '4px', display: 'block' }}>
              DEPARTMENT
            </label>
            <select
              style={styles.select}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={styles.tableContainer}>
          <div style={styles.loadingContainer}>
            <RefreshCw size={24} style={{animation: 'spin 1s linear infinite', marginRight: '12px'}} />
            Loading users...
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={styles.tableContainer}>
          <div style={styles.emptyState}>
            <Users size={48} style={{marginBottom: '16px', opacity: 0.5}} />
            <div style={{fontSize: '18px', fontWeight: '600', marginBottom: '8px'}}>
              {users.length === 0 ? 'No users found' : 'No users match your filters'}
            </div>
            <div style={{fontSize: '14px', opacity: 0.7}}>
              {users.length === 0 ? 'Start by adding your first user' : 'Try adjusting your search or filter criteria'}
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Project</th>
                <th style={styles.th}>Date Joined</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id}
                  style={styles.tableRow(hoveredCard === `user-${user.id}`)}
                  onMouseEnter={() => setHoveredCard(`user-${user.id}`)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <td style={styles.td}>
                    <div style={styles.userInfo}>
                      <div style={styles.userAvatar}>
                        {user.avatar || `${user.firstName[0]}${user.lastName[0]}`}
                      </div>
                      <div>
                        <div style={styles.userName}>
                          {user.firstName} {user.lastName}
                        </div>
                        <div style={styles.userEmail}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.roleChip(user.role)}>
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td}>{user.department}</td>
                  <td style={styles.td}>{user.project || 'Not assigned'}</td>
                  <td style={styles.td}>
                    {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'Unknown'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button
                        style={styles.iconButton('edit', hoveredButton === `edit-${user.id}`)}
                        onMouseEnter={() => setHoveredButton(`edit-${user.id}`)}
                        onMouseLeave={() => setHoveredButton(null)}
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        style={styles.iconButton('delete', hoveredButton === `delete-${user.id}`)}
                        onMouseEnter={() => setHoveredButton(`delete-${user.id}`)}
                        onMouseLeave={() => setHoveredButton(null)}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        style={styles.floatingAddButton(hoveredButton === 'add')}
        onMouseEnter={() => setHoveredButton('add')}
        onMouseLeave={() => setHoveredButton(null)}
        onClick={handleAddUser}
        className="floating"
      >
        <Plus size={24} />
      </button>

      {/* Edit User Modal */}
      {showEditModal && userToEdit && (
        <div style={styles.modal} onClick={() => setShowEditModal(false)}>
          <div style={{...styles.modalContent, maxWidth: '600px'}} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <Edit3 size={24} color="#3b82f6" />
              <div style={styles.modalTitle}>Edit User</div>
            </div>
            
            <div style={styles.editModalGrid}>
              <div>
                <label style={styles.editLabel}>First Name *</label>
                <input
                  style={styles.editInput}
                  value={editFormData.firstName || ''}
                  onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                  placeholder="First name"
                />
                {editErrors.firstName && (
                  <div style={styles.editErrorText}>
                    <AlertTriangle size={12} />
                    {editErrors.firstName}
                  </div>
                )}
              </div>
              <div>
                <label style={styles.editLabel}>Last Name *</label>
                <input
                  style={styles.editInput}
                  value={editFormData.lastName || ''}
                  onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                  placeholder="Last name"
                />
                {editErrors.lastName && (
                  <div style={styles.editErrorText}>
                    <AlertTriangle size={12} />
                    {editErrors.lastName}
                  </div>
                )}
              </div>
              <div>
                <label style={styles.editLabel}>Email *</label>
                <input
                  style={styles.editInput}
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => handleEditFormChange('email', e.target.value)}
                  placeholder="Email address"
                />
                {editErrors.email && (
                  <div style={styles.editErrorText}>
                    <AlertTriangle size={12} />
                    {editErrors.email}
                  </div>
                )}
              </div>
              <div>
                <label style={styles.editLabel}>Phone</label>
                <input
                  style={styles.editInput}
                  type="tel"
                  value={editFormData.phoneNumber || ''}
                  onChange={(e) => handleEditFormChange('phoneNumber', e.target.value)}
                  placeholder="e.g. 81234567"
                />
                {editErrors.phoneNumber && (
                  <div style={styles.editErrorText}>
                    <AlertTriangle size={12} />
                    {editErrors.phoneNumber}
                  </div>
                )}
              </div>
              <div>
                <label style={styles.editLabel}>Department *</label>
                <select
                  style={styles.editInput}
                  value={editFormData.department || ''}
                  onChange={(e) => handleEditFormChange('department', e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {editErrors.department && (
                  <div style={styles.editErrorText}>
                    <AlertTriangle size={12} />
                    {editErrors.department}
                  </div>
                )}
              </div>
              <div>
                <label style={styles.editLabel}>Role *</label>
                <select
                  style={styles.editInput}
                  value={editFormData.role || ''}
                  onChange={(e) => handleEditFormChange('role', e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={styles.editLabel}>Project</label>
                <input
                  style={styles.editInput}
                  value={editFormData.project || ''}
                  onChange={(e) => handleEditFormChange('project', e.target.value)}
                  placeholder="Project"
                />
              </div>
              <div>
                <label style={styles.editLabel}>Team</label>
                <input
                  style={styles.editInput}
                  value={editFormData.team || ''}
                  onChange={(e) => handleEditFormChange('team', e.target.value)}
                  placeholder="Team"
                />
              </div>
            </div>
            
            <div style={styles.modalActions}>
              <button
                style={styles.actionButton('secondary', hoveredButton === 'cancelEdit')}
                onMouseEnter={() => setHoveredButton('cancelEdit')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => {
                  setShowEditModal(false);
                  setEditErrors({});
                }}
              >
                Cancel
              </button>
              <button
                style={styles.actionButton('primary', hoveredButton === 'saveEdit')}
                onMouseEnter={() => setHoveredButton('saveEdit')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={saveEdit}
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={styles.modal} onClick={() => setShowDeleteModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <AlertTriangle size={24} color="#ef4444" />
              <div style={styles.modalTitle}>Delete User</div>
            </div>
            <div style={styles.modalText}>
              Are you sure you want to delete this user? This action cannot be undone and will permanently remove their account and all associated data.
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.actionButton('secondary', hoveredButton === 'cancel')}
                onMouseEnter={() => setHoveredButton('cancel')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.actionButton('primary', hoveredButton === 'confirm'),
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                }}
                onMouseEnter={() => setHoveredButton('confirm')}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={confirmDelete}
              >
                <Trash2 size={16} />
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagementPage;