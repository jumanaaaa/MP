import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, Plus, Edit3, Trash2, User, Mail, Building,
  Calendar, Shield, Users, Eye, EyeOff, MoreVertical, ChevronDown,
  CheckCircle, XCircle, AlertTriangle, X, Bell, Save, RefreshCw,
  Zap, TrendingUp, Award, Activity
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import Dropdown from '../components/Dropdown';

const UsersManagementPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [viewMode, setViewMode] = useState('table');
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
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showProjectsTooltip, setShowProjectsTooltip] = useState(null);
  const tooltipTimeoutRef = useRef(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [userData, setUserData] = useState(null);

  const getAvatarInitials = (firstName, lastName) => {
    if (!firstName) return '?';
    if (!lastName || lastName.trim() === '') {
      return firstName[0].toUpperCase();
    }
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const departments = ['DTO', 'P&A', 'PPC', 'Finance', 'A&I', 'Marketing'];

  // Add this near the top of your component, after state declarations
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Add this useEffect to check admin access FIRST
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await apiFetch('/user/profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.role !== 'admin') {
            // Not an admin - redirect to member dashboard
            window.location.href = '/admindashboard';
            return;
          }
          setUserData(data);
        } else {
          // Not authenticated - redirect to login
          window.location.href = '/';
          return;
        }
      } catch (error) {
        console.error('Failed to verify access', error);
        window.location.href = '/';
        return;
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAdminAccess();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setApiError('');
    try {
      const response = await apiFetch('/users', {
        method: 'GET',
        credentials: 'include',
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

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setLoadingSubscriptions(true);
      try {
        const response = await apiFetch('/api/manictime-admin/subscriptions', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setSubscriptions(data);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoadingSubscriptions(false);
      }
    };

    fetchSubscriptions();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  // useEffect(() => {
  //   const fetchUserData = async () => {
  //     try {
  //       const response = await apiFetch('/user/profile', {
  //         method: 'GET',
  //         credentials: 'include',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         }
  //       });

  //       if (response.ok) {
  //         const data = await response.json();
  //         setUserData(data);
  //       } else {
  //         setUserData(null);
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch user profile', error);
  //       setUserData(null);
  //     }
  //   };

  //   fetchUserData();
  // }, []);

  useEffect(() => {
    if (!showEditModal || !editFormData.department) {
      setProjects([]);
      return;
    }

    setLoadingProjects(true);

    apiFetch('/api/ai/admin/structure', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        const dept = data.domains.find(
          d => d.name === editFormData.department
        );

        const contexts = dept ? dept.contexts : [];
        setProjects(contexts);

        if (userToEdit?.projects?.length) {
          const assignedIds = userToEdit.projects.map(p => p.id);
          setSelectedProjects(
            contexts
              .filter(c => assignedIds.includes(c.id))
              .map(c => c.id)
          );
        } else {
          setSelectedProjects([]);
        }
      })
      .finally(() => setLoadingProjects(false));
  }, [showEditModal, editFormData.department]);

  const handleDeleteUser = (userId) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
  };

  const handleEditUser = (user) => {
    setUserToEdit(user);
    setEditFormData({ ...user });

    if (user.projects?.length) {
      setSelectedProjects(user.projects.map(p => p.id));
    } else {
      setSelectedProjects([]);
    }

    setEditErrors({});
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    const newErrors = {};

    if (!editFormData.firstName?.trim()) newErrors.firstName = 'First name is required';
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
      const response = await apiFetch(`/users/${userToDelete}`, {
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
      const response = await apiFetch(`/users/${userToEdit.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        await apiFetch(`/api/ai/context-clear/${userToEdit.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        for (const contextId of selectedProjects) {
          await apiFetch('/api/ai/context-assign', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userToEdit.id, contextId })
          });
        }

        await fetchUsers();

        setApiSuccess('User updated successfully');
        setTimeout(() => setApiSuccess(''), 3000);
        setShowEditModal(false);
        setUserToEdit(null);
        setEditFormData({});
        setEditErrors({});
      } else {
        const errorData = await response.json();
        setApiError(errorData.message || 'Failed to update user');
        setTimeout(() => setApiError(''), 5000);
      }
    } catch (error) {
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
    window.location.href = '/addusers';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter;
    const matchesDepartment = departmentFilter === 'All Departments' || user.department

    return matchesSearch && matchesRole && matchesDepartment;
  });

  const tooltipStats = userData?.role === 'admin'
    ? [
      { label: 'Users', value: users.length },
      { label: 'Admins', value: users.filter(u => u.role === 'admin').length },
      { label: 'Approvers', value: users.filter(u => u.isApprover).length }
    ]
    : [
      { label: 'Projects', value: userData?.project ? 1 : 0 },
      { label: 'Hours', value: userData?.totalHours ?? '—' },
      { label: 'Capacity', value: userData?.capacity ? `${userData.capacity}%` : '—' }
    ];

  const uniqueDepartments = [...new Set(users.map(user => user.department))];
  const roles = ['admin', 'member'];

  const statConfigs = [
    { label: 'Total Users', value: users.length, icon: Users, color: '#3b82f6', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: Shield, color: '#8b5cf6', gradient: 'from-purple-500 to-purple-600' },
    { label: 'Members', value: users.filter(u => u.role === 'member').length, icon: User, color: '#10b981', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Departments', value: uniqueDepartments.length, icon: Building, color: '#f59e0b', gradient: 'from-amber-500 to-amber-600' }
  ];

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
      marginBottom: '36px'
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      letterSpacing: '-0.5px'
    },
    headerActions: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    // 🎨 REDESIGNED STAT CARDS
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    statCard: (isHovered, config) => ({
      position: 'relative',
      background: isDarkMode
        ? 'rgba(55,65,81,0.6)'
        : 'rgba(255,255,255,0.8)',
      borderRadius: '20px',
      padding: '28px',
      border: `2px solid ${isHovered ? config.color : 'transparent'}`,
      boxShadow: isHovered
        ? `0 20px 40px ${config.color}30, 0 0 0 1px ${config.color}20`
        : '0 4px 20px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
      cursor: 'pointer',
      overflow: 'hidden'
    }),
    statIconContainer: (config) => ({
      width: '56px',
      height: '56px',
      borderRadius: '16px',
      background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '20px',
      boxShadow: `0 8px 24px ${config.color}40`
    }),
    statContent: {
      position: 'relative',
      zIndex: 1
    },
    statNumber: {
      fontSize: '40px',
      fontWeight: '800',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      lineHeight: 1,
      marginBottom: '8px',
      letterSpacing: '-1px'
    },
    statLabel: {
      fontSize: '13px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    statDecoration: (config, isHovered) => ({
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${config.color}15 0%, transparent 70%)`,
      opacity: isHovered ? 1 : 0.5,
      transition: 'opacity 0.4s ease'
    }),
    // 🎨 REDESIGNED CONTROLS CARD
    controlsCard: {
      position: 'relative',
      background: isDarkMode
        ? 'rgba(55,65,81,0.6)'
        : 'rgba(255,255,255,0.8)',
      borderRadius: '20px',
      padding: '28px',
      marginBottom: '28px',
      border: isDarkMode
        ? '1px solid rgba(75,85,99,0.3)'
        : '1px solid rgba(226,232,240,0.6)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.3s ease'
    },
    controlsTop: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      minWidth: '320px'
    },
    searchInput: {
      width: '100%',
      padding: '16px 20px 16px 52px',
      borderRadius: '14px',
      border: isDarkMode
        ? '2px solid rgba(75,85,99,0.3)'
        : '2px solid rgba(226,232,240,0.5)',
      backgroundColor: isDarkMode
        ? 'rgba(30,41,59,0.6)'
        : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '15px',
      fontWeight: '500',
      outline: 'none',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    },
    searchIcon: {
      position: 'absolute',
      left: '18px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    filterButton: (isActive) => ({
      padding: '16px 24px',
      borderRadius: '14px',
      border: 'none',
      background: isActive
        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        : isDarkMode
          ? 'rgba(51,65,85,0.6)'
          : 'rgba(255,255,255,0.9)',
      color: isActive ? '#fff' : isDarkMode ? '#e2e8f0' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontWeight: '600',
      fontSize: '14px',
      boxShadow: isActive
        ? '0 4px 16px rgba(59,130,246,0.3)'
        : '0 2px 8px rgba(0,0,0,0.04)'
    }),
    // 🎨 REDESIGNED TABLE
    tableCard: (isHovered) => ({
      position: 'relative',
      background: isDarkMode
        ? 'rgba(55,65,81,0.6)'
        : 'rgba(255,255,255,0.8)',
      borderRadius: '20px',
      overflow: 'hidden',
      border: isDarkMode
        ? '1px solid rgba(75,85,99,0.3)'
        : '1px solid rgba(226,232,240,0.6)',
      boxShadow: isHovered
        ? '0 20px 40px rgba(0,0,0,0.12)'
        : '0 8px 32px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)'
    }),
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      background: isDarkMode
        ? 'linear-gradient(to bottom, rgba(75,85,99,0.4), rgba(55,65,81,0.6))'
        : 'linear-gradient(to bottom, rgba(248,250,252,0.9), rgba(241,245,249,0.9))',
      padding: '20px 28px',
      fontSize: '12px',
      fontWeight: '700',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      borderBottom: isDarkMode
        ? '1px solid rgba(75,85,99,0.3)'
        : '1px solid rgba(226,232,240,0.5)'
    },
    td: {
      padding: '20px 28px',
      fontSize: '15px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#1f2937',
      borderBottom: isDarkMode
        ? '1px solid rgba(75,85,99,0.2)'
        : '1px solid rgba(241,245,249,0.8)'
    },
    tableRow: (isHovered) => ({
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      background: isHovered
        ? (isDarkMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)')
        : 'transparent'
    }),
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
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px'
    },
    userName: {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '4px',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    },
    userEmail: {
      fontSize: '13px',
      fontWeight: '500',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    roleChip: (role) => ({
      padding: '6px 16px',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      display: 'inline-block',
      ...(role === 'admin' && {
        background: isDarkMode
          ? 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.3) 100%)'
          : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        color: isDarkMode ? '#c4b5fd' : '#92400e',
        boxShadow: isDarkMode
          ? '0 2px 8px rgba(139,92,246,0.3)'
          : '0 2px 8px rgba(251,191,36,0.2)',
        border: isDarkMode ? '1px solid rgba(139,92,246,0.4)' : 'none'
      }),
      ...(role === 'member' && {
        background: isDarkMode
          ? 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.3) 100%)'
          : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        color: isDarkMode ? '#93c5fd' : '#1e40af',
        boxShadow: isDarkMode
          ? '0 2px 8px rgba(59,130,246,0.3)'
          : '0 2px 8px rgba(59,130,246,0.2)',
        border: isDarkMode ? '1px solid rgba(59,130,246,0.4)' : 'none'
      })
    }),
    iconButton: (variant, isHovered) => ({
      padding: '11px',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      ...(variant === 'edit' && {
        backgroundColor: isHovered ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
        color: '#3b82f6',
        boxShadow: isHovered ? '0 4px 12px rgba(59,130,246,0.25)' : 'none'
      }),
      ...(variant === 'delete' && {
        backgroundColor: isHovered ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
        color: '#ef4444',
        boxShadow: isHovered ? '0 4px 12px rgba(239,68,68,0.25)' : 'none'
      })
    }),
    actionButtons: {
      display: 'flex',
      gap: '10px'
    },
    topButton: (isHovered) => ({
      padding: '14px',
      borderRadius: '14px',
      border: 'none',
      backgroundColor: isHovered
        ? 'rgba(59,130,246,0.12)'
        : isDarkMode
          ? 'rgba(51,65,85,0.6)'
          : 'rgba(255,255,255,0.9)',
      color: isHovered ? '#3b82f6' : isDarkMode ? '#e2e8f0' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: isHovered
        ? '0 8px 24px rgba(59,130,246,0.15)'
        : '0 2px 8px rgba(0,0,0,0.04)',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }),
    notificationBadge: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '8px',
      height: '8px',
      backgroundColor: '#ef4444',
      borderRadius: '50%',
      border: '2px solid #fff'
    },
    // ✅ FIXED PROFILE TOOLTIP - MATCHES ADMINVIEWPLAN
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
      borderRight: 'none'
    },
    userDetails: {
      flex: 1
    },
    userRole: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    userStats: {
      borderTop: isDarkMode
        ? '1px solid rgba(51,65,85,0.5)'
        : '1px solid rgba(226,232,240,0.5)',
      paddingTop: '16px',
      marginTop: '12px',
      display: 'flex',
      justifyContent: 'space-between'
    },
    tooltipStatItem: {
      textAlign: 'center'
    },
    tooltipStatNumber: {
      fontSize: '14px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    tooltipStatLabel: {
      fontSize: '10px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
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
    floatingAddButton: (isHovered) => ({
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      width: '68px',
      height: '68px',
      borderRadius: '50%',
      border: 'none',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: '#fff',
      cursor: 'pointer',
      boxShadow: isHovered
        ? '0 24px 48px rgba(59,130,246,0.4)'
        : '0 12px 32px rgba(59,130,246,0.3)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-6px) scale(1.1) rotate(90deg)' : 'translateY(0) scale(1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }),
    actionButton: (variant, isHovered) => ({
      padding: '14px 28px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      ...(variant === 'primary' && {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#fff',
        boxShadow: isHovered ? '0 12px 24px rgba(59,130,246,0.3)' : '0 4px 12px rgba(59,130,246,0.2)'
      }),
      ...(variant === 'secondary' && {
        backgroundColor: isDarkMode ? 'rgba(51,65,85,0.6)' : 'rgba(255,255,255,0.9)',
        color: isDarkMode ? '#e2e8f0' : '#64748b',
        boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.12)' : '0 4px 12px rgba(0,0,0,0.06)'
      })
    }),
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease-out'
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '24px',
      padding: '36px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)',
      animation: 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    },
    modalTitle: {
      fontSize: '22px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    },
    modalText: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '28px',
      lineHeight: '1.6',
      fontSize: '15px'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
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
    editModalGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '28px'
    },
    editInput: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '10px',
      border: isDarkMode ? '2px solid rgba(75,85,99,0.5)' : '2px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s ease',
      fontFamily: '"Montserrat", sans-serif'
    },
    editLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '6px',
      display: 'block',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    errorMessage: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#fff',
      padding: '18px 26px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontWeight: '600',
      boxShadow: '0 12px 28px rgba(239,68,68,0.4)',
      zIndex: 3000,
      animation: 'slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      maxWidth: '400px'
    },
    successMessage: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#fff',
      padding: '18px 26px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontWeight: '600',
      boxShadow: '0 12px 28px rgba(16,185,129,0.4)',
      zIndex: 3000,
      animation: 'slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      gap: '16px'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    editErrorText: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontWeight: '600'
    },
    commandBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: isDarkMode
        ? 'rgba(30,41,59,0.6)'
        : 'rgba(255,255,255,0.9)',
      borderRadius: '16px',
      padding: '10px 14px',
      border: isDarkMode
        ? '1px solid rgba(75,85,99,0.4)'
        : '1px solid rgba(226,232,240,0.6)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease',

      marginBottom: '24px'   // ✅ THIS IS THE GAP
    },

    commandInput: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontSize: '15px',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontWeight: '500'
    },

    commandIcon: {
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },

    commandDivider: {
      width: '1px',
      height: '24px',
      background: isDarkMode
        ? 'rgba(75,85,99,0.5)'
        : 'rgba(226,232,240,0.8)'
    },

    inlineSelect: {
      border: 'none',
      background: 'transparent',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      outline: 'none'
    },
    projectsTooltip: {
      backgroundColor: isDarkMode
        ? 'rgba(30,41,59,0.98)'
        : 'rgba(255,255,255,0.98)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
      border: isDarkMode
        ? '1px solid rgba(75,85,99,0.5)'
        : '1px solid rgba(226,232,240,0.8)',
      minWidth: '240px',
      maxWidth: '320px',
      backdropFilter: 'blur(20px)',
      animation: 'fadeIn 0.2s ease-out'
    },
    projectsTooltipHeader: {
      fontSize: '11px',
      fontWeight: '700',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '12px',
      paddingBottom: '10px',
      borderBottom: isDarkMode
        ? '1px solid rgba(75,85,99,0.3)'
        : '1px solid rgba(226,232,240,0.5)'
    },
    projectItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 0',
      fontSize: '13px',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    projectBullet: {
      color: '#6366f1',
      fontWeight: '700',
      fontSize: '18px',
      lineHeight: 1,
      minWidth: '12px'
    },
    projectName: {
      flex: 1,
      fontWeight: '500',
      lineHeight: 1.3
    },
    projectType: {
      fontSize: '10px',
      padding: '3px 10px',
      borderRadius: '6px',
      backgroundColor: isDarkMode
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.1)',
      color: '#6366f1',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap'
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-30px) scale(0.9);
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
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .profile-tooltip-animated {
        animation: slideIn 0.2s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  if (isCheckingAccess) {
    return (
      <div style={{
        ...styles.page,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={styles.loadingContainer}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Verifying access...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
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

      <div style={styles.header}>
        <h1 style={styles.title}>Users Management</h1>
        <div style={styles.headerActions}>
          <button
            style={styles.actionButton('secondary', hoveredButton === 'refresh')}
            onMouseEnter={() => setHoveredButton('refresh')}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>

          <button
            style={styles.topButton(hoveredButton === 'alerts')}
            onMouseEnter={() => setHoveredButton('alerts')}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={() => window.location.href = '/adminalerts'}
          >
            <Bell size={20} />
            <div style={styles.notificationBadge}></div>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={styles.topButton(hoveredButton === 'profile')}
              onMouseEnter={() => {
                setHoveredButton('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => {
                setHoveredButton(null);
                setTimeout(() => {
                  if (!showProfileTooltip) setShowProfileTooltip(false);
                }, 100);
              }}
              onClick={() => window.location.href = '/adminprofile'}
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
                    {getAvatarInitials(userData.firstName, userData.lastName)}
                  </div>

                  <div style={styles.userDetails}>
                    <div style={styles.userName}>
                      {userData.firstName} {userData.lastName || ''}
                    </div>
                    <div style={styles.userRole}>
                      {userData.role === 'admin' ? 'Admin' : 'Member'} • {userData.department}
                    </div>
                  </div>
                </div>

                <div style={styles.userStats}>
                  {tooltipStats.map(stat => (
                    <div key={stat.label} style={styles.tooltipStatItem}>
                      <div style={styles.tooltipStatNumber}>{stat.value}</div>
                      <div style={styles.tooltipStatLabel}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <button style={styles.themeToggle} onClick={() => setIsDarkMode(!isDarkMode)}>
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎨 REDESIGNED STAT CARDS WITH ICONS */}
      <div style={styles.statsGrid}>
        {statConfigs.map((config, index) => {
          const Icon = config.icon;
          return (
            <div
              key={index}
              style={styles.statCard(hoveredCard === `stat${index}`, config)}
              onMouseEnter={() => setHoveredCard(`stat${index}`)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.statDecoration(config, hoveredCard === `stat${index}`)}></div>
              <div style={styles.statContent}>
                <div style={styles.statIconContainer(config)}>
                  <Icon size={28} color="#fff" strokeWidth={2.5} />
                </div>
                <div style={styles.statNumber}>{config.value}</div>
                <div style={styles.statLabel}>{config.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CONTROLS */}
      <div style={styles.commandBar}>
        <Search size={18} style={styles.commandIcon} />

        <input
          style={styles.commandInput}
          placeholder="Search users by name, email, or department…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div style={styles.commandDivider} />

        <Filter size={16} style={styles.commandIcon} />

        <div style={{ width: '140px' }}>
          <Dropdown
            value={roleFilter}
            onChange={(value) => setRoleFilter(value)}
            options={['All Roles', 'admin', 'member']}
            placeholder="All Roles"
            isDarkMode={isDarkMode}
            compact={true}
          />
        </div>

        <div style={{ width: '160px' }}>
          <Dropdown
            value={departmentFilter}
            onChange={(value) => setDepartmentFilter(value)}
            options={['All Departments', ...uniqueDepartments]}
            placeholder="All Departments"
            isDarkMode={isDarkMode}
            compact={true}
          />
        </div>
      </div>


      {/* TABLE */}
      {loading ? (
        <div style={styles.tableCard(false)}>
          <div style={styles.loadingContainer}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading users...</div>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={styles.tableCard(false)}>
          <div style={styles.emptyState}>
            <Users size={64} style={{ marginBottom: '20px', opacity: 0.4 }} />
            <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>
              {users.length === 0 ? 'No users found' : 'No users match your filters'}
            </div>
            <div style={{ fontSize: '15px', opacity: 0.7 }}>
              {users.length === 0 ? 'Start by adding your first user' : 'Try adjusting your search or filter criteria'}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={styles.tableCard(hoveredCard === 'table')}
          onMouseEnter={() => setHoveredCard('table')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Supervisor</th>
                <th style={styles.th}>Project</th>
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
                      <div style={styles.avatar}>
                        {getAvatarInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <div style={styles.userName}>{user.firstName} {user.lastName || ''}</div>
                        <div style={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.roleChip(user.role)}>{user.role}</span>
                  </td>
                  <td style={styles.td}>{user.department}</td>
                  <td style={styles.td}>
                    {users.find(u => u.id === user.assignedUnder)
                      ? (() => {
                        const supervisor = users.find(u => u.id === user.assignedUnder);
                        return `${supervisor.firstName} ${supervisor.lastName || ''}`.trim();
                      })()
                      : '—'}
                  </td>
                  <td style={styles.td}>
                    {user.projects && user.projects.length > 0 ? (
                      user.projects.length === 1 ? (
                        <span>{user.projects[0].name}</span>
                      ) : (
                        <div
                          onMouseEnter={(e) => {
                            console.log('Badge hovered for user:', user.id); // Debug
                            if (tooltipTimeoutRef.current) {
                              clearTimeout(tooltipTimeoutRef.current);
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const position = {
                              x: rect.left + rect.width / 2,
                              y: rect.bottom - 32  // ✅ 8px BELOW the badge
                            };
                            console.log('Setting tooltip position:', position); // Debug
                            setTooltipPosition(position);
                            setShowProjectsTooltip(user.id);
                          }}
                          onMouseLeave={() => {
                            console.log('Badge mouse leave'); // Debug
                            tooltipTimeoutRef.current = setTimeout(() => {
                              console.log('Hiding tooltip after delay'); // Debug
                              setShowProjectsTooltip(null);
                            }, 200); // Increased to 200ms
                          }}
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: isDarkMode ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
                            color: '#6366f1',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Users size={14} />
                          <span>{user.projects.length} projects</span>
                        </div>
                      )
                    ) : (
                      <span style={{ color: isDarkMode ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>
                        Not assigned
                      </span>
                    )}
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

      <button
        style={styles.floatingAddButton(hoveredButton === 'add')}
        onMouseEnter={() => setHoveredButton('add')}
        onMouseLeave={() => setHoveredButton(null)}
        onClick={handleAddUser}
      >
        <Plus size={30} />
      </button>

      {/* 🎯 PROJECTS TOOLTIP - MOVED TO ROOT LEVEL FOR FULLSCREEN */}
      {showProjectsTooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999
          }}
          onMouseEnter={() => {
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current);
            }
          }}
          onMouseLeave={() => {
            setShowProjectsTooltip(null);
          }}
        >
          <div style={styles.projectsTooltip}>
            <div style={styles.projectsTooltipHeader}>
              Assigned Projects ({users.find(u => u.id === showProjectsTooltip)?.projects?.length || 0})
            </div>
            {users.find(u => u.id === showProjectsTooltip)?.projects?.map((project, idx) => (
              <div key={idx} style={styles.projectItem}>
                <div style={styles.projectBullet}>•</div>
                <div style={styles.projectName}>{project.name}</div>
                {project.projectType && (
                  <div style={styles.projectType}>
                    {project.projectType}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS - keeping them the same for brevity */}
      {showEditModal && userToEdit && (
        <div style={styles.modal} onClick={() => setShowEditModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <Edit3 size={26} color="#3b82f6" />
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
                <label style={styles.editLabel}>Last Name</label>
                <input
                  style={styles.editInput}
                  value={editFormData.lastName || ''}
                  onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                  placeholder="Last name (optional)"
                />
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
                <label style={styles.editLabel}>Can Approve Plans</label>
                <select
                  style={styles.editInput}
                  value={String(editFormData.isApprover)}
                  onChange={(e) =>
                    handleEditFormChange('isApprover', e.target.value === 'true')
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label style={styles.editLabel}>Projects</label>

                {!editFormData.department && (
                  <div style={{ fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '8px' }}>
                    Select a department to see projects
                  </div>
                )}

                {loadingProjects && (
                  <div style={{ fontSize: '13px', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '8px' }}>Loading projects…</div>
                )}

                {projects.map(project => (
                  <label
                    key={project.id}
                    style={{ display: 'block', fontSize: 13, marginBottom: 6, color: isDarkMode ? '#e2e8f0' : '#1e293b' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() =>
                        setSelectedProjects(prev =>
                          prev.includes(project.id)
                            ? prev.filter(id => id !== project.id)
                            : [...prev, project.id]
                        )
                      }
                    />{' '}
                    {project.name}
                  </label>
                ))}
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
              <div>
                <label style={styles.editLabel}>Assigned Under</label>
                <select
                  style={styles.editInput}
                  value={editFormData.assignedUnder || ''}
                  onChange={(e) =>
                    handleEditFormChange(
                      'assignedUnder',
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">No Supervisor</option>
                  {users
                    .filter(u => u.id !== userToEdit.id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName || ''} ({u.department})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label style={styles.editLabel}>Device Name</label>
              <input
                style={styles.editInput}
                value={editFormData.deviceName || ''}
                onChange={(e) => handleEditFormChange('deviceName', e.target.value)}
                placeholder="IHRP-WLT-XXX"
              />
            </div>

            <div>
              <label style={styles.editLabel}>ManicTime Subscription</label>
              <select
                style={styles.editInput}
                value={editFormData.subscriptionId || ''}
                onChange={(e) => handleEditFormChange('subscriptionId', e.target.value ? Number(e.target.value) : null)}
                disabled={loadingSubscriptions}
              >
                <option value="">
                  {loadingSubscriptions ? 'Loading...' : 'No subscription'}
                </option>
                {subscriptions.map(sub => (
                  <option key={sub.Id} value={sub.Id}>
                    {sub.SubscriptionName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.editLabel}>Timeline Key</label>
              <input
                style={styles.editInput}
                value={editFormData.timelineKey || ''}
                onChange={(e) => handleEditFormChange('timelineKey', e.target.value)}
                placeholder="abc-123-timeline-key"
              />
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

      {showDeleteModal && (
        <div style={styles.modal} onClick={() => setShowDeleteModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <AlertTriangle size={26} color="#ef4444" />
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