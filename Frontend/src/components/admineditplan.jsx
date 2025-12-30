import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Lock, Users, Shield, Eye, Edit as EditIcon, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle, ArrowLeft, Bell, User } from 'lucide-react';
import { apiFetch } from '../utils/api';
const AdminEditPlan = () => {
  const [planData, setPlanData] = useState(null);
  const [project, setProject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fields, setFields] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);

  const [userStats, setUserStats] = useState({
    totalHours: 0,
    totalPlans: 0,
    utilization: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 🔒 Lock state
  const [lockInfo, setLockInfo] = useState(null);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);
  const [lockError, setLockError] = useState(null);
  const lockIntervalRef = useRef(null);

  // 🆕 Permission state
  const [userPermission, setUserPermission] = useState(null);
  const [isLoadingPermission, setIsLoadingPermission] = useState(true);

  // 🆕 Team management state
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isTeamExpanded, setIsTeamExpanded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('editor');
  const [justifications, setJustifications] = useState({});

  // 🆕 Add Milestone Modal State
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneStatus, setNewMilestoneStatus] = useState('On Track');
  const [newMilestoneStartDate, setNewMilestoneStartDate] = useState('');
  const [newMilestoneEndDate, setNewMilestoneEndDate] = useState('');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

  const planId = sessionStorage.getItem('editingPlanId');

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const milestoneStartRef = useRef(null);
  const milestoneEndRef = useRef(null);

  const milestoneDateRefs = useRef({});

  // 🆕 Fetch user permission
  useEffect(() => {
    const fetchUserPermission = async () => {
      if (!planId) return;

      try {
        const response = await apiFetch(`/plan/master/${planId}/permission`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setUserPermission(data.permission); // 'owner', 'editor', or 'viewer'
          console.log('✅ User permission:', data.permission);
        } else {
          console.warn('⚠️ Permission endpoint not available, using fallback to ownership');
          setUserPermission(undefined); // Use undefined to trigger fallback
        }
      } catch (error) {
        console.error('❌ Error fetching permission:', error);
        console.log('⚠️ Falling back to ownership-based access control');
        setUserPermission(undefined); // Use undefined to trigger fallback
      } finally {
        setIsLoadingPermission(false);
      }
    };

    fetchUserPermission();
  }, [planId]);

  // 🆕 Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!planId || !userData) return;

      try {
        setIsLoadingTeam(true);
        const response = await apiFetch(`/plan/master/${planId}/team`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data.team || []);
          console.log('✅ Team members loaded:', data.team);
        }
      } catch (error) {
        console.error('❌ Error fetching team:', error);
      } finally {
        setIsLoadingTeam(false);
      }
    };

    if (userPermission && userData) {
      fetchTeamMembers();
    }
  }, [planId, userPermission, userData]);

  // 🆕 Fetch available users for team dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      if (userPermission !== 'owner' && userPermission !== 'editor') return; // Only owners can add members

      try {
        const response = await apiFetch('/user/list', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          // Filter out current user and existing team members
          const filtered = data.users.filter(u =>
            u.id !== userData?.id &&
            !teamMembers.some(tm => tm.userId === u.id)
          );
          setAvailableUsers(filtered);
        }
      } catch (error) {
        console.error('❌ Error fetching users:', error);
      }
    };

    if (userPermission === 'owner' && userData && teamMembers) {
      fetchUsers();
    }
  }, [userPermission, userData, teamMembers]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiFetch('/user/profile', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userData) return;
      
      setIsLoadingStats(true);
      try {
        // Fetch workload data for hours & capacity
        const workloadResponse = await apiFetch('/user/workload-status?period=week', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        // Fetch master plans count
        const plansResponse = await apiFetch('/plan/master', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (workloadResponse.ok && plansResponse.ok) {
          const workloadData = await workloadResponse.json();
          const plansData = await plansResponse.json();

          setUserStats({
            totalHours: workloadData.user?.totalHours || 0,
            totalPlans: plansData.length || 0,
            utilization: workloadData.user?.utilizationPercentage || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (userData) {
      fetchUserStats();
    }
  }, [userData]);

  // 🔒 Acquire lock on mount
  useEffect(() => {
    const acquireLock = async () => {
      if (!planId || !userData) return;

      // 🆕 Check permission before acquiring lock (skip if undefined for fallback)
      if (userPermission === 'viewer') {
        setLockError('You have view-only access to this plan.');
        setIsLoading(false);
        return;
      }

      // If permission is undefined, we're in fallback mode - allow editing
      // If permission is defined but null, deny access
      if (userPermission === null) {
        setLockError('You do not have permission to edit this plan.');
        setIsLoading(false);
        return;
      }

      try {
        setIsAcquiringLock(true);
        setLockError(null);

        const response = await apiFetch(`/plan/lock/${planId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setLockInfo(data.lock);
          console.log('✅ Lock acquired:', data.lock);

          // Start heartbeat
          lockIntervalRef.current = setInterval(async () => {
            try {
              await apiFetch(`/plan/lock/${planId}/heartbeat`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });
              console.log('💓 Lock heartbeat sent');
            } catch (error) {
              console.error('❌ Heartbeat failed:', error);
            }
          }, 30000); // Every 30 seconds
        } else {
          const errorData = await response.json();

          if (errorData.lockedBy && errorData.lockedBy !== `${userData.firstName} ${userData.lastName}`) {
            const takeover = window.confirm(
              `⚠️ This plan is currently being edited by ${errorData.lockedBy}.\n\n` +
              `Do you want to take over editing? This will disconnect them.`
            );

            if (takeover) {
              const takeoverResponse = await apiFetch(`/plan/lock/${planId}/takeover`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: true })
              });

              if (takeoverResponse.ok) {
                const data = await takeoverResponse.json();
                setLockInfo(data.lock);
                console.log('✅ Lock takeover successful');

                // Start heartbeat
                lockIntervalRef.current = setInterval(async () => {
                  try {
                    await apiFetch(`/plan/lock/${planId}/heartbeat`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' }
                    });
                  } catch (error) {
                    console.error('❌ Heartbeat failed:', error);
                  }
                }, 30000);
              } else {
                setLockError('Failed to take over lock');
              }
            } else {
              window.location.href = '/adminviewplan';
            }
          } else {
            setLockError(errorData.error || 'Failed to acquire lock');
          }
        }
      } catch (error) {
        console.error('❌ Lock acquisition error:', error);
        setLockError('Network error. Please try again.');
      } finally {
        setIsAcquiringLock(false);
      }
    };

    if (userData && !isLoadingPermission) {
      acquireLock();
    }
  }, [planId, userData, userPermission, isLoadingPermission]);

  // 🔒 Release lock on unmount
  useEffect(() => {
    return () => {
      if (lockIntervalRef.current) {
        clearInterval(lockIntervalRef.current);
      }

      if (planId && lockInfo) {
        apiFetch(`/plan/lock/${planId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }).then(() => {
          console.log('🔓 Lock released on unmount');
        }).catch(() => {
          console.warn('Lock already released on unmount, safe to ignore');
        });
      }
    };
  }, [planId, lockInfo]);

  // Fetch plan data
  useEffect(() => {
    const fetchPlanData = async () => {
      if (!planId) {
        alert('No plan selected for editing');
        window.location.href = '/adminviewplan';
        return;
      }

      try {
        setIsLoading(true);
        const response = await apiFetch(`/plan/master/${planId}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setPlanData(data);
          setProject(data.project);
          setStartDate(data.startDate.split('T')[0]);
          setEndDate(data.endDate.split('T')[0]);
          setFields(data.fields || {});
          console.log('✅ Plan data loaded:', data);
        } else {
          alert('Failed to load plan data');
          window.location.href = '/adminviewplan';
        }
      } catch (error) {
        console.error('Error fetching plan:', error);
        alert('Network error. Please try again.');
        window.location.href = '/adminviewplan';
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanData();
  }, [planId]);

  // 🆕 Add team member
  const handleAddTeamMember = async () => {
    if (!selectedUserId || !selectedPermission) {
      alert('Please select a user and permission level');
      return;
    }

    try {
      const response = await apiFetch(`/plan/master/${planId}/permissions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(selectedUserId),
          permissionLevel: selectedPermission
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Team member added:', data);

        // Refresh team members
        const teamResponse = await apiFetch(`/plan/master/${planId}/team`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          setTeamMembers(teamData.team || []);
        }

        // Reset selection
        setSelectedUserId('');
        setSelectedPermission('editor');

        alert('Team member added successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to add team member: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ Error adding team member:', error);
      alert('Network error. Please try again.');
    }
  };

  // 🆕 Update team member permission
  const handleUpdatePermission = async (userId, newPermission) => {
    try {
      const response = await apiFetch(`/plan/master/${planId}/permissions`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          permissionLevel: newPermission
        })
      });

      if (response.ok) {
        console.log('✅ Permission updated');

        // Refresh team members
        const teamResponse = await apiFetch(`/plan/master/${planId}/team`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          setTeamMembers(teamData.team || []);
        }

        alert('Permission updated successfully!');
      } else {
        alert('Failed to update permission');
      }
    } catch (error) {
      console.error('❌ Error updating permission:', error);
      alert('Network error. Please try again.');
    }
  };

  // 🆕 Remove team member
  const handleRemoveTeamMember = async (userId) => {
    const confirmRemove = window.confirm('Are you sure you want to remove this team member?');
    if (!confirmRemove) return;

    try {
      const response = await apiFetch(`/plan/master/${planId}/permissions/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('✅ Team member removed');

        // Refresh team members
        const teamResponse = await apiFetch(`/plan/master/${planId}/team`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          setTeamMembers(teamData.team || []);
        }

        alert('Team member removed successfully!');
      } else {
        alert('Failed to remove team member');
      }
    } catch (error) {
      console.error('❌ Error removing team member:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleAddField = () => {
    setShowAddMilestoneModal(true);
  };

  const handleConfirmAddMilestone = () => {
    if (!newMilestoneName.trim()) {
      alert('Please enter a milestone name');
      return;
    }

    if (fields[newMilestoneName.trim()]) {
      alert('A milestone with this name already exists!');
      return;
    }

    setFields({
      ...fields,
      [newMilestoneName.trim()]: {
        status: newMilestoneStatus,
        startDate: newMilestoneStartDate,
        endDate: newMilestoneEndDate
      }
    });

    // Reset modal
    setShowAddMilestoneModal(false);
    setNewMilestoneName('');
    setNewMilestoneStatus('On Track');
    setNewMilestoneStartDate('');
    setNewMilestoneEndDate('');
  };

  const handleCancelAddMilestone = () => {
    setShowAddMilestoneModal(false);
    setNewMilestoneName('');
    setNewMilestoneStatus('On Track');
    setNewMilestoneStartDate('');
    setNewMilestoneEndDate('');
  };

  const handleRemoveField = (fieldName) => {
    const newFields = { ...fields };
    delete newFields[fieldName];
    setFields(newFields);
  };

  const handleFieldChange = (fieldName, key, value) => {
    setFields({
      ...fields,
      [fieldName]: {
        ...fields[fieldName],
        [key]: value
      }
    });
  };

  const handleSave = async () => {
    if (!project.trim()) {
      alert('Please enter a project name');
      return;
    }

    if (!startDate || !endDate) {
      alert('Please enter start and end dates');
      return;
    }

    // 🆕 Check permission before saving (skip if undefined for fallback)
    if (userPermission === 'viewer') {
      alert('❌ You have view-only access. Contact the owner for edit permissions.');
      return;
    }

    // If permission is undefined, we're in fallback mode - allow saving
    // If permission is defined but null, deny access
    if (userPermission === null) {
      alert('❌ You do not have permission to edit this plan.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch(`/plan/master/${planId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          startDate,
          endDate,
          fields,
          justifications,
          submittedBy: {
            firstName: userData?.firstName,
            lastName: userData?.lastName,
            email: userData?.email
          }
        })
      });

      if (response.ok) {
        console.log('✅ Plan updated successfully');

        // 🔒 Release lock
        if (lockInfo) {
          try {
            await apiFetch(`/plan/lock/${planId}`, {
              method: 'DELETE',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (err) {
            // ✅ Expected edge case — lock already released / expired
            console.warn('Lock already released or not found, safe to ignore');
          }
        }

        alert('Plan updated successfully!');
        sessionStorage.removeItem('editingPlanId');
        sessionStorage.removeItem('editingPlanData');
        window.location.href = '/adminviewplan';
      } else {
        const errorData = await response.json();
        alert(`Failed to update plan: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    // 🔒 Release lock before canceling
    if (lockInfo) {
      try {
        await apiFetch(`/plan/lock/${planId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('🔓 Lock released on cancel');
      } catch (error) {
        console.error('❌ Failed to release lock:', error);
      }
    }

    sessionStorage.removeItem('editingPlanId');
    sessionStorage.removeItem('editingPlanData');
    window.location.href = '/adminviewplan';
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const getPermissionBadge = (permission) => {
    const badgeStyles = {
      owner: { bg: '#3b82f6', icon: Shield, label: 'Owner' },
      editor: { bg: '#10b981', icon: EditIcon, label: 'Editor' },
      viewer: { bg: '#64748b', icon: Eye, label: 'Viewer' }
    };

    const style = badgeStyles[permission];
    if (!style) return null;

    const Icon = style.icon;

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        backgroundColor: style.bg + '20',
        border: `1px solid ${style.bg}40`,
        fontSize: '12px',
        fontWeight: '600',
        color: style.bg,
        textTransform: 'uppercase'
      }}>
        <Icon size={14} />
        {style.label}
      </div>
    );
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '30px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif'
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
    mainContent: {
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: '32px',
      alignItems: 'start'
    },
    formSection: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    },
    rightSidebar: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    teamSection: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
    },
    teamHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    },
    teamTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    addFieldButton: (isHovered) => ({
      padding: '10px 20px',
      borderRadius: '12px',
      border: isDarkMode ? '2px dashed rgba(59,130,246,0.5)' : '2px dashed rgba(59,130,246,0.3)',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      color: '#3b82f6',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      width: '100%',
      marginTop: '16px'
    }),
    container: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    lockBanner: (type) => ({
      padding: '16px 20px',
      borderRadius: '12px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: type === 'error'
        ? 'rgba(239,68,68,0.1)'
        : type === 'acquiring'
          ? 'rgba(251,191,36,0.1)'
          : 'rgba(16,185,129,0.1)',
      border: `1px solid ${type === 'error'
        ? 'rgba(239,68,68,0.3)'
        : type === 'acquiring'
          ? 'rgba(251,191,36,0.3)'
          : 'rgba(16,185,129,0.3)'
        }`,
      color: type === 'error'
        ? '#ef4444'
        : type === 'acquiring'
          ? '#f59e0b'
          : '#10b981',
      fontWeight: '600',
      fontSize: '14px'
    }),
    card: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      marginBottom: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      userSelect: 'none'
    },
    formGroup: {
      marginBottom: '24px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#374151',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none'
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: '60px'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer'
    },
    fieldCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)'
    },
    fieldHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    fieldName: {
      fontSize: '16px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b'
    },
    removeButton: (isHovered) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
      color: '#ef4444',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    button: (isHovered, type = 'primary', disabled = false) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      opacity: disabled ? 0.5 : 1,
      backgroundColor: disabled
        ? (isDarkMode ? '#4b5563' : '#e5e7eb')
        : type === 'primary'
          ? (isHovered ? '#2563eb' : '#3b82f6')
          : type === 'secondary'
            ? (isHovered ? '#f59e0b' : '#fbbf24')
            : (isHovered ? isDarkMode ? '#4b5563' : '#e5e7eb' : isDarkMode ? '#6b7280' : '#f3f4f6'),
      color: type === 'primary' || type === 'secondary' ? '#fff' : isDarkMode ? '#e2e8f0' : '#374151',
      boxShadow: isHovered && !disabled ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
      transform: isHovered && !disabled ? 'translateY(-1px)' : 'translateY(0)'
    }),
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '32px'
    },
    addFieldButton: (isHovered) => ({
      padding: '10px 20px',
      borderRadius: '12px',
      border: isDarkMode ? '2px dashed rgba(59,130,246,0.5)' : '2px dashed rgba(59,130,246,0.3)',
      backgroundColor: isHovered ? 'rgba(59,130,246,0.1)' : 'transparent',
      color: '#3b82f6',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600'
    }),
    dateRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '16px'
    },
    teamMemberCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(241,245,249,0.8)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.8)'
    },
    teamMemberInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1
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
      fontSize: '14px'
    },
    memberDetails: {
      flex: 1
    },
    memberName: {
      fontSize: '14px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '2px'
    },
    memberEmail: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b'
    },
    addTeamRow: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr auto',
      gap: '12px',
      alignItems: 'end',
      padding: '16px',
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.1)'
    },
    infoBox: {
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      border: isDarkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.2)',
      marginTop: '16px',
      fontSize: '13px',
      color: isDarkMode ? '#93c5fd' : '#3b82f6',
      lineHeight: '1.6'
    },
    addMilestoneModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)'
    },
    addMilestoneModalContent: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: isDarkMode ? '2px solid rgba(75,85,99,0.5)' : '2px solid rgba(226,232,240,0.8)'
    },
    modalTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    modalCloseButton: (isHovered) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
      color: '#ef4444',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }),
    modalBody: {
      marginBottom: '24px'
    },
    modalFooter: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      paddingTop: '20px',
      borderTop: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.5)'
    }
  };

  if (isLoading || isLoadingPermission) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontSize: '16px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            Loading plan data...
          </div>
        </div>
      </div>
    );
  }

  // 🆕 Show error if permission is explicitly null (denied), but not if undefined (fallback mode)
  if (userPermission === null) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.lockBanner('error')}>
            <AlertCircle size={20} />
            <div>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>Access Denied</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                You do not have permission to view this plan.
              </div>
            </div>
          </div>
          <button
            style={styles.button(false, 'default')}
            onClick={() => window.location.href = '/adminviewplan'}
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* 🆕 NEW HEADER */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton(hoveredItem === 'back')}
            onMouseEnter={() => setHoveredItem('back')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={handleCancel}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.header}>
            Edit Master Plan
            {userPermission && getPermissionBadge(userPermission)}
          </h1>
        </div>

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
                    <div style={styles.tooltipStatNumber}>
                      {isLoadingStats ? '...' : userStats.totalHours}
                    </div>
                    <div style={styles.tooltipStatLabel}>Hours</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {isLoadingStats ? '...' : userStats.totalPlans}
                    </div>
                    <div style={styles.tooltipStatLabel}>Plans</div>
                  </div>
                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {isLoadingStats ? '...' : `${userStats.utilization}%`}
                    </div>
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

      {/* 🆕 TAB CONTAINER */}
      <div style={styles.tabContainer}>
        <div style={styles.tab(true, false)}>
          Master Plan
        </div>
      </div>

      {/* Lock Status Banners */}
      {isAcquiringLock && (
        <div style={styles.lockBanner('acquiring')}>
          <Lock size={20} />
          <div>Acquiring edit lock...</div>
        </div>
      )}

      {lockError && (
        <div style={styles.lockBanner('error')}>
          <AlertCircle size={20} />
          <div>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Cannot Edit Plan</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>{lockError}</div>
          </div>
        </div>
      )}

      {lockInfo && !lockError && (
        <div style={styles.lockBanner('success')}>
          <CheckCircle size={20} />
          <div>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>You have edit access</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              Your changes will be saved automatically. Lock expires in {lockInfo.minutesRemaining || 5} minutes.
            </div>
          </div>
        </div>
      )}

      {/* 🆕 TWO-COLUMN LAYOUT */}
      <div style={styles.mainContent}>
        {/* LEFT COLUMN - Form Section */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Basic Information</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Project Name *</label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              style={styles.input}
              placeholder="Enter project name"
              disabled={userPermission === 'viewer'}
            />
          </div>

          <div style={styles.dateRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Date *</label>
              <div
                onClick={() => startDateRef.current?.showPicker()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  ref={startDateRef}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.input}
                  disabled={userPermission === 'viewer'}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>End Date *</label>
              <div
                onClick={() => endDateRef.current?.showPicker()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  ref={endDateRef}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={styles.input}
                  disabled={userPermission === 'viewer'}
                />
              </div>
            </div>
          </div>

          <h2 style={{ ...styles.sectionTitle, marginTop: '32px' }}>Milestones & Phases</h2>

          {Object.entries(fields).map(([fieldName, fieldData]) => {
            if (['status', 'lead', 'budget', 'completion'].includes(fieldName.toLowerCase())) {
              return null;
            }

            return (
              <div key={fieldName} style={styles.fieldCard}>
                <div style={styles.fieldHeader}>
                  <span style={styles.fieldName}>{fieldName}</span>
                </div>

                <div style={styles.dateRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <select
                      value={fieldData.status || 'On Track'}
                      onChange={(e) => handleFieldChange(fieldName, 'status', e.target.value)}
                      style={styles.select}
                      disabled={userPermission === 'viewer'}
                    >
                      <option value="On Track">On Track</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
                    <div>
                      <div
                        onClick={() => milestoneDateRefs.current[`${fieldName}-start`]?.showPicker()}
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          ref={(el) => {
                            milestoneDateRefs.current[`${fieldName}-start`] = el;
                          }}
                          type="date"
                          value={fieldData.startDate || ''}
                          onChange={(e) =>
                            handleFieldChange(fieldName, 'startDate', e.target.value)
                          }
                          style={styles.input}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date</label>
                    <div>
                      <div
                        onClick={() => milestoneDateRefs.current[`${fieldName}-end`]?.showPicker()}
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          ref={(el) => {
                            milestoneDateRefs.current[`${fieldName}-end`] = el;
                          }}
                          type="date"
                          value={fieldData.endDate || ''}
                          onChange={(e) =>
                            handleFieldChange(fieldName, 'endDate', e.target.value)
                          }
                          style={styles.input}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ KEEP THIS ONE - It's in the right place after the date fields */}
                {userPermission !== 'viewer' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Justification for Changes (Optional)
                    </label>
                    <textarea
                      value={justifications[fieldName] || ''}
                      onChange={(e) => setJustifications({
                        ...justifications,
                        [fieldName]: e.target.value
                      })}
                      style={styles.textarea}
                      placeholder="Optionally explain why you're making changes to this milestone..."
                      rows={2}
                      disabled={userPermission === 'viewer'}
                    />
                  </div>
                )}

              </div>
            );
          })}

          {userPermission !== 'viewer' && (
            <button
              style={styles.addFieldButton(hoveredItem === 'add-field')}
              onMouseEnter={() => setHoveredItem('add-field')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={handleAddField}
            >
              <Plus size={16} />
              Add Milestone / Phase
            </button>
          )}

          <div style={styles.buttonGroup}>
            <button
              style={styles.button(hoveredItem === 'cancel', 'default')}
              onMouseEnter={() => setHoveredItem('cancel')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={handleCancel}
            >
              <X size={16} />
              Cancel
            </button>

            <button
              style={styles.button(
                hoveredItem === 'save',
                'primary',
                isSaving || userPermission === 'viewer'
              )}
              onMouseEnter={() => setHoveredItem('save')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={handleSave}
              disabled={isSaving || userPermission === 'viewer'}
            >
              <CheckCircle size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {userPermission === 'viewer' && (
            <div style={styles.infoBox}>
              <AlertCircle size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
              You have view-only access to this plan. Contact the owner to request edit permissions.
            </div>
          )}
        </div>

        {/* 🆕 RIGHT COLUMN - Team & Permissions */}
        <div style={styles.rightSidebar}>
          <div style={styles.teamSection}>
            <div style={styles.teamHeader}>
              <Users size={20} style={{ color: '#3b82f6' }} />
              <h3 style={styles.teamTitle}>Team & Permissions</h3>
            </div>

            {/* Owner */}
            {teamMembers.filter(tm => tm.permission === 'owner').map(member => (
              <div key={member.userId} style={styles.teamMemberCard}>
                <div style={styles.teamMemberInfo}>
                  <div style={styles.avatar}>
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div style={styles.memberDetails}>
                    <div style={styles.memberName}>
                      {member.firstName} {member.lastName}
                      {member.userId === userData?.id && ' (You)'}
                    </div>
                    <div style={styles.memberEmail}>{member.email}</div>
                  </div>
                </div>
                {getPermissionBadge('owner')}
              </div>
            ))}

            {/* Editors & Viewers */}
            {teamMembers.filter(tm => tm.permission !== 'owner').map(member => (
              <div key={member.userId} style={styles.teamMemberCard}>
                <div style={styles.teamMemberInfo}>
                  <div style={styles.avatar}>
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div style={styles.memberDetails}>
                    <div style={styles.memberName}>
                      {member.firstName} {member.lastName}
                      {member.userId === userData?.id && ' (You)'}
                    </div>
                    <div style={styles.memberEmail}>{member.email}</div>
                  </div>
                </div>

                {userPermission === 'owner' ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={member.permission}
                      onChange={(e) => handleUpdatePermission(member.userId, e.target.value)}
                      style={{ ...styles.select, width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                      disabled={member.permission === 'owner'} // Optional: prevent changing owner dropdown
                    >
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      style={styles.removeButton(hoveredItem === `remove-${member.userId}`)}
                      onMouseEnter={() => setHoveredItem(`remove-${member.userId}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => handleRemoveTeamMember(member.userId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  getPermissionBadge(member.permission)
                )}
              </div>
            ))}

            {/* Add Team Member (Owner & Editor) */}
            {(userPermission === 'owner' || userPermission === 'editor') && (
              <>
                <div style={styles.addTeamRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Add Team Member</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Select a user...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Permission</label>
                    <select
                      value={selectedPermission}
                      onChange={(e) => setSelectedPermission(e.target.value)}
                      style={styles.select}
                    >
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>

                  <button
                    style={styles.button(hoveredItem === 'add-member', 'primary', !selectedUserId)}
                    onMouseEnter={() => setHoveredItem('add-member')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={handleAddTeamMember}
                    disabled={!selectedUserId}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                <div style={styles.infoBox}>
                  <strong>Permission Levels:</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li><strong>Owner:</strong> Full control including managing team members and permissions</li>
                    <li><strong>Editor:</strong> Can edit milestones, dates, and status</li>
                    <li><strong>Viewer:</strong> Can only view the plan (read-only access)</li>
                  </ul>
                  <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                    💡 <strong>Multiple owners allowed</strong> - Plans can have more than one owner
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 ADD MILESTONE MODAL */}
      {showAddMilestoneModal && (
        <div style={styles.addMilestoneModal}>
          <div style={styles.addMilestoneModalContent}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                <Plus size={24} style={{ color: '#3b82f6' }} />
                Add New Milestone
              </div>
              <button
                style={styles.modalCloseButton(hoveredItem === 'close-modal')}
                onMouseEnter={() => setHoveredItem('close-modal')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleCancelAddMilestone}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Milestone Name *</label>
                <input
                  type="text"
                  value={newMilestoneName}
                  onChange={(e) => setNewMilestoneName(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., Phase 1, Sprint 2, Design Review"
                  autoFocus
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Initial Status</label>
                <select
                  value={newMilestoneStatus}
                  onChange={(e) => setNewMilestoneStatus(e.target.value)}
                  style={styles.select}
                >
                  <option value="On Track">On Track</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                </select>
              </div>

              <div style={styles.dateRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Start Date</label>
                  <div
                    onClick={() => milestoneStartRef.current?.showPicker()}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      ref={milestoneStartRef}
                      type="date"
                      value={newMilestoneStartDate}
                      onChange={(e) => setNewMilestoneStartDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>End Date</label>

                  <div
                    onClick={() => milestoneEndRef.current?.showPicker()}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      ref={milestoneEndRef}
                      type="date"
                      value={newMilestoneEndDate}
                      onChange={(e) => setNewMilestoneEndDate(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.infoBox}>
                💡 <strong>Tip:</strong> You can edit the milestone details after adding it. Dates are optional but help with timeline tracking.
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.button(hoveredItem === 'cancel-milestone', 'default')}
                onMouseEnter={() => setHoveredItem('cancel-milestone')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleCancelAddMilestone}
              >
                <X size={16} />
                Cancel
              </button>

              <button
                style={styles.button(hoveredItem === 'add-milestone', 'primary', !newMilestoneName.trim())}
                onMouseEnter={() => setHoveredItem('add-milestone')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleConfirmAddMilestone}
                disabled={!newMilestoneName.trim()}
              >
                <Plus size={16} />
                Add Milestone
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEditPlan;