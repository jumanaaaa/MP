import React, { useState, useRef, useEffect } from 'react';
import html2canvas from "html2canvas";
import {
  ChevronDown,
  Filter,
  Plus,
  Calendar,
  Bell,
  User,
  Edit,
  Trash2
} from 'lucide-react';

const AdminViewPlan = () => {
  const [masterPlans, setMasterPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('Master Plan');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const ganttRef = useRef(null);

  useEffect(() => {
    const fetchMasterPlans = async () => {
      try {
        console.log('🔄 Fetching master plans from /plan/master...');
        setIsLoading(true);

        const response = await fetch('http://localhost:3000/plan/master', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 API Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Master plans received:', data);
          console.log('📊 Total plans fetched:', data.length);
          setMasterPlans(data);
          setFilteredPlans(data);

          // Initialize with all projects selected
          const allProjects = [...new Set(data.map(plan => plan.project))];
          setSelectedProjects(allProjects);
        } else {
          const errorData = await response.text();
          console.error('❌ Failed to fetch master plans:', response.status, errorData);
          console.error('❌ Unable to load master plans. Please ensure you are logged in.');
          setMasterPlans([]);
          setFilteredPlans([]);
        }
      } catch (error) {
        console.error('💥 Error fetching master plans:', error);
        console.error('💥 Network error. Please check your connection and try again.');
        setMasterPlans([]);
        setFilteredPlans([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasterPlans();
  }, []);

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

        console.log('📡 User API Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ User data received:', data);
          setUserData(data);
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
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    let filtered = masterPlans;

    // If no projects selected, show all (default)
    // If projects are selected, filter to only those
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(plan => selectedProjects.includes(plan.project));
    }
    // If selectedProjects is empty, show all (don't filter)

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.project.toLowerCase().includes(query) ||
        (plan.fields?.lead && plan.fields.lead.toLowerCase().includes(query)) ||
        (plan.fields?.status && plan.fields.status.toLowerCase().includes(query))
      );
    }

    setFilteredPlans(filtered);
  }, [selectedProjects, searchQuery, masterPlans]);

  const projects = [...new Set(masterPlans.map(plan => plan.project))];

  const toggleProjectSelection = (project) => {
    setSelectedProjects(prev => {
      if (prev.includes(project)) {
        return prev.filter(p => p !== project);
      } else {
        return [...prev, project];
      }
    });
  };

  const handleTabChange = (tab) => {
    console.log(`🚀 AdminViewPlan - Navigating to ${tab} tab`);
    setActiveTab(tab);

    if (tab === 'Individual Plan') {
      window.location.href = '/adminindividualplan';
    } else if (tab === 'Approvals') {
      window.location.href = '/adminapprovals';
    }
  };

  const handleCreateMasterPlan = () => {
    console.log('🚀 AdminViewPlan - Creating new master plan');
    window.location.href = '/adminaddplan';
  };

  const handleEditPlan = (plan) => {
    console.log('✏️ AdminViewPlan - Editing plan:', plan.project);
    sessionStorage.setItem('editingPlanId', plan.id);
    sessionStorage.setItem('editingPlanData', JSON.stringify(plan));
    window.location.href = '/admineditplan';
  };

  const handleDeletePlan = (plan) => {
    setPlanToDelete(plan);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;

    try {
      console.log('🗑️ Deleting plan:', planToDelete.project, 'ID:', planToDelete.id);

      const response = await fetch(`http://localhost:3000/plan/master/${planToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Delete response status:', response.status);

      if (response.ok) {
        console.log('✅ Plan deleted successfully');
        setMasterPlans(masterPlans.filter(plan => plan.id !== planToDelete.id));
        alert(`Plan "${planToDelete.project}" has been deleted successfully!`);
      } else {
        const errorData = await response.text();
        console.error('❌ Failed to delete plan:', response.status, errorData);
        alert('Failed to delete plan. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error deleting plan:', error);
      alert('Failed to delete plan. Please check your connection and try again.');
    } finally {
      setShowDeleteConfirmation(false);
      setPlanToDelete(null);
    }
  };

  const cancelDeletePlan = () => {
    setShowDeleteConfirmation(false);
    setPlanToDelete(null);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
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
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '32px'
    },
    header: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    topButton: (isHovered) => ({
      padding: '12px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
      color: isHovered ? '#3b82f6' : isDarkMode ? '#e2e8f0' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: isHovered ? '0 8px 25px rgba(59,130,246,0.15)' : '0 4px 12px rgba(0,0,0,0.08)',
      transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0)',
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
      zIndex: 1000
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
    userName: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '2px'
    },
    userRole: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    userStats: {
      borderTop: isDarkMode ? '1px solid rgba(51,65,85,0.5)' : '1px solid rgba(226,232,240,0.5)',
      paddingTop: '12px',
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
      marginTop: '8px',
      width: '100%'
    },
    tabContainer: {
      display: 'flex',
      gap: '8px',
      marginBottom: '32px',
      padding: '4px',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,0.8)',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)',
      maxWidth: 'fit-content'
    },
    tab: (isActive, isHovered) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: 'none',
      backgroundColor: isActive ? '#3b82f6' : isHovered ? isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)' : 'transparent',
      color: isActive ? '#fff' : isDarkMode ? '#e2e8f0' : '#64748b',
      boxShadow: isActive ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
    }),
    createButton: (isHovered) => ({
      backgroundColor: isHovered ? '#f59e0b' : '#fbbf24',
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 8px 25px rgba(251,191,36,0.3)' : '0 4px 12px rgba(251,191,36,0.2)'
    }),
    searchInput: {
      width: '300px',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      backdropFilter: 'blur(10px)'
    },
    filterContainer: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      marginBottom: '28px'
    },
    projectDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
      padding: '12px 0',
      minWidth: '250px',
      zIndex: 1000,
      marginTop: '8px'
    },
    dropdownItem: (isHovered) => ({
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      padding: '14px 20px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      borderRadius: '8px',
      margin: '0 8px',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
      borderLeft: isHovered ? '3px solid #3b82f6' : '3px solid transparent'
    }),
    checkboxItem: (isHovered) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      cursor: 'pointer',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent'
    }),
    checkbox: (isChecked) => ({
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      border: isChecked ? '2px solid #3b82f6' : isDarkMode ? '2px solid #64748b' : '2px solid #cbd5e1',
      backgroundColor: isChecked ? '#3b82f6' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '700',
      transition: 'all 0.2s ease'
    }),
    checkboxLabel: {
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151'
    },
    todayLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: '2px',
      backgroundColor: '#ef4444',
      zIndex: 10,
      boxShadow: '0 0 8px rgba(239,68,68,0.5)'
    },
    todayLabel: {
      position: 'absolute',
      top: '-24px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#ef4444',
      color: '#fff',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '16px'
    },
    loadingState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '16px'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '28px'
    },
    statCard: (isHovered) => ({
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '28px',
      textAlign: 'center',
      boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.15)' : '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      transition: 'all 0.3s ease',
      transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0)',
      cursor: 'pointer',
      backdropFilter: 'blur(10px)'
    }),
    statNumber: {
      fontSize: '36px',
      fontWeight: '800',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    deleteConfirmation: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    },
    deleteModal: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center'
    },
    deleteModalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '12px'
    },
    deleteModalText: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '24px',
      lineHeight: '1.5'
    },
    deleteModalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center'
    },
    modalButton: (isHovered, type) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: type === 'danger' ? (isHovered ? '#dc2626' : '#ef4444') : (isHovered ? isDarkMode ? '#4b5563' : '#e5e7eb' : isDarkMode ? '#6b7280' : '#f3f4f6'),
      color: type === 'danger' ? '#fff' : isDarkMode ? '#e2e8f0' : '#374151',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
    }),
    ganttContainer: {
      marginTop: '24px',
      overflowX: 'auto'
    },
    ganttHeader: {
      display: 'grid',
      gridTemplateColumns: '200px repeat(auto-fit, minmax(80px, 1fr))',
      gap: '1px',
      marginBottom: '16px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.3s ease'
    },
    monthHeader: {
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      padding: '8px 4px',
      transition: 'all 0.3s ease',
      borderBottom: isDarkMode ? '1px solid #4b5563' : '1px solid #e2e8f0'
    },
    taskHeader: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      padding: '8px 12px',
      transition: 'all 0.3s ease'
    },
    ganttRow: {
      display: 'grid',
      gridTemplateColumns: '200px repeat(auto-fit, minmax(80px, 1fr))',
      gap: '1px',
      marginBottom: '8px',
      alignItems: 'center'
    },
    taskName: {
      fontSize: '14px',
      fontWeight: '500',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      padding: '12px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '8px',
      transition: 'all 0.3s ease'
    },
    ganttCell: {
      height: '40px',
      position: 'relative',
      transition: 'all 0.3s ease'
    },
    ganttBar: (color, start, duration, status) => ({
      position: 'absolute',
      left: '0%',
      width: '100%',
      height: '24px',
      top: '8px',
      backgroundColor: color,
      borderRadius: '6px',
      opacity: status?.toLowerCase().includes('complete') ? 0.8 : 1,
      border: status?.toLowerCase().includes('delay') ? '2px solid #ef4444' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      transition: 'all 0.3s ease'
    }),
    legend: {
      display: 'flex',
      gap: '24px',
      marginTop: '20px',
      padding: '20px',
      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
      borderRadius: '12px',
      transition: 'all 0.3s ease'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#475569',
      transition: 'all 0.3s ease'
    },
    legendColor: (color) => ({
      width: '16px',
      height: '16px',
      borderRadius: '4px',
      backgroundColor: color,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }),
    projectTitle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      position: 'relative'
    },
    projectTitleLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'relative'
    },
    projectTitleRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    projectName: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      transition: 'all 0.3s ease'
    },
    projectMeta: {
      display: 'flex',
      gap: '24px',
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      flexWrap: 'wrap',
      marginBottom: '16px',
      transition: 'all 0.3s ease'
    },
    card: (isHovered) => ({
      backgroundColor: isDarkMode ? '#374151' : '#fff',
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
    actionButton: (isHovered, type) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? type === 'edit' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)' : isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)',
      color: isHovered ? type === 'edit' ? '#3b82f6' : '#ef4444' : isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }),
    statusBadge: (status) => {
      const colors = {
        'Completed': { bg: '#10b98120', text: '#10b981' },
        'In Progress': { bg: '#3b82f620', text: '#3b82f6' },
        'Planning': { bg: '#f59e0b20', text: '#f59e0b' },
        'On Hold': { bg: '#ef444420', text: '#ef4444' },
        'Pending': { bg: '#f59e0b20', text: '#f59e0b' },
        'Ongoing': { bg: '#3b82f620', text: '#3b82f6' }
      };
      const color = colors[status] || { bg: '#94a3b820', text: '#94a3b8' };
      return {
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: color.bg,
        color: color.text
      };
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.header}>Plan</h1>
        <div style={styles.headerRight}>
          <button
            style={styles.topButton(hoveredCard === 'alerts')}
            onMouseEnter={() => setHoveredCard('alerts')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => window.location.href = '/adminalerts'}
          >
            <Bell size={20} />
            <div style={styles.notificationBadge}></div>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              style={styles.topButton(hoveredCard === 'profile')}
              onMouseEnter={() => {
                setHoveredCard('profile');
                setShowProfileTooltip(true);
              }}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => window.location.href = '/adminprofile'}
            >
              <User size={20} />
            </button>

            {showProfileTooltip && (
              <div
                style={styles.profileTooltip}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
              >
                <div style={styles.tooltipArrow}></div>
                <div style={styles.userInfo}>
                  <div style={styles.avatar}>
                    {userData ? `${userData.firstName[0]}${userData.lastName[0]}` : 'U'}
                  </div>
                  <div>
                    <div style={styles.userName}>
                      {userData ? `${userData.firstName} ${userData.lastName}` : 'Loading...'}
                    </div>
                    <div style={styles.userRole}>
                      {userData ? `${userData.role} • ${userData.department}` : 'Loading...'}
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
                <button style={styles.themeToggle} onClick={toggleTheme}>
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.tabContainer}>
        {['Master Plan', 'Individual Plan', 'Approvals'].map((tab) => (
          <button
            key={tab}
            style={styles.tab(activeTab === tab, hoveredItem === `tab-${tab}`)}
            onMouseEnter={() => setHoveredItem(`tab-${tab}`)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#1e293b', margin: 0 }}>
          Master Plans Timeline
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={styles.createButton(hoveredItem === 'download')}
            onMouseEnter={() => setHoveredItem('download')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={async () => {
              try {
                const element = ganttRef.current;
                if (!element) return alert("Nothing to download!");

                const canvas = await html2canvas(element, {
                  backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                  scale: 2, // higher quality
                  useCORS: true
                });

                const link = document.createElement("a");
                link.download = `MasterPlan_Gantt_${new Date().toISOString().split("T")[0]}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              } catch (err) {
                console.error("❌ Error saving Gantt chart:", err);
                alert("Failed to generate PNG. Try again.");
              }
            }}
          >
            <Calendar size={16} />
            Download PNG
          </button>

          <button
            style={styles.createButton(hoveredItem === 'create')}
            onMouseEnter={() => setHoveredItem('create')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleCreateMasterPlan}
          >
            <Plus size={16} />
            Create a Master Plan
          </button>
        </div>
      </div>

      <div style={styles.filterContainer}>
        <input
          type="text"
          placeholder="Search by project, lead, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />

        <div style={{ position: 'relative' }}>
          <button
            style={styles.createButton(hoveredItem === 'filter')}
            onMouseEnter={() => setHoveredItem('filter')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          >
            <Filter size={16} />
            Filter Projects
            {selectedProjects.length > 0 && ` (${selectedProjects.length})`}
            <ChevronDown size={16} />
          </button>

          {isProjectDropdownOpen && (
            <div style={styles.projectDropdown}>
              {/* All Projects Option */}
              <div
                key="all"
                style={styles.checkboxItem(hoveredItem === 'all')}
                onMouseEnter={() => setHoveredItem('all')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => setSelectedProjects([])}
              >
                <div style={styles.checkbox(selectedProjects.length === 0)}>
                  {selectedProjects.length === 0 && '✓'}
                </div>
                <span style={styles.checkboxLabel}>All Projects</span>
              </div>

              {/* Separator */}
              <div style={{
                height: '1px',
                backgroundColor: isDarkMode ? 'rgba(75,85,99,0.5)' : 'rgba(226,232,240,0.8)',
                margin: '8px 12px'
              }} />

              {/* Individual Projects */}
              {projects.map((project) => (
                <div
                  key={project}
                  style={styles.checkboxItem(hoveredItem === project)}
                  onMouseEnter={() => setHoveredItem(project)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => toggleProjectSelection(project)}
                >
                  <div style={styles.checkbox(selectedProjects.includes(project))}>
                    {selectedProjects.includes(project) && '✓'}
                  </div>
                  <span style={styles.checkboxLabel}>{project}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={styles.loadingState}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Loading master plans...
        </div>
      ) : masterPlans.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No master plans found
          </div>
          <div>Create your first master plan to get started</div>
        </div>
      ) : (
        <div
          style={styles.card(hoveredCard === 'gantt')}
          onMouseEnter={() => setHoveredCard('gantt')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>

          <div style={styles.projectTitle}>
            <div style={styles.projectName}>
              {selectedProjects.length === 0 ? 'Master Plan Overview' :
                selectedProjects.length === 1 ? selectedProjects[0] :
                  `${selectedProjects.length} Projects Selected`}
            </div>
            {selectedProjects.length === 1 && filteredPlans.length === 1 && (
              <div style={styles.projectTitleRight}>
                <button
                  style={styles.actionButton(hoveredItem === 'edit-single', 'edit')}
                  onMouseEnter={() => setHoveredItem('edit-single')}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => handleEditPlan(filteredPlans[0])}
                  title="Edit this plan"
                >
                  <Edit size={16} />
                </button>
                <button
                  style={styles.actionButton(hoveredItem === 'delete-single', 'delete')}
                  onMouseEnter={() => setHoveredItem('delete-single')}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => handleDeletePlan(filteredPlans[0])}
                  title="Delete this plan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {selectedProjects.length === 1 && filteredPlans.length === 1 && (

            <div style={styles.projectMeta}>
              <span><strong>Start:</strong> {new Date(filteredPlans[0].startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span><strong>End:</strong> {new Date(filteredPlans[0].endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {filteredPlans[0].fields?.lead && <span><strong>Lead:</strong> {filteredPlans[0].fields.lead}</span>}
              {filteredPlans[0].fields?.status && (
                <span>
                  <strong>Status:</strong>{' '}
                  <span style={styles.statusBadge(filteredPlans[0].fields.status)}>{filteredPlans[0].fields.status}</span>
                </span>
              )}
            </div>
          )}

          <div ref={ganttRef} style={styles.ganttContainer}>
            {filteredPlans.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  No projects found
                </div>
                <div>Try adjusting your filters or search query</div>
              </div>
            ) : (
              (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const allDates = filteredPlans.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
                const earliestStart = new Date(Math.min(...allDates));
                const latestEnd = new Date(Math.max(...allDates));

                const totalMonths = Math.ceil((latestEnd - earliestStart) / (1000 * 60 * 60 * 24 * 30)) + 1;
                const months = [];

                const todayMonthIndex = Math.floor((today - earliestStart) / (1000 * 60 * 60 * 24 * 30));
                const monthStart = new Date(earliestStart);
                monthStart.setMonth(earliestStart.getMonth() + todayMonthIndex);
                const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
                const dayOfMonth = today.getDate();
                const todayPercentInMonth = (dayOfMonth / daysInMonth) * 100;

                for (let i = 0; i < totalMonths; i++) {
                  const monthDate = new Date(earliestStart);
                  monthDate.setMonth(earliestStart.getMonth() + i);
                  months.push({
                    label: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    date: new Date(monthDate)
                  });
                }

                const getPhaseColor = (status) => {
                  const statusLower = status?.toLowerCase() || '';
                  if (statusLower.includes('complete')) return '#10b981';
                  if (statusLower.includes('progress') || statusLower.includes('ongoing')) return '#3b82f6';
                  if (statusLower.includes('pending') || statusLower.includes('planning')) return '#f59e0b';
                  if (statusLower.includes('delay') || statusLower.includes('hold')) return '#ef4444';
                  return '#94a3b8';
                };

                return (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                      gap: '1px',
                      marginBottom: '16px',
                      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <div style={styles.taskHeader}>Project</div>
                      {months.map((month, idx) => (
                        <div key={idx} style={styles.monthHeader}>{month.label}</div>
                      ))}
                    </div>

                    {filteredPlans.map((plan) => {
                      const projectStart = new Date(plan.startDate);
                      const projectEnd = new Date(plan.endDate);
                      const startMonthsDiff = Math.floor((projectStart - earliestStart) / (1000 * 60 * 60 * 24 * 30));
                      const projectDurationMonths = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24 * 30));

                      const phases = [];
                      if (plan.fields) {
                        Object.entries(plan.fields).forEach(([key, value], index) => {
                          if (key.toLowerCase() !== 'status' && key.toLowerCase() !== 'lead' && key.toLowerCase() !== 'budget' && key.toLowerCase() !== 'completion') {
                            phases.push({
                              name: key,
                              status: value,
                              color: getPhaseColor(value)
                            });
                          }
                        });
                      }

                      return (
                        <div
                          key={plan.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                            gap: '1px',
                            marginBottom: '8px',
                            alignItems: 'center'
                          }}
                        >
                          <div style={styles.taskName}>
                            <div style={{ fontWeight: '700', marginBottom: '4px' }}>{plan.project}</div>
                            {plan.fields?.status && (
                              <span style={styles.statusBadge(plan.fields.status)}>
                                {plan.fields.status}
                              </span>
                            )}
                          </div>

                          {months.map((month, monthIdx) => {
                            const isInRange = monthIdx >= startMonthsDiff && monthIdx < startMonthsDiff + projectDurationMonths;
                            const isFirstCell = monthIdx === startMonthsDiff;
                            const isTodayMonth = monthIdx === todayMonthIndex && today >= earliestStart && today <= latestEnd;

                            return (
                              <div key={monthIdx} style={styles.ganttCell}>
                                {isInRange && isFirstCell && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '0%',
                                      width: `${projectDurationMonths * 100}%`,
                                      height: '24px',
                                      top: '8px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                      overflow: 'hidden'
                                    }}
                                    title={`${plan.project}: ${projectStart.toLocaleDateString()} - ${projectEnd.toLocaleDateString()}`}
                                  >
                                    {phases.length > 0 ? (
                                      phases.map((phase, phaseIdx) => (
                                        <div
                                          key={phaseIdx}
                                          style={{
                                            flex: 1,
                                            height: '100%',
                                            backgroundColor: phase.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            borderRight: phaseIdx < phases.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            padding: '0 4px'
                                          }}
                                          title={`${phase.name}: ${phase.status}`}
                                        >
                                          {phases.length <= 3 && phase.name.slice(0, 8)}
                                        </div>
                                      ))
                                    ) : (
                                      <div
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          backgroundColor: getPhaseColor(plan.fields?.status),
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#fff',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          padding: '0 8px'
                                        }}
                                      >
                                        {plan.project}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {isTodayMonth && (
                                  <>
                                    <div style={{ ...styles.todayLine, left: `${todayPercentInMonth}%` }} />
                                    <div style={{ ...styles.todayLabel, left: `${todayPercentInMonth}%` }}>
                                      Today
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    <div style={styles.legend}>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#10b981')} />
                        Completed
                      </div>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#3b82f6')} />
                        In Progress
                      </div>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#f59e0b')} />
                        Pending
                      </div>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#ef4444')} />
                        Delayed
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

      <div style={styles.statsContainer}>
        <div
          style={styles.statCard(hoveredCard === 'stat1')}
          onMouseEnter={() => setHoveredCard('stat1')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statNumber}>{masterPlans.length}</div>
          <div style={styles.statLabel}>Total Master Plans</div>
        </div>

        <div
          style={styles.statCard(hoveredCard === 'stat2')}
          onMouseEnter={() => setHoveredCard('stat2')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statNumber}>
            {masterPlans.filter(p =>
              p.fields?.status === 'In Progress' ||
              p.fields?.status === 'Ongoing'
            ).length}
          </div>
          <div style={styles.statLabel}>Active Projects</div>
        </div>

        <div
          style={styles.statCard(hoveredCard === 'stat3')}
          onMouseEnter={() => setHoveredCard('stat3')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.statNumber}>
            {masterPlans.filter(p => p.fields?.status === 'Completed').length}
          </div>
          <div style={styles.statLabel}>Completed</div>
        </div>
      </div>

      {showDeleteConfirmation && planToDelete && (
        <div style={styles.deleteConfirmation}>
          <div style={styles.deleteModal}>
            <h3 style={styles.deleteModalTitle}>Delete Plan</h3>
            <p style={styles.deleteModalText}>
              Are you sure you want to delete "{planToDelete.project}"? This action cannot be undone
              and will permanently remove all associated data.
            </p>
            <div style={styles.deleteModalActions}>
              <button
                style={styles.modalButton(hoveredItem === 'cancel', 'cancel')}
                onMouseEnter={() => setHoveredItem('cancel')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={cancelDeletePlan}
              >
                Cancel
              </button>
              <button
                style={styles.modalButton(hoveredItem === 'confirm-delete', 'danger')}
                onMouseEnter={() => setHoveredItem('confirm-delete')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={confirmDeletePlan}
              >
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminViewPlan;