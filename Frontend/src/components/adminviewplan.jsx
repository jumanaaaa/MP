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
  Trash2,
  CheckCircle,
  Shield,
  Eye,
  Lock,
  History
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
  const [hoveredMilestone, setHoveredMilestone] = useState(null);
  const tooltipTimeoutRef = useRef(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [showMonthBoxes, setShowMonthBoxes] = useState(false);
  const [activeTab, setActiveTab] = useState('Master Plan');
  // 🆕 History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPlanHistory, setSelectedPlanHistory] = useState(null);
  const [planHistory, setPlanHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

  // 🆕 Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  const [emailsSentToday, setEmailsSentToday] = useState(() => {
    try {
      const sent = localStorage.getItem('emailsSentToday');
      const sentDate = localStorage.getItem('emailsSentDate');
      const today = new Date().toDateString();

      if (sentDate !== today) {
        localStorage.setItem('emailsSentDate', today);
        localStorage.removeItem('emailsSentToday');
        return [];
      }

      return sent ? JSON.parse(sent) : [];
    } catch (error) {
      return [];
    }
  });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const ganttRef = useRef(null);
  const fullCardRef = useRef(null);
  const dropdownRef = useRef(null);
  const [planLocks, setPlanLocks] = useState({}); // { planId: lockInfo }
  const [isCheckingLocks, setIsCheckingLocks] = useState(false);
  const [planPermissions, setPlanPermissions] = useState({}); // 🆕 { planId: 'owner'|'editor'|'viewer' }

  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'waterfall'

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === "number") return new Date(dateStr);

    dateStr = String(dateStr).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.split("T")[0].split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    }

    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split(/[\/\-]/);
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    console.warn("⚠️ Unrecognized date format:", dateStr);
    return null;
  };

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

  const fetchActiveLocks = async () => {
    try {
      const response = await fetch('http://localhost:3000/plan/locks/active', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔒 Active locks:', data.locks);

        // Convert array to map for easy lookup
        const locksMap = {};
        data.locks.forEach(lock => {
          locksMap[lock.planId] = lock;
        });

        setPlanLocks(locksMap);
      }
    } catch (error) {
      console.error('❌ Failed to fetch locks:', error);
    }
  };

  // 🆕 Fetch user permissions for all plans
  const fetchPlanPermissions = async () => {
    if (!userData || masterPlans.length === 0) return;

    try {
      console.log('🔐 Fetching plan permissions...');
      console.log("MasterPlans available:", masterPlans);

      const permissionsMap = {};

      for (const plan of masterPlans) {
        try {
          const response = await fetch(
            `http://localhost:3000/plan/master/${plan.id}/permission`,
            {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (response.ok) {
            const data = await response.json();
            permissionsMap[plan.id] = data.permission || "viewer";
            console.log(`   Plan ${plan.id}: ${permissionsMap[plan.id]}`);
          } else {
            console.warn(
              `   Plan ${plan.id}: Permission endpoint returned ${response.status}, using fallback`
            );
            permissionsMap[plan.id] = "viewer"; // fallback!!!
          }
        } catch (err) {
          console.warn(
            `   Plan ${plan.id}: Permission fetch failed, using fallback`,
            err.message
          );
          permissionsMap[plan.id] = "viewer"; // fallback!!!
        }
      }

      setPlanPermissions(permissionsMap);
      console.log("✅ Permissions loaded:", permissionsMap);

      if (Object.keys(permissionsMap).length === 0) {
        console.log('⚠️ No permissions loaded - using ownership-based access control');
      }
    } catch (error) {
      console.error('❌ Failed to fetch permissions:', error);
      console.log('⚠️ Falling back to ownership-based access control');
    }
  };

  // Auto-calculate milestone status based on dates and previous milestone
  const calculateMilestoneStatus = (milestone, previousMilestone, today) => {
    const startDate = parseLocalDate(milestone.startDate);
    const endDate = parseLocalDate(milestone.endDate);

    // If completed, always return Completed
    if (milestone.status?.toLowerCase().includes('complete')) {
      return 'Completed';
    }

    // If end date has passed and not completed = Delayed
    if (endDate < today) {
      return 'Delayed';
    }

    // If previous milestone is Delayed, this one is At Risk
    if (previousMilestone?.status?.toLowerCase().includes('delay')) {
      return 'At Risk';
    }

    // If within period or before start date = On Track
    if (today <= endDate) {
      return 'On Track';
    }

    return 'On Track'; // Default
  };

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

  // 🆕 Fetch permissions when user and plans are loaded
  useEffect(() => {
    if (userData && masterPlans.length > 0) {
      fetchPlanPermissions();
    }
  }, [userData, masterPlans]);

  // Auto-mark as Delayed if deadline passed
  useEffect(() => {
    const checkAndMarkDelayed = async () => {
      if (!userData || masterPlans.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const plan of masterPlans) {
        // 🆕 Check permission instead of createdBy
        const permission = planPermissions[plan.id];
        if (permission !== 'owner' && permission !== 'editor') {
          continue; // Skip if not owner or editor
        }

        let needsUpdate = false;
        const updatedFields = { ...plan.fields };

        if (plan.fields) {
          Object.entries(plan.fields).forEach(([key, field]) => {
            if (key.toLowerCase() === 'status' || key.toLowerCase() === 'lead' ||
              key.toLowerCase() === 'budget' || key.toLowerCase() === 'completion') {
              return;
            }

            if (field.endDate) {
              const endDate = parseLocalDate(field.endDate);
              if (endDate < today &&
                field.status !== 'Completed' &&
                field.status !== 'Delayed') {
                console.log(`⏰ Auto-marking ${key} as Delayed (deadline passed)`);
                updatedFields[key] = { ...field, status: 'Delayed' };
                needsUpdate = true;
              }
            }
          });
        }

        if (needsUpdate) {
          try {
            const response = await fetch(`http://localhost:3000/plan/master/${plan.id}`, {
              method: 'PUT',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                project: plan.project,
                startDate: plan.startDate,
                endDate: plan.endDate,
                fields: updatedFields
              })
            });

            if (response.ok) {
              console.log(`✅ Auto-updated plan ${plan.project} with Delayed status`);
              const updatedPlans = masterPlans.map(p =>
                p.id === plan.id ? { ...p, fields: updatedFields } : p
              );
              setMasterPlans(updatedPlans);
            }
          } catch (error) {
            console.error('Failed to auto-update delayed status:', error);
          }
        }
      }
    };

    checkAndMarkDelayed();
    const interval = setInterval(checkAndMarkDelayed, 60000 * 60);

    return () => clearInterval(interval);
  }, [userData, masterPlans, planPermissions]);

  // Check for milestone deadlines and send emails
  useEffect(() => {
    const checkMilestoneDeadlines = async () => {
      if (!userData || masterPlans.length === 0) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (currentHour !== 8 || currentMinute < 30 || currentMinute > 31) {
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const plan of masterPlans) {
        // 🆕 Check permission instead of createdBy
        const permission = planPermissions[plan.id];
        if (permission !== 'owner') {
          continue; // Only owners get email notifications
        }

        const emailKey = `${plan.id}-${today.toDateString()}`;
        if (emailsSentToday.includes(emailKey)) {
          continue;
        }

        const milestones = [];
        if (plan.fields) {
          Object.entries(plan.fields).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'status' && key.toLowerCase() !== 'lead' &&
              key.toLowerCase() !== 'budget' && key.toLowerCase() !== 'completion') {
              milestones.push({ name: key, status: value });
            }
          });
        }

        const planEndDate = new Date(plan.endDate);
        planEndDate.setHours(0, 0, 0, 0);

        const isDueToday = planEndDate.getTime() === today.getTime();
        const hasIncompleteMilestones = milestones.some(m =>
          !m.status?.toLowerCase().includes('complete')
        );

        if (isDueToday && hasIncompleteMilestones) {
          try {
            console.log(`📧 Sending deadline reminder for plan: ${plan.project}`);

            const response = await fetch('http://localhost:3000/notifications/milestone-deadline', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                planId: plan.id,
                projectName: plan.project,
                milestones: milestones,
                dueDate: plan.endDate,
                userEmail: userData.email,
                userName: `${userData.firstName} ${userData.lastName}`
              })
            });

            if (response.ok) {
              console.log(`✅ Email sent successfully for ${plan.project}`);

              const newEmailsSent = [...emailsSentToday, emailKey];
              setEmailsSentToday(newEmailsSent);
              try {
                localStorage.setItem('emailsSentToday', JSON.stringify(newEmailsSent));
              } catch (error) {
                console.error('Failed to save email sent status:', error);
              }
            } else {
              console.error(`❌ Failed to send email for ${plan.project}:`, await response.text());
            }
          } catch (error) {
            console.error(`💥 Error sending email for ${plan.project}:`, error);
          }
        }
      }
    };

    checkMilestoneDeadlines();
    const interval = setInterval(checkMilestoneDeadlines, 60000);

    return () => clearInterval(interval);
  }, [userData, masterPlans, emailsSentToday, planPermissions]);

  useEffect(() => {
    let filtered = masterPlans;

    if (selectedProjects.length > 0) {
      filtered = filtered.filter(plan => selectedProjects.includes(plan.project));
    }

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

  // 🆕 NEW DAILY MILESTONE DEADLINE CHECK (runs once per day on first page load)
  useEffect(() => {
    console.log("🔥 Daily reminder useEffect triggered");

    if (!userData) {
      console.log("⛔ userData not ready yet.");
      return;
    }

    if (!Array.isArray(masterPlans) || masterPlans.length === 0) {
      console.log("⛔ masterPlans not ready yet.");
      return;
    }

    // Continue only once permissions have loaded
    if (Object.keys(planPermissions).length === 0) {
      return;  // Try again when permissions load
    }


    const todayKey = new Date().toISOString().split("T")[0];
    const lastRun = localStorage.getItem("deadlineEmailLastRun");

    // If already executed today → skip
    if (lastRun === todayKey) return;

    console.log("⏰ Running Daily Milestone Deadline Check");

    masterPlans.forEach(plan => {
      const myPermission = planPermissions[plan.id];

      // Only owners + editors get notified
      if (!["owner", "editor"].includes(myPermission)) return;

      // Extract milestones
      const milestones = [];
      if (plan.fields) {
        Object.entries(plan.fields).forEach(([key, field]) => {
          if (
            key.toLowerCase() !== "status" &&
            key.toLowerCase() !== "lead" &&
            key.toLowerCase() !== "budget" &&
            key.toLowerCase() !== "completion"
          ) {
            milestones.push({
              name: key,
              status: field.status,
              startDate: field.startDate,
              endDate: field.endDate
            });
          }
        });
      }

      const today = new Date().toDateString();

      milestones.forEach(m => {
        if (!m.endDate) return;

        const due = new Date(m.endDate).toDateString();

        // Only fire on milestones due TODAY
        if (due !== today) return;

        // Skip completed milestones
        if (m.status?.toLowerCase().includes("complete")) return;

        console.log(`📧 Sending reminder for milestone "${m.name}" in project "${plan.project}"`);

        fetch("http://localhost:3000/notifications/milestone-deadline", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: plan.id,
            projectName: plan.project,
            milestones: milestones,
            dueDate: m.endDate,
            userEmail: userData.email,
            userName: `${userData.firstName} ${userData.lastName}`
          })
        });
      });
    });

    // Mark the check as completed for today
    localStorage.setItem("deadlineEmailLastRun", todayKey);

  }, [userData, masterPlans, planPermissions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProjectDropdownOpen(false);
      }
    };

    if (isProjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProjectDropdownOpen]);

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

  useEffect(() => {
    if (masterPlans.length > 0) {
      fetchActiveLocks();

      const lockInterval = setInterval(() => {
        fetchActiveLocks();
      }, 10000);

      return () => clearInterval(lockInterval);
    }
  }, [masterPlans]);

  // 🆕 Fetch Plan History
  const fetchPlanHistory = async (planId, planName) => {
    setIsLoadingHistory(true);
    setShowHistoryModal(true);
    setSelectedPlanHistory({ id: planId, name: planName });

    try {
      console.log(`📜 Fetching history for plan ${planId}...`);
      const response = await fetch(`http://localhost:3000/plan/master/${planId}/history`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ History loaded:', data.history);
        setPlanHistory(data.history || []);
      } else {
        console.error('❌ Failed to fetch history:', response.status);
        setPlanHistory([]);
        alert('Failed to load history. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error fetching history:', error);
      setPlanHistory([]);
      alert('Network error. Please check your connection.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 🆕 Format change type for display
  const formatChangeType = (changeType) => {
    const types = {
      'status_changed': '🔄 Status Changed',
      'dates_changed': '📅 Dates Changed',
      'milestone_added': '➕ Milestone Added',
      'milestone_deleted': '🗑️ Milestone Deleted',
      'project_renamed': '✏️ Project Renamed',       // 🆕 NEW
      'project_dates_changed': '📆 Project Timeline Changed'  // 🆕 NEW
    };
    return types[changeType] || changeType;
  };

  // 🆕 Get color for change type
  const getChangeTypeColor = (changeType) => {
    const colors = {
      'status_changed': '#3b82f6',
      'dates_changed': '#f59e0b',
      'milestone_added': '#10b981',
      'milestone_deleted': '#ef4444',
      'project_renamed': '#8b5cf6',           // 🆕 NEW (purple)
      'project_dates_changed': '#f59e0b'      // 🆕 NEW (orange)
    };
    return colors[changeType] || '#94a3b8';
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

  const handleEditPlan = async (plan) => {
    // 🆕 Check permission with fallback to ownership
    const permission = planPermissions[plan.id];

    // If permissions not loaded, fall back to ownership check
    if (permission === undefined) {
      if (plan.createdBy !== userData?.id) {
        alert('❌ You can only edit plans that you created.');
        return;
      }
    } else {
      // Use permission system if available
      if (permission === 'viewer') {
        alert('❌ You have view-only access to this plan. Contact the owner for edit permissions.');
        return;
      }

      if (!permission) {
        alert('❌ You do not have permission to edit this plan.');
        return;
      }
    }

    console.log('✏️ AdminViewPlan - Editing plan:', plan.project);

    // Check if plan is locked by someone else
    const lock = planLocks[plan.id];

    if (lock && lock.userId !== userData?.id) {
      const minutesAgo = Math.floor((new Date() - new Date(lock.lastActivity)) / 60000);

      const confirmTakeover = window.confirm(
        `⚠️ This plan is currently being edited by ${lock.lockedBy}.\n\n` +
        `Last activity: ${minutesAgo} minute(s) ago\n` +
        `Lock expires in: ${lock.minutesRemaining} minute(s)\n\n` +
        `Do you want to take over editing? This will disconnect them.`
      );

      if (!confirmTakeover) {
        return;
      }

      // Attempt takeover
      try {
        const response = await fetch(`http://localhost:3000/plan/lock/${plan.id}/takeover`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });

        if (!response.ok) {
          alert('❌ Failed to take over lock. Please try again.');
          return;
        }

        console.log('✅ Lock takeover successful');
      } catch (error) {
        console.error('❌ Takeover error:', error);
        alert('❌ Failed to take over lock. Please try again.');
        return;
      }
    }

    // Navigate to edit page
    sessionStorage.setItem('editingPlanId', plan.id);
    sessionStorage.setItem('editingPlanData', JSON.stringify(plan));
    window.location.href = '/admineditplan';
  };

  const handleDeletePlan = (plan) => {
    // 🆕 Check permission with fallback to ownership
    const permission = planPermissions[plan.id];

    // If permissions not loaded, fall back to ownership check
    if (permission === undefined) {
      if (plan.createdBy !== userData?.id) {
        alert('❌ You can only delete plans that you created.');
        return;
      }
    } else {
      // Use permission system if available
      if (permission !== 'owner') {
        alert('❌ Only the plan owner can delete this plan.');
        return;
      }
    }

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

  // Handle milestone status change
  const handleChangeStatus = (plan, milestoneName, currentStatus) => {
  // 🆕 Check permission - only owners can change status
  const permission = planPermissions[plan.id];

  if (permission !== 'owner') {
    alert('❌ Only the plan owner can change milestone status.');
    return;
  }

    setSelectedMilestone({ plan, milestoneName, currentStatus });
    setNewStatus(currentStatus);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedMilestone || !newStatus) return;

    const { plan, milestoneName } = selectedMilestone;

    try {
      console.log(`🔄 Updating ${milestoneName} status to ${newStatus}`);

      const updatedFields = {
        ...plan.fields,
        [milestoneName]: {
          ...plan.fields[milestoneName],
          status: newStatus
        }
      };

      const response = await fetch(`http://localhost:3000/plan/master/${plan.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project: plan.project,
          startDate: plan.startDate,
          endDate: plan.endDate,
          fields: updatedFields
        })
      });

      if (response.ok) {
        console.log('✅ Status updated successfully');
        const updatedPlans = masterPlans.map(p =>
          p.id === plan.id ? { ...p, fields: updatedFields } : p
        );
        setMasterPlans(updatedPlans);
        setFilteredPlans(updatedPlans.filter(p => selectedProjects.length === 0 || selectedProjects.includes(p.project)));
        alert(`Status updated to "${newStatus}" successfully!`);
      } else {
        console.error('Failed to update status:', await response.text());
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setShowStatusModal(false);
      setSelectedMilestone(null);
      setNewStatus('');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  // 🆕 Get permission badge component
  const getPermissionBadge = (planId) => {
    const permission = planPermissions[planId];
    if (!permission) return null;

    const badgeStyles = {
      owner: { bg: '#3b82f6', icon: Shield },
      editor: { bg: '#10b981', icon: Edit },
      viewer: { bg: '#64748b', icon: Eye }
    };

    const style = badgeStyles[permission];
    if (!style) return null;

    const Icon = style.icon;

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '6px',
        backgroundColor: style.bg + '20',
        border: `1px solid ${style.bg}40`,
        fontSize: '11px',
        fontWeight: '600',
        color: style.bg,
        textTransform: 'uppercase',
        width: 'fit-content',          // 🆕 ADDED - Makes width match content
        alignSelf: 'flex-start'        // 🆕 ADDED - Prevents stretching in flex container
      }}>
        <Icon size={12} />
        {permission}
      </div>
    );
  };

  // Helper function to get last milestone status
  const getLastMilestoneStatus = (plan) => {
    if (!plan.fields) return null;

    const milestones = [];
    Object.entries(plan.fields).forEach(([key, field]) => {
      if (
        key.toLowerCase() !== 'status' &&
        key.toLowerCase() !== 'lead' &&
        key.toLowerCase() !== 'budget' &&
        key.toLowerCase() !== 'completion'
      ) {
        milestones.push({
          name: key,
          status: field.status || field,
          endDate: field.endDate ? parseLocalDate(field.endDate) : null
        });
      }
    });

    if (milestones.length === 0) return null;

    // Sort by end date, latest last
    milestones.sort((a, b) => {
      if (!a.endDate) return -1;
      if (!b.endDate) return 1;
      return a.endDate - b.endDate;
    });

    return milestones[milestones.length - 1].status;
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: '30px',
      background: isDarkMode
        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: '"Montserrat", sans-serif',
      transition: 'all 0.3s ease',
      overflowX: 'hidden'
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
      top: '-50px',
      bottom: '0px',
      width: '2px',
      backgroundImage: 'linear-gradient(to bottom, #ef4444 60%, transparent 60%)',
      backgroundSize: '2px 16px',
      backgroundRepeat: 'repeat-y',
      zIndex: 100,
      pointerEvents: 'none'
    },
    todayLabel: {
      position: 'absolute',
      top: '-35px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#ef4444',
      color: '#fff',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '700',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 101
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
    statusModal: {
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
    statusModalContent: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      maxWidth: '400px',
      width: '90%'
    },
    statusModalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px'
    },
    statusModalSubtitle: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginBottom: '24px'
    },
    statusSelect: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      fontWeight: '500',
      outline: 'none',
      cursor: 'pointer',
      marginBottom: '24px'
    },
    ganttContainer: {
      marginTop: '24px',
      overflowX: 'auto',
      overflowY: 'visible',
      position: 'relative',
      paddingTop: '60px',
      paddingBottom: '30px',
      minHeight: '300px',
      maxWidth: '100%'
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
    monthBoxOverlay: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      borderRight: isDarkMode ? '2px solid rgba(100,116,139,0.8)' : '2px solid rgba(148,163,184,0.8)',
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: 'none',
      pointerEvents: 'none',
      zIndex: 1
    },
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
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center'
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
      overflow: 'visible'
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
    actionButton: (isHovered, type, disabled = false) => ({
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: disabled
        ? (isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,0.3)')
        : (isHovered
          ? (type === 'edit'
            ? 'rgba(59,130,246,0.1)'
            : type === 'delete'
              ? 'rgba(239,68,68,0.1)'
              : type === 'history'  // 🆕 ADD THIS
                ? 'rgba(139,92,246,0.1)'  // Purple for history
                : 'rgba(59,130,246,0.1)')
          : (isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)')),
      color: disabled
        ? (isDarkMode ? '#475569' : '#94a3b8')
        : (isHovered
          ? (type === 'edit'
            ? '#3b82f6'
            : type === 'delete'
              ? '#ef4444'
              : type === 'history'  // 🆕 ADD THIS
                ? '#8b5cf6'  // Purple
                : '#3b82f6')
          : (isDarkMode ? '#94a3b8' : '#64748b')),
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: (isHovered && !disabled) ? 'scale(1.1)' : 'scale(1)',
      opacity: disabled ? 0.5 : 1
    }),
    lockBadge: (isLocked, isOwnLock) => ({
      position: 'absolute',
      top: '12px',
      right: '12px',
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: isOwnLock
        ? 'rgba(16, 185, 129, 0.15)'
        : 'rgba(239, 68, 68, 0.15)',
      color: isOwnLock ? '#10b981' : '#ef4444',
      border: `1px solid ${isOwnLock ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
      zIndex: 10
    }),
    changeStatusButton: (isHovered) => ({
      padding: '6px 12px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isHovered ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
      color: isHovered ? '#059669' : '#10b981',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: '600',
      gap: '4px',
      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      pointerEvents: 'auto'
    }),
    statusBadge: (status) => {
      const colors = {
        'Completed': { bg: '#3b82f620', text: '#3b82f6' },
        'On Track': { bg: '#10b98120', text: '#10b981' },
        'At Risk': { bg: '#f59e0b20', text: '#f59e0b' },
        'Delayed': { bg: '#ef444420', text: '#ef4444' },
        'In Progress': { bg: '#10b98120', text: '#10b981' },
        'Pending': { bg: '#10b98120', text: '#10b981' },
        'Planning': { bg: '#10b98120', text: '#10b981' },
        'On Hold': { bg: '#ef444420', text: '#ef4444' },
        'Ongoing': { bg: '#10b98120', text: '#10b981' }
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
    },
    rulerTick: {
      position: 'absolute',
      bottom: 0,
      width: '1px',
      height: '8px',
      backgroundColor: isDarkMode ? '#64748b' : '#cbd5e1'
    },
    rulerMajorTick: {
      position: 'absolute',
      bottom: 0,
      width: '2px',
      height: '12px',
      backgroundColor: isDarkMode ? '#94a3b8' : '#94a3b8'
    },
    milestoneTooltip: {
      position: 'absolute',
      top: '-113px',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '8px',
      maxWidth: '400px',
      minWidth: '200px',
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)',
      zIndex: 9999,
      pointerEvents: 'auto',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      wordBreak: 'break-word'
    },
    historyModal: {
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
    historyModalContent: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column'
    },
    historyModalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: isDarkMode ? '2px solid rgba(75,85,99,0.5)' : '2px solid rgba(226,232,240,0.8)'
    },
    historyModalTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    historyModalSubtitle: {
      fontSize: '14px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginTop: '4px'
    },
    historyList: {
      flex: 1,
      overflowY: 'auto',
      marginBottom: '20px'
    },
    historyItem: (isHovered) => ({
      backgroundColor: isHovered
        ? (isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)')
        : (isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)'),
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      transition: 'all 0.2s ease',
      transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
    }),
    historyItemHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    historyChangeType: (color) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: color + '20',
      color: color,
      border: `1px solid ${color}40`
    }),
    historyTimestamp: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontWeight: '500'
    },
    historyMilestoneName: {
      fontSize: '16px',
      fontWeight: '700',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      marginBottom: '8px'
    },
    historyChangeDetails: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      fontSize: '14px',
      color: isDarkMode ? '#cbd5e1' : '#475569'
    },
    historyValue: (isOld) => ({
      padding: '6px 12px',
      borderRadius: '8px',
      backgroundColor: isOld
        ? (isDarkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)')
        : (isDarkMode ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)'),
      border: isOld
        ? '1px solid rgba(239,68,68,0.3)'
        : '1px solid rgba(16,185,129,0.3)',
      color: isOld ? '#ef4444' : '#10b981',
      fontWeight: '600',
      fontSize: '13px'
    }),
    historyChangedBy: {
      fontSize: '12px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    historyEmptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '16px'
    },
    historyLoadingState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: '16px'
    },
    closeHistoryButton: (isHovered) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: isHovered ? '#3b82f6' : isDarkMode ? '#4b5563' : '#e5e7eb',
      color: isHovered ? '#fff' : isDarkMode ? '#e2e8f0' : '#374151',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
    })
  };

  // Continue with the render method from the original AdminViewPlan...
  // Due to length, I'll provide the key sections with permissions integrated

  return (
    <div style={styles.page}>
      {/* Header section remains the same */}
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

      {/* Tabs */}
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

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: isDarkMode ? '#e2e8f0' : '#1e293b', margin: 0 }}>
          Master Plans Timeline
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* 🆕 HISTORY BUTTON - Only show if single project selected */}
          {selectedProjects.length === 1 && filteredPlans.length === 1 && (
            <button
              style={{
                ...styles.createButton(hoveredItem === 'history'),
                backgroundColor: hoveredItem === 'history' ? '#8b5cf6' : '#a78bfa',
              }}
              onMouseEnter={() => setHoveredItem('history')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => fetchPlanHistory(filteredPlans[0].id, filteredPlans[0].project)}
            >
              <History size={16} />
              View History
            </button>
          )}

          <button
            style={styles.createButton(hoveredItem === 'download')}
            onMouseEnter={() => setHoveredItem('download')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={async () => {
              try {
                const element = fullCardRef.current;
                if (!element) return alert("Nothing to download!");

                const canvas = await html2canvas(element, {
                  backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                  scale: 2,
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

      {/* Filter section */}
      <div style={styles.filterContainer}>
        <input
          type="text"
          placeholder="Search by project, lead, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />

        {/* Month Grid Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
          onClick={() => setShowMonthBoxes(!showMonthBoxes)}
        >
          <div style={styles.checkbox(showMonthBoxes)}>
            {showMonthBoxes && '✓'}
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: isDarkMode ? '#e2e8f0' : '#374151'
          }}>
            Show Month Grid
          </span>
        </div>

        {/* 🆕 VIEW MODE TOGGLE - Only show when single project selected */}
        {selectedProjects.length === 1 && filteredPlans.length === 1 && (
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
            border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: viewMode === 'timeline' ? '#3b82f6' : 'transparent',
                color: viewMode === 'timeline' ? '#fff' : (isDarkMode ? '#e2e8f0' : '#64748b'),
                boxShadow: viewMode === 'timeline' ? '0 2px 8px rgba(59,130,246,0.3)' : 'none'
              }}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
            <button
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: viewMode === 'waterfall' ? '#3b82f6' : 'transparent',
                color: viewMode === 'waterfall' ? '#fff' : (isDarkMode ? '#e2e8f0' : '#64748b'),
                boxShadow: viewMode === 'waterfall' ? '0 2px 8px rgba(59,130,246,0.3)' : 'none'
              }}
              onClick={() => setViewMode('waterfall')}
            >
              Waterfall
            </button>
          </div>
        )}

        <div style={{ position: 'relative' }} ref={dropdownRef}>
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

              <div style={{
                height: '1px',
                backgroundColor: isDarkMode ? 'rgba(75,85,99,0.5)' : 'rgba(226,232,240,0.8)',
                margin: '8px 12px'
              }} />

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

      {/* Main content with Gantt chart - showing permission badge integration */}
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
          ref={fullCardRef}
          style={styles.card(hoveredCard === 'gantt')}
          onMouseEnter={() => setHoveredCard('gantt')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div style={styles.cardGlow}></div>

          <div style={styles.projectTitle}>
            <div style={styles.projectName}>
              {selectedProjects.length === 0 ? 'Master Plan Overview' :
                selectedProjects.length === 1 ? (
                  <>
                    {selectedProjects[0]}
                    {/* 🆕 Show permission badge */}
                    {filteredPlans.length === 1 && getPermissionBadge(filteredPlans[0].id)}
                  </>
                ) : `${selectedProjects.length} Projects Selected`}
            </div>
            {selectedProjects.length === 1 && filteredPlans.length === 1 && (
              <div style={styles.projectTitleRight}>
                {/* 🆕 HISTORY BUTTON */}
                <button
                  style={styles.actionButton(hoveredItem === 'history-single', 'history')}
                  onMouseEnter={() => setHoveredItem('history-single')}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => fetchPlanHistory(filteredPlans[0].id, filteredPlans[0].project)}
                  title="View project history"
                >
                  <History size={16} />
                </button>

                {/* Edit button */}
                {planPermissions[filteredPlans[0].id] !== 'viewer' && (
                  <button
                    style={styles.actionButton(
                      hoveredItem === 'edit-single',
                      'edit',
                      planPermissions[filteredPlans[0].id] === 'viewer'
                    )}
                    onMouseEnter={() => setHoveredItem('edit-single')}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => handleEditPlan(filteredPlans[0])}
                    title={planPermissions[filteredPlans[0].id] === 'viewer' ? 'View-only access' : 'Edit this plan'}
                    disabled={planPermissions[filteredPlans[0].id] === 'viewer'}
                  >
                    <Edit size={16} />
                  </button>
                )}

                {/* Delete button */}
                {((planPermissions[filteredPlans[0].id] === 'owner') ||
                  (planPermissions[filteredPlans[0].id] === undefined && filteredPlans[0].createdBy === userData?.id)) && (
                    <button
                      style={styles.actionButton(hoveredItem === 'delete-single', 'delete')}
                      onMouseEnter={() => setHoveredItem('delete-single')}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => handleDeletePlan(filteredPlans[0])}
                      title="Delete this plan"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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

          {/* Gantt chart rendering continues... with permission badges on each plan row */}
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

                const allDates = [];

                filteredPlans.forEach((plan) => {
                  if (plan.startDate) allDates.push(parseLocalDate(plan.startDate));
                  if (plan.endDate) allDates.push(parseLocalDate(plan.endDate));

                  if (plan.fields) {
                    Object.values(plan.fields).forEach((field) => {
                      if (field.startDate) allDates.push(parseLocalDate(field.startDate));
                      if (field.endDate) allDates.push(parseLocalDate(field.endDate));
                    });
                  }
                });

                const validDates = allDates.filter((d) => d && !isNaN(d));
                const earliestStart = new Date(Math.min(...validDates));
                const latestEnd = new Date(Math.max(...validDates));

                console.log("📆 Timeline boundaries:", earliestStart.toLocaleDateString(), "→", latestEnd.toLocaleDateString());

                const totalTimelineDays = Math.max(1, (latestEnd - earliestStart) / (1000 * 60 * 60 * 24));
                console.log("📊 Total timeline days:", totalTimelineDays);

                const totalMonths = Math.ceil((latestEnd - earliestStart) / (1000 * 60 * 60 * 24 * 30)) + 1;
                const months = [];

                for (let i = 0; i < totalMonths; i++) {
                  const monthDate = new Date(earliestStart);
                  monthDate.setMonth(earliestStart.getMonth() + i);
                  months.push({
                    label: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    date: new Date(monthDate)
                  });
                }

                const getMonthIndex = (date) => {
                  for (let i = 0; i < months.length; i++) {
                    const m = months[i].date;
                    if (date.getFullYear() === m.getFullYear() && date.getMonth() === m.getMonth()) {
                      return i;
                    }
                  }
                  return -1;
                };

                let todayMonthIndex = -1;
                let todayPercentInMonth = 0;

                for (let i = 0; i < months.length; i++) {
                  const monthStart = new Date(months[i].date);
                  monthStart.setDate(1);
                  monthStart.setHours(0, 0, 0, 0);

                  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
                  monthEnd.setHours(23, 59, 59, 999);

                  if (today >= monthStart && today <= monthEnd) {
                    todayMonthIndex = i;
                    const daysInMonth = monthEnd.getDate();
                    const dayOfMonth = today.getDate();
                    todayPercentInMonth = (dayOfMonth / daysInMonth) * 100;

                    console.log('📍 Today Line FOUND:', {
                      monthIndex: i,
                      monthLabel: months[i].label,
                      monthStart: monthStart.toLocaleDateString(),
                      monthEnd: monthEnd.toLocaleDateString(),
                      todayDate: today.toLocaleDateString(),
                      dayOfMonth,
                      daysInMonth,
                      percentInMonth: todayPercentInMonth.toFixed(2) + '%'
                    });
                    break;
                  }
                }

                if (todayMonthIndex === -1 && today < months[0].date) {
                  console.log('⚠️ Today is BEFORE the timeline starts');
                }

                if (todayMonthIndex === -1 && today > new Date(months[months.length - 1].date.getFullYear(), months[months.length - 1].date.getMonth() + 1, 0)) {
                  console.log('⚠️ Today is AFTER the timeline ends');
                }

                console.log('📍 Today Line Debug:', {
                  todayMonthIndex,
                  todayPercentInMonth: todayPercentInMonth.toFixed(2) + '%',
                  todayDate: today.toLocaleDateString(),
                  monthCount: months.length,
                  firstMonth: months[0].label,
                  lastMonth: months[months.length - 1].label
                });

                const getPhaseColor = (status) => {
                  const statusLower = status?.toLowerCase() || '';
                  if (statusLower.includes('complete')) return '#3b82f6';
                  if (statusLower.includes('on track')) return '#10b981';
                  if (statusLower.includes('at risk')) return '#f59e0b';
                  if (statusLower.includes('delay')) return '#ef4444';
                  return '#94a3b8';
                };

                return (
                  <div style={{ position: 'relative', minHeight: '100%' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                      gap: '0',
                      marginBottom: '16px',
                      backgroundColor: isDarkMode ? '#4b5563' : '#f8fafc',
                      borderRadius: '12px',
                      position: 'relative',
                      gridColumnGap: '0',
                      gridRowGap: '0'
                    }}>
                      <div style={styles.taskHeader}>Project</div>
                      {months.map((month, idx) => (
                        <div key={idx} style={{
                          ...styles.monthHeader,
                          minWidth: 0,
                          width: '100%',
                          position: 'relative',
                          borderBottom: isDarkMode ? '2px solid #4b5563' : '2px solid #cbd5e1',
                          borderRight: idx === months.length - 1
                            ? 'none'
                            : (showMonthBoxes
                              ? (isDarkMode ? '2px solid rgba(100,116,139,0.8)' : '2px solid rgba(148,163,184,0.8)')
                              : 'none')
                        }}>
                          {month.label}
                          {[0, 25, 50, 75, 100].map((percent, tickIdx) => (
                            <div
                              key={tickIdx}
                              style={{
                                ...(tickIdx === 0 || tickIdx === 4 ? styles.rulerMajorTick : styles.rulerTick),
                                left: `calc(${percent}% - 1px)`
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    {filteredPlans.map((plan) => {
                      const projectStart = parseLocalDate(plan.startDate);
                      const projectEnd = parseLocalDate(plan.endDate);

                      const phases = [];

                      if (plan.fields) {
                        Object.entries(plan.fields).forEach(([key, fieldData], index) => {
                          if (
                            key.toLowerCase() !== "status" &&
                            key.toLowerCase() !== "lead" &&
                            key.toLowerCase() !== "budget" &&
                            key.toLowerCase() !== "completion"
                          ) {
                            phases.push({
                              name: key,
                              status: fieldData.status || fieldData,
                              startDate: parseLocalDate(fieldData.startDate) || null,
                              endDate: parseLocalDate(fieldData.endDate) || null,
                              color: getPhaseColor(fieldData.status || fieldData),
                            });
                          }
                        });
                      }

                      // 🆕 WATERFALL MODE - Each milestone gets its own row
                      if (viewMode === 'waterfall' && selectedProjects.length === 1) {
                        return phases.map((phase, phaseIdx) => (
                          <div
                            key={`${plan.id}-waterfall-${phaseIdx}`}
                            style={{
                              position: 'relative',
                              marginBottom: '8px',
                              width: '100%', // 🆕 ADDED
                              maxWidth: '100%' // 🆕 ADDED
                            }}
                          >
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                                gap: '0',
                                alignItems: 'center'
                              }}
                            >
                              {/* Milestone Name Column */}
                              <div style={{
                                ...styles.taskName,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'relative',
                                minHeight: '60px',
                                overflow: 'hidden'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                  <div style={{ fontWeight: '700', fontSize: '13px' }}>
                                    {phase.name}
                                  </div>
                                  <span style={{
                                    ...styles.statusBadge(phase.status),
                                    marginTop: '4px',
                                    width: 'fit-content'
                                  }}>
                                    {phase.status}
                                  </span>
                                </div>
                              </div>

                              {/* Month Grid Cells */}
                              {months.map((month, monthIdx) => (
                                <div
                                  key={monthIdx}
                                  style={{
                                    ...styles.ganttCell,
                                    position: 'relative',
                                    minWidth: 0,
                                    width: '100%'
                                  }}
                                >
                                  {showMonthBoxes && (
                                    <div style={{
                                      position: 'absolute',
                                      top: 0,
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      backgroundColor: isDarkMode
                                        ? 'rgba(75, 85, 99, 0.15)'
                                        : 'rgba(148, 163, 184, 0.1)',
                                      borderRadius: '8px',
                                      pointerEvents: 'none',
                                      zIndex: 1,
                                      margin: '1px'
                                    }} />
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Milestone Bar */}
                            {phase.startDate && phase.endDate && (() => {
                              const phaseStart = parseLocalDate(phase.startDate);
                              const phaseEnd = parseLocalDate(phase.endDate);

                              if (!phaseStart || !phaseEnd) return null;

                              const startMonthIdx = getMonthIndex(phaseStart);
                              const endMonthIdx = getMonthIndex(phaseEnd);

                              if (startMonthIdx === -1 || endMonthIdx === -1) return null;

                              const daysInStartMonth = new Date(
                                phaseStart.getFullYear(),
                                phaseStart.getMonth() + 1,
                                0
                              ).getDate();

                              const daysInEndMonth = new Date(
                                phaseEnd.getFullYear(),
                                phaseEnd.getMonth() + 1,
                                0
                              ).getDate();

                              const startOffset = (phaseStart.getDate() / daysInStartMonth) * 100;
                              const endOffset = (phaseEnd.getDate() / daysInEndMonth) * 100;

                              // 🔥 FIXED: Position relative to grid, not absolute calculation
                              const gridColumnStart = startMonthIdx + 2; // +2 because first column is task name
                              const gridColumnEnd = endMonthIdx + 2;

                              return (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `calc(200px + ((100% - 200px) / ${months.length}) * ${startMonthIdx} + ((100% - 200px) / ${months.length}) * ${startOffset / 100})`,
                                    width: `calc(((100% - 200px) / ${months.length}) * ${endMonthIdx - startMonthIdx} + ((100% - 200px) / ${months.length}) * ${(endOffset - startOffset) / 100})`,
                                    height: '24px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    backgroundColor: phase.color,
                                    opacity: 1,
                                    zIndex: 999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    cursor: 'pointer',
                                    pointerEvents: 'auto'
                                  }}
                                  onMouseEnter={() => {
                                    if (tooltipTimeoutRef.current) {
                                      clearTimeout(tooltipTimeoutRef.current);
                                    }
                                    setHoveredMilestone(`${plan.id}-waterfall-${phaseIdx}`);
                                  }}
                                  onMouseLeave={() => {
                                    tooltipTimeoutRef.current = setTimeout(() => {
                                      setHoveredMilestone(null);
                                    }, 150);
                                  }}
                                >
                                  <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    padding: '0 4px',
                                    fontSize: '9px',
                                    maxWidth: '100%',
                                    display: 'block'
                                  }}>
                                    {phaseStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {phaseEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>

                                  {/* 🔥 FIXED: Tooltip with proper positioning */}
                                  {hoveredMilestone === `${plan.id}-waterfall-${phaseIdx}` && (
                                    <div
                                      style={{
                                        ...styles.milestoneTooltip,
                                        position: 'fixed', // Changed from absolute to fixed
                                        bottom: 'auto',
                                        top: 'auto',
                                        left: '50%',
                                        transform: 'translate(-50%, -60%)', // Position above the bar
                                        maxWidth: '300px',
                                        zIndex: 10000
                                      }}
                                      onMouseEnter={() => {
                                        if (tooltipTimeoutRef.current) {
                                          clearTimeout(tooltipTimeoutRef.current);
                                        }
                                        setHoveredMilestone(`${plan.id}-waterfall-${phaseIdx}`);
                                      }}
                                      onMouseLeave={() => {
                                        tooltipTimeoutRef.current = setTimeout(() => {
                                          setHoveredMilestone(null);
                                        }, 150);
                                      }}
                                    >
                                      <div style={{ marginBottom: '4px', fontWeight: '700' }}>
                                        {phase.name}
                                      </div>
                                      <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                        {phaseStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {phaseEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </div>
                                      <div style={{ fontSize: '11px', marginTop: '4px', color: phase.color, fontWeight: '700' }}>
                                        {phase.status}
                                      </div>

                                      {/* 🔥 FIXED: Allow editors to change status */}
                                      {(planPermissions[plan.id] === 'owner') && (
                                        <button
                                          style={{
                                            ...styles.changeStatusButton(hoveredItem === `change-${plan.id}-${phaseIdx}`),
                                            marginTop: '4px'
                                          }}
                                          onMouseEnter={() => setHoveredItem(`change-${plan.id}-${phaseIdx}`)}
                                          onMouseLeave={() => setHoveredItem(null)}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleChangeStatus(plan, phase.name, phase.status);
                                          }}
                                        >
                                          <CheckCircle size={12} />
                                          Change Status
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ));
                      }

                      // 🆕 TIMELINE MODE (ORIGINAL) - All milestones in one row
                      // 🆕 TIMELINE MODE (ORIGINAL) - All milestones in one row
                      return (
                        <div key={plan.id} style={{ position: 'relative', marginBottom: '8px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                              gap: '0',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{
                              ...styles.taskName,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              position: 'relative'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '4px' }}>
                                  <div style={{ fontWeight: '700' }}>
                                    {plan.project}
                                  </div>
                                  {/* 🆕 Permission badge below plan name */}
                                  {getPermissionBadge(plan.id)}
                                </div>

                                {/* Lock Status */}
                                {(() => {
                                  const lock = planLocks[plan.id];
                                  const isLocked = !!lock;
                                  const isOwnLock = lock?.userId === userData?.id;

                                  if (!isLocked) return null;

                                  return (
                                    <div
                                      style={{
                                        marginTop: '2px',
                                        marginBottom: '4px',
                                        fontSize: '11px',
                                        padding: '3px 6px',
                                        width: 'fit-content',
                                        borderRadius: '6px',
                                        backgroundColor: isOwnLock
                                          ? 'rgba(16,185,129,0.15)'
                                          : 'rgba(239,68,68,0.15)',
                                        color: isOwnLock ? '#10b981' : '#ef4444',
                                        border: `1px solid ${isOwnLock ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Lock size={10} />
                                      {isOwnLock ? 'You are editing' : `Locked by ${lock.lockedBy}`}
                                    </div>
                                  );
                                })()}

                                {/* Status Badge */}
                                {plan.fields?.status && (
                                  <span style={styles.statusBadge(plan.fields.status)}>
                                    {plan.fields.status}
                                  </span>
                                )}
                              </div>

                              {/* 🆕 Permission-based edit/delete/history buttons */}
                              {filteredPlans.length > 1 && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {/* History button */}
                                  <button
                                    style={styles.actionButton(
                                      hoveredItem === `history-${plan.id}`,
                                      'history'
                                    )}
                                    onMouseEnter={() => setHoveredItem(`history-${plan.id}`)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchPlanHistory(plan.id, plan.project);
                                    }}
                                    title="View project history"
                                  >
                                    <History size={14} />
                                  </button>

                                  {/* Edit button - only show for editors/owners */}
                                  {planPermissions[plan.id] !== 'viewer' && (
                                    <button
                                      style={styles.actionButton(
                                        hoveredItem === `edit-${plan.id}`,
                                        'edit',
                                        planPermissions[plan.id] === 'viewer'
                                      )}
                                      onMouseEnter={() => setHoveredItem(`edit-${plan.id}`)}
                                      onMouseLeave={() => setHoveredItem(null)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPlan(plan);
                                      }}
                                      title="Edit this plan"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  )}

                                  {/* Delete button - only show for owners */}
                                  {((planPermissions[plan.id] === 'owner') ||
                                    (planPermissions[plan.id] === undefined && plan.createdBy === userData?.id)) && (
                                      <button
                                        style={styles.actionButton(hoveredItem === `delete-${plan.id}`, 'delete')}
                                        onMouseEnter={() => setHoveredItem(`delete-${plan.id}`)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeletePlan(plan);
                                        }}
                                        title="Delete this plan"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                </div>
                              )}
                            </div>

                            {months.map((month, monthIdx) => (
                              <div
                                key={monthIdx}
                                style={{
                                  ...styles.ganttCell,
                                  position: 'relative',
                                  minWidth: 0,
                                  width: '100%'
                                }}
                              >
                                {showMonthBoxes && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    backgroundColor: isDarkMode
                                      ? 'rgba(75, 85, 99, 0.15)'
                                      : 'rgba(148, 163, 184, 0.1)',
                                    borderRadius: '8px',
                                    pointerEvents: 'none',
                                    zIndex: 1,
                                    margin: '1px'
                                  }} />
                                )}
                              </div>
                            ))}
                          </div>

                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '40px',
                              display: 'grid',
                              gridTemplateColumns: `200px repeat(${months.length}, 1fr)`,
                              gap: '0',
                              pointerEvents: 'none'
                            }}
                          >
                            <div />

                            {phases.length > 0 ? (
                              phases.map((phase, phaseIdx) => {
                                console.log(`\n🎨 ========== RENDERING PHASE ${phaseIdx + 1}/${phases.length} ==========`);
                                console.log(`📛 Phase Name: ${phase.name}`);

                                const phaseStart = phase.startDate
                                  ? parseLocalDate(phase.startDate)
                                  : null;

                                const phaseEnd = phase.endDate
                                  ? parseLocalDate(phase.endDate)
                                  : null;

                                if (!phaseStart || !phaseEnd) {
                                  console.warn("Phase missing date:", phase);
                                  return null;
                                }

                                const startMonthIdx = getMonthIndex(phaseStart);
                                const endMonthIdx = getMonthIndex(phaseEnd);

                                const daysInStartMonth = new Date(
                                  phaseStart.getFullYear(),
                                  phaseStart.getMonth() + 1,
                                  0
                                ).getDate();

                                const daysInEndMonth = new Date(
                                  phaseEnd.getFullYear(),
                                  phaseEnd.getMonth() + 1,
                                  0
                                ).getDate();

                                const startOffset = (phaseStart.getDate() / daysInStartMonth) * 100;
                                const endOffset = (phaseEnd.getDate() / daysInEndMonth) * 100;

                                const left = `calc(
200px +
((100% - 200px) * (${startMonthIdx} / ${months.length})) +
((100% - 200px) * (${startOffset} / 100 / ${months.length}))
)`;

                                const width = `calc(
((100% - 200px) * ((${endMonthIdx} - ${startMonthIdx}) / ${months.length})) +
((100% - 200px) * ((${endOffset} - ${startOffset}) / 100 / ${months.length}))
)`;

                                return (
                                  <div
                                    key={`${plan.id}-${phaseIdx}`}
                                    style={{
                                      position: 'absolute',
                                      left: left,
                                      width: width,
                                      height: '24px',
                                      top: '8px',
                                      transform: 'translateY(83.5%)',
                                      backgroundColor: phase.color,
                                      opacity: 1,
                                      zIndex: 999,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      borderRadius: '6px',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                      cursor: 'pointer',
                                      pointerEvents: 'auto'
                                    }}
                                    onMouseEnter={() => {
                                      if (tooltipTimeoutRef.current) {
                                        clearTimeout(tooltipTimeoutRef.current);
                                      }
                                      setHoveredMilestone(`${plan.id}-${phaseIdx}`);
                                    }}
                                    onMouseLeave={() => {
                                      tooltipTimeoutRef.current = setTimeout(() => {
                                        setHoveredMilestone(null);
                                      }, 150);
                                    }}
                                  >
                                    <span style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      padding: '0 4px',
                                      fontSize: '9px',
                                      letterSpacing: '-0.3px',
                                      maxWidth: '100%',
                                      display: 'block'
                                    }}>
                                      {phase.name}
                                    </span>

                                    {hoveredMilestone === `${plan.id}-${phaseIdx}` && (
                                      <div
                                        className="milestone-tooltip"
                                        style={{
                                          ...styles.milestoneTooltip,
                                          position: 'absolute',
                                          bottom: '100%',
                                          top: 'auto',
                                          marginBottom: '10px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          maxWidth: '300px',
                                          maxHeight: '220px',
                                          overflowY: 'auto',
                                          wordBreak: 'break-word',
                                          zIndex: 9999
                                        }}
                                        onMouseEnter={() => {
                                          if (tooltipTimeoutRef.current) {
                                            clearTimeout(tooltipTimeoutRef.current);
                                          }
                                          setHoveredMilestone(`${plan.id}-${phaseIdx}`);
                                        }}
                                        onMouseLeave={() => {
                                          tooltipTimeoutRef.current = setTimeout(() => {
                                            setHoveredMilestone(null);
                                          }, 150);
                                        }}
                                      >
                                        <div style={{ marginBottom: '4px', fontWeight: '700' }}>
                                          {phase.name}
                                        </div>
                                        <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                          {phaseStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {phaseEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div style={{ fontSize: '11px', marginTop: '4px', color: phase.color, fontWeight: '700' }}>
                                          {phase.status}
                                        </div>

                                        {planPermissions[plan.id] !== 'viewer' && (
                                          <button
                                            style={{
                                              ...styles.changeStatusButton(hoveredItem === `change-${plan.id}-${phaseIdx}`),
                                              marginTop: '4px'
                                            }}
                                            onMouseEnter={() => setHoveredItem(`change-${plan.id}-${phaseIdx}`)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleChangeStatus(plan, phase.name, phase.status);
                                            }}
                                          >
                                            <CheckCircle size={12} />
                                            Change Status
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              (() => {
                                const totalTimelineDays = (latestEnd - earliestStart) / (1000 * 60 * 60 * 24);
                                const projectStartDays = (projectStart - earliestStart) / (1000 * 60 * 60 * 24);
                                const projectEndDays = (projectEnd - earliestStart) / (1000 * 60 * 60 * 24);

                                const startPercent = (projectStartDays / totalTimelineDays) * 100;
                                const widthPercent = ((projectEndDays - projectStartDays) / totalTimelineDays) * 100;

                                return (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `calc(200px + (100% - 200px) * ${startPercent / 100})`,
                                      width: `calc((100% - 200px) * ${widthPercent / 100})`,
                                      height: '24px',
                                      top: '8px',
                                      backgroundColor: getPhaseColor(plan.fields?.status),
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      padding: '0 8px',
                                      borderRadius: '6px',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                      pointerEvents: 'auto'
                                    }}
                                  >
                                    {plan.project}
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div style={styles.legend}>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#3b82f6')} />
                        Completed
                      </div>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#10b981')} />
                        On Track
                      </div>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#f59e0b')} />
                        At Risk
                      </div>
                      <div style={styles.legendItem}>
                        <div style={styles.legendColor('#ef4444')} />
                        Delayed
                      </div>
                    </div>

                    {todayMonthIndex !== -1 && (
                      <>
                        <div style={{
                          position: 'absolute',
                          top: '0px',
                          bottom: '80px',
                          height: 'auto',
                          // height: `${60 + (filteredPlans.length * 65)}px`,
                          left: `calc(200px + (100% - 200px) * ${(todayMonthIndex + todayPercentInMonth / 100) / months.length})`,
                          width: '2px',
                          backgroundImage: 'linear-gradient(to bottom, #ef4444 60%, transparent 60%)',
                          backgroundSize: '2px 16px',
                          backgroundRepeat: 'repeat-y',
                          zIndex: 100,
                          pointerEvents: 'none'
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: '-40px',
                          left: `calc(200px + (100% - 200px) * ${(todayMonthIndex + todayPercentInMonth / 100) / months.length})`,
                          transform: 'translateX(-50%)',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          zIndex: 101
                        }}>
                          Today
                        </div>
                      </>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Stats section */}
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
          {/* Active Projects - Last milestone NOT completed */}
          <div style={styles.statNumber}>
            {masterPlans.filter(p => {
              const lastMilestoneStatus = getLastMilestoneStatus(p);
              return lastMilestoneStatus && !lastMilestoneStatus.toLowerCase().includes('complete');
            }).length}
          </div>
          <div style={styles.statLabel}>In Progress</div>
        </div>

        <div
          style={styles.statCard(hoveredCard === 'stat3')}
          onMouseEnter={() => setHoveredCard('stat3')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          {/* Completed - Last milestone IS completed */}
          <div style={styles.statNumber}>
            {masterPlans.filter(p => {
              const lastMilestoneStatus = getLastMilestoneStatus(p);
              return lastMilestoneStatus && lastMilestoneStatus.toLowerCase().includes('complete');
            }).length}
          </div>
          <div style={styles.statLabel}>Completed</div>
        </div>
      </div>

      {/* Modals */}
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

      {showStatusModal && selectedMilestone && (
        <div style={styles.statusModal}>
          <div style={styles.statusModalContent}>
            <h3 style={styles.statusModalTitle}>Change Status</h3>
            <p style={styles.statusModalSubtitle}>
              Update status for <strong>{selectedMilestone.milestoneName}</strong>
            </p>

            <select
              style={styles.statusSelect}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="On Track">On Track</option>
              <option value="At Risk">At Risk</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed</option>
            </select>

            <div style={styles.deleteModalActions}>
              <button
                style={styles.modalButton(hoveredItem === 'cancel-status', 'cancel')}
                onMouseEnter={() => setHoveredItem('cancel-status')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedMilestone(null);
                  setNewStatus('');
                }}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.modalButton(hoveredItem === 'confirm-status', 'primary'), backgroundColor: hoveredItem === 'confirm-status' ? '#2563eb' : '#3b82f6' }}
                onMouseEnter={() => setHoveredItem('confirm-status')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={confirmStatusChange}
              >
                Update Status
              </button>

            </div>
          </div>
        </div>
      )}

      {/* 🆕 ADD HISTORY MODAL HERE - RIGHT AFTER STATUS MODAL */}
      {showHistoryModal && selectedPlanHistory && (
        <div style={styles.historyModal}>
          <div style={styles.historyModalContent}>
            <div style={styles.historyModalHeader}>
              <div>
                <div style={styles.historyModalTitle}>
                  <History size={24} />
                  Project History
                </div>
                <div style={styles.historyModalSubtitle}>
                  {selectedPlanHistory.name}
                </div>
              </div>
            </div>

            <div style={styles.historyList}>
              {isLoadingHistory ? (
                <div style={styles.historyLoadingState}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                  Loading history...
                </div>
              ) : planHistory.length === 0 ? (
                <div style={styles.historyEmptyState}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    No history found
                  </div>
                  <div>This plan has no recorded changes yet</div>
                </div>
              ) : (
                planHistory.map((item, index) => (
                  <div
                    key={item.Id || index}
                    style={styles.historyItem(hoveredItem === `history-${index}`)}
                    onMouseEnter={() => setHoveredItem(`history-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div style={styles.historyItemHeader}>
                      <div style={styles.historyChangeType(getChangeTypeColor(item.ChangeType))}>
                        {formatChangeType(item.ChangeType)}
                      </div>
                      <div style={styles.historyTimestamp}>
                        {new Date(item.ChangedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <div style={styles.historyMilestoneName}>
                      {item.MilestoneName}
                    </div>

                    {item.OldValue && item.NewValue && (
                      <div style={styles.historyChangeDetails}>
                        <span style={styles.historyValue(true)}>
                          {item.OldValue}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '700' }}>→</span>
                        <span style={styles.historyValue(false)}>
                          {item.NewValue}
                        </span>
                      </div>
                    )}

                    {!item.OldValue && item.NewValue && (
                      <div style={styles.historyChangeDetails}>
                        <span style={styles.historyValue(false)}>
                          {item.NewValue}
                        </span>
                      </div>
                    )}

                    {item.OldValue && !item.NewValue && (
                      <div style={styles.historyChangeDetails}>
                        <span style={styles.historyValue(true)}>
                          {item.OldValue}
                        </span>
                      </div>
                    )}

                    <div style={styles.historyChangedBy}>
                      <User size={12} />
                      Changed by: {item.ChangedBy}
                    </div>

                    {item.Justification && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                        border: isDarkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.2)'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: isDarkMode ? '#93c5fd' : '#3b82f6',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Justification:
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: isDarkMode ? '#e2e8f0' : '#1e293b',
                          lineHeight: '1.5',
                          fontStyle: 'italic'
                        }}>
                          "{item.Justification}"
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={styles.closeHistoryButton(hoveredItem === 'close-history')}
                onMouseEnter={() => setHoveredItem('close-history')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedPlanHistory(null);
                  setPlanHistory([]);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🆕 END OF HISTORY MODAL */}
    </div>
  );
};

export default AdminViewPlan;