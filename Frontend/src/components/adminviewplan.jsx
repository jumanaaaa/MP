import React, { useState, useRef, useEffect } from 'react';
import html2canvas from "html2canvas";
import {
  ChevronDown,
  Filter,
  Plus,
  Calendar,
  Bell,
  User,
  Users,
  Edit,
  Trash2,
  CheckCircle,
  Shield,
  Eye,
  Lock,
  History,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import Dropdown from '../components/Dropdown';

const FormSkeleton = ({ isDarkMode }) => (
  <div style={{
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)'
  }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{
        height: '60px',
        background: isDarkMode
          ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
          : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '12px',
        marginBottom: '24px'
      }} />
    ))}
  </div>
);

const GanttSkeleton = ({ isDarkMode }) => (
  <div style={{
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    borderRadius: '24px',
    padding: '28px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.5)',
    marginBottom: '28px'
  }}>
    {/* Header skeleton */}
    <div style={{
      height: '40px',
      width: '300px',
      background: isDarkMode
        ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
        : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '12px',
      marginBottom: '24px'
    }} />

    {/* Timeline rows */}
    {[1, 2, 3, 4].map(i => (
      <div key={i} style={{
        height: '80px',
        background: isDarkMode
          ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
          : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '12px',
        marginBottom: '16px'
      }} />
    ))}

    {/* Legend skeleton */}
    <div style={{
      display: 'flex',
      gap: '24px',
      marginTop: '24px'
    }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: '24px',
          width: '100px',
          background: isDarkMode
            ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
            : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: '8px'
        }} />
      ))}
    </div>
  </div>
);

const StatCardSkeleton = ({ isDarkMode }) => (
  <div style={{
    backgroundColor: isDarkMode ? '#374151' : '#fff',
    borderRadius: '20px',
    padding: '28px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)'
  }}>
    {/* Number skeleton */}
    <div style={{
      height: '48px',
      width: '80px',
      margin: '0 auto 16px',
      background: isDarkMode
        ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
        : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '12px'
    }} />

    {/* Label skeleton */}
    <div style={{
      height: '20px',
      width: '120px',
      margin: '0 auto',
      background: isDarkMode
        ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
        : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '8px'
    }} />
  </div>
);

const ModalSkeleton = ({ isDarkMode }) => (
  <div style={{ padding: '20px' }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{
        height: '60px',
        background: isDarkMode
          ? 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)'
          : 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '12px',
        marginBottom: '16px'
      }} />
    ))}
  </div>
);

const AdminViewPlan = () => {
  const [masterPlans, setMasterPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  // const [hoveredMilestone, setHoveredMilestone] = useState(null);
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
  // 🆕 TEAM MANAGEMENT MODAL STATE
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedPlanForTeam, setSelectedPlanForTeam] = useState(null);
  const [teamMembersForPlan, setTeamMembersForPlan] = useState([]);
  const [availableUsersForTeam, setAvailableUsersForTeam] = useState([]);
  const [isLoadingTeamModal, setIsLoadingTeamModal] = useState(false);
  const [selectedUserIdForTeam, setSelectedUserIdForTeam] = useState('');
  const [selectedPermissionForTeam, setSelectedPermissionForTeam] = useState('editor');

  const [showMilestoneUsersModal, setShowMilestoneUsersModal] = useState(false);
  const [selectedMilestoneForUsers, setSelectedMilestoneForUsers] = useState(null);
  const [milestoneUsers, setMilestoneUsers] = useState([]);
  const [availableUsersForMilestone, setAvailableUsersForMilestone] = useState([]);
  const [isLoadingMilestoneUsers, setIsLoadingMilestoneUsers] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);

  // 🆕 TEAM MANAGEMENT FUNCTIONS
  const handleManageTeam = async (plan) => {
    setSelectedPlanForTeam(plan);
    setShowTeamModal(true);
    setIsLoadingTeamModal(true);

    try {
      // Fetch current team members
      const teamResponse = await apiFetch(`/plan/master/${plan.id}/team`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      let teamMembers = [];
      if (teamResponse.ok) {
        const { team } = await teamResponse.json();
        teamMembers = team;
        setTeamMembersForPlan(team);
        console.log('✅ Team members loaded:', team);
      }

      // Fetch available users (all users minus current team)
      const usersResponse = await apiFetch('/user/list', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (usersResponse.ok) {
        const data = await usersResponse.json();
        const users = data.users || [];

        // Filter out current team members
        const teamUserIds = teamMembers.map(t => t.userId);
        const available = users.filter(u => !teamUserIds.includes(u.userId));
        setAvailableUsersForTeam(available);
      }
    } catch (error) {
      console.error('Failed to load team data:', error);
      alert('Failed to load team information');
    } finally {
      setIsLoadingTeamModal(false);
    }
  };

  const addTeamMember = async () => {
    if (!selectedUserIdForTeam || !selectedPermissionForTeam || !selectedPlanForTeam) {
      alert('Please select a user and permission level');
      return;
    }

    try {
      const response = await apiFetch(
        `/plan/master/${selectedPlanForTeam.id}/permissions`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(selectedUserIdForTeam),
            permissionLevel: selectedPermissionForTeam
          })
        }
      );

      if (response.ok) {
        // Refresh team data
        await handleManageTeam(selectedPlanForTeam);
        setSelectedUserIdForTeam('');
        setSelectedPermissionForTeam('editor');
        alert('✅ Team member added successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to add team member: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to add team member:', error);
      alert('Failed to add team member');
    }
  };

  const updateTeamMemberPermission = async (userId, newPermission) => {
    if (!selectedPlanForTeam) return;

    try {
      const response = await apiFetch(
        `/plan/master/${selectedPlanForTeam.id}/permissions`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            permissionLevel: newPermission
          })
        }
      );

      if (response.ok) {
        // Refresh team data
        await handleManageTeam(selectedPlanForTeam);
        alert('✅ Permission updated successfully!');
      } else {
        alert('Failed to update permission');
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
      alert('Failed to update permission');
    }
  };

  const removeTeamMember = async (userId) => {
    if (!selectedPlanForTeam) return;

    if (!confirm('Remove this team member? They will lose access to this plan.')) return;

    try {
      const response = await apiFetch(
        `/plan/master/${selectedPlanForTeam.id}/permissions/${userId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        // Refresh team data
        await handleManageTeam(selectedPlanForTeam);
        alert('✅ Team member removed successfully!');
      } else {
        alert('Failed to remove team member');
      }
    } catch (error) {
      console.error('Failed to remove team member:', error);
      alert('Failed to remove team member');
    }
  };

  const handleManageMilestoneUsers = async (plan, milestoneName, milestoneId) => {
    setSelectedMilestoneForUsers({ plan, milestoneName, milestoneId });
    setShowMilestoneUsersModal(true);
    setIsLoadingMilestoneUsers(true);

    try {
      // Fetch current milestone users
      const usersResponse = await apiFetch(`/plan/master/${plan.id}/milestone/${milestoneId}/users`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      let milestoneUsers = [];
      if (usersResponse.ok) {
        const { users } = await usersResponse.json();
        milestoneUsers = users;
        setMilestoneUsers(users);
      }

      // Fetch available users (plan team members not yet assigned)
      const teamResponse = await apiFetch(`/plan/master/${plan.id}/team`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (teamResponse.ok) {
        const { team } = await teamResponse.json();
        const assignedUserIds = milestoneUsers.map(u => u.userId);
        const available = team.filter(t => !assignedUserIds.includes(t.userId));
        setAvailableUsersForMilestone(available);
      }
    } catch (error) {
      console.error('Failed to load milestone users:', error);
    } finally {
      setIsLoadingMilestoneUsers(false);
    }
  };

  // Add function to add user to milestone
  const addUserToMilestone = async (userId) => {
    if (!selectedMilestoneForUsers) return;

    try {
      const response = await apiFetch(
        `/plan/master/${selectedMilestoneForUsers.plan.id}/milestone/${selectedMilestoneForUsers.milestoneId}/users`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [userId] })
        }
      );

      if (response.ok) {
        // Refresh milestone users
        await handleManageMilestoneUsers(
          selectedMilestoneForUsers.plan,
          selectedMilestoneForUsers.milestoneName,
          selectedMilestoneForUsers.milestoneId
        );
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user to milestone');
    }
  };

  // Add function to remove user from milestone
  const removeUserFromMilestone = async (userId) => {
    if (!selectedMilestoneForUsers) return;

    if (!confirm('Remove this user from the milestone?')) return;

    try {
      const response = await apiFetch(
        `/plan/master/${selectedMilestoneForUsers.plan.id}/milestone/${selectedMilestoneForUsers.milestoneId}/users/${userId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        // Refresh milestone users
        await handleManageMilestoneUsers(
          selectedMilestoneForUsers.plan,
          selectedMilestoneForUsers.milestoneName,
          selectedMilestoneForUsers.milestoneId
        );
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
      alert('Failed to remove user from milestone');
    }
  };

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

  const [historyFilter, setHistoryFilter] = useState('all');

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

  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [isSubtitleHovered, setIsSubtitleHovered] = useState(false);
  const isProjectFiltered = selectedProjects.length === 1;
  const selectedProjectName = isProjectFiltered ? selectedProjects[0] : null;

  const headerSubtitles = isProjectFiltered
    ? [
      `Viewing project: ${selectedProjectName}`,
      `${masterPlans.filter(p => p.project === selectedProjectName).length} plans in this project`,
      `${masterPlans.filter(p => {
        if (p.project !== selectedProjectName) return false;
        const last = getLastMilestoneStatus(p);
        return last && !last.toLowerCase().includes('complete');
      }).length} active plans`,
      `${masterPlans.filter(p => {
        if (p.project !== selectedProjectName) return false;
        const last = getLastMilestoneStatus(p);
        return last && last.toLowerCase().includes('complete');
      }).length} completed plans`
    ]
    : [
      'Overview of all master plans and milestones',
      `${masterPlans.length} total master plans`,
      `${masterPlans.filter(p => {
        const last = getLastMilestoneStatus(p);
        return last && !last.toLowerCase().includes('complete');
      }).length} plans in progress`,
      `${masterPlans.filter(p => {
        const last = getLastMilestoneStatus(p);
        return last && last.toLowerCase().includes('complete');
      }).length} plans completed`
    ];

  // 🆕 Auto-rotate subtitle every 5s
  useEffect(() => {
    if (isSubtitleHovered) return;

    const interval = setInterval(() => {
      setSubtitleIndex(prev => (prev + 1) % headerSubtitles.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [headerSubtitles.length, isSubtitleHovered]);

  useEffect(() => {
    if (!document.getElementById('fade-style')) {
      const style = document.createElement('style');
      style.id = 'fade-style';
      style.innerHTML = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(2px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
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
      
      @keyframes tooltipFadeIn {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .profile-tooltip-animated {
        animation: slideIn 0.2s ease-out;
      }

      @keyframes modalBackdropFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      @keyframes modalContentSlideUp {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .modal-backdrop-animated {
        animation: modalBackdropFadeIn 0.25s ease-out;
      }
      
      .modal-content-animated {
        animation: modalContentSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    const existing = document.getElementById('scrollbar-style');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'scrollbar-style';

    style.innerHTML = isDarkMode
      ? `
      /* Dark mode scrollbar */
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      ::-webkit-scrollbar-track {
        background: #1e293b;
      }

      ::-webkit-scrollbar-thumb {
        background-color: #475569;
        border-radius: 10px;
        border: 2px solid #1e293b;
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: #64748b;
      }

      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: #475569 #1e293b;
      }
    `
      : `
      /* Light mode scrollbar */
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      ::-webkit-scrollbar-track {
        background: #f1f5f9;
      }

      ::-webkit-scrollbar-thumb {
        background-color: #cbd5e1;
        border-radius: 10px;
        border: 2px solid #f1f5f9;
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: #94a3b8;
      }

      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f1f5f9;
      }
    `;

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [isDarkMode]);

  useEffect(() => {
    const fetchMasterPlans = async () => {
      try {
        console.log('🔄 Fetching master plans from /plan/master...');
        setIsLoading(true);

        const response = await apiFetch('/plan/master', {
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
      const response = await apiFetch('/plan/locks/active', {
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
          const response = await apiFetch(`/plan/master/${plan.id}/permission`,
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
        const response = await apiFetch('/user/profile', {
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

  // 🆕 Auto-open Change Status modal from email deep link (OWNER ONLY)
  useEffect(() => {
    if (!masterPlans.length) return;
    if (!Object.keys(planPermissions).length) return;

    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    const milestoneName = params.get('milestone');

    if (!planId || !milestoneName) return;

    const plan = masterPlans.find(p => String(p.id) === String(planId));
    if (!plan) return;

    // 🔐 Owner-only safety check (email already owner-only, but double-safe)
    if (planPermissions[plan.id] !== 'owner') return;

    const milestone = plan.fields?.[milestoneName];
    if (!milestone) return;

    // 🪄 Open modal using existing logic
    handleChangeStatus(plan, milestoneName, milestone.status);

    // 🧹 Clean URL so it doesn't reopen on refresh
    window.history.replaceState({}, document.title, window.location.pathname);

  }, [masterPlans, planPermissions]);

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
            const response = await apiFetch(`/plan/master/${plan.id}`, {
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

            const response = await apiFetch('/notifications/milestone-deadline', {
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

  // 🆕 ONE WEEK WARNING EMAIL CHECK
  useEffect(() => {
    const checkWeekWarnings = async () => {
      if (!userData || masterPlans.length === 0) return;
      if (Object.keys(planPermissions).length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oneWeekFromNow = new Date(today);
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      for (const plan of masterPlans) {
        const permission = planPermissions[plan.id];
        if (permission !== 'owner' && permission !== 'editor') {
          continue; // Skip if not owner or editor
        }

        if (!plan.fields) continue;

        Object.entries(plan.fields).forEach(async ([milestoneName, milestone]) => {
          if (
            milestoneName.toLowerCase() === 'status' ||
            milestoneName.toLowerCase() === 'lead' ||
            milestoneName.toLowerCase() === 'budget' ||
            milestoneName.toLowerCase() === 'completion'
          ) {
            return;
          }

          if (!milestone.endDate) return;

          const endDate = parseLocalDate(milestone.endDate);
          endDate.setHours(0, 0, 0, 0);

          // Check if exactly 7 days away
          if (endDate.getTime() === oneWeekFromNow.getTime()) {
            // Skip if already completed
            if (milestone.status?.toLowerCase().includes('complete')) return;

            const emailKey = `week-warning-${plan.id}-${milestoneName}-${endDate.toDateString()}`;

            // Check if already sent (use localStorage for persistence)
            const sentWarnings = JSON.parse(localStorage.getItem('sentWeekWarnings') || '[]');
            if (sentWarnings.includes(emailKey)) {
              console.log(`⏭️ Week warning already sent for ${milestoneName}`);
              return;
            }

            try {
              console.log(`📧 Sending 1-week warning for ${milestoneName} in ${plan.project}`);

              const response = await apiFetch('/plan/master/milestone-week-warning', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  planId: plan.id,
                  projectName: plan.project,
                  milestoneName: milestoneName,
                  dueDate: milestone.endDate,
                  userEmail: userData.email,
                  userName: `${userData.firstName} ${userData.lastName}`
                })
              });

              if (response.ok) {
                console.log(`✅ Week warning email sent for ${milestoneName}`);

                // Mark as sent
                sentWarnings.push(emailKey);
                localStorage.setItem('sentWeekWarnings', JSON.stringify(sentWarnings));
              }
            } catch (error) {
              console.error(`Failed to send week warning for ${milestoneName}:`, error);
            }
          }
        });
      }
    };

    checkWeekWarnings();

    // Run check every hour
    const interval = setInterval(checkWeekWarnings, 60000 * 60);

    return () => clearInterval(interval);
  }, [userData, masterPlans, planPermissions]);

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

    // 🆕 SORT BY START DATE (ASCENDING - EARLIEST FIRST)
    filtered = [...filtered].sort((a, b) => {
      const dateA = parseLocalDate(a.startDate);
      const dateB = parseLocalDate(b.startDate);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB; // Ascending order
    });

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

      // 🆕 SORT MILESTONES BY START DATE (ASCENDING)
      milestones.sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate - b.startDate;
      });

      const today = new Date().toDateString();

      milestones.forEach(m => {
        if (!m.endDate) return;

        const due = new Date(m.endDate).toDateString();

        // Only fire on milestones due TODAY
        if (due !== today) return;

        // Skip completed milestones
        if (m.status?.toLowerCase().includes("complete")) return;

        console.log(`📧 Sending reminder for milestone "${m.name}" in project "${plan.project}"`);

        apiFetch("/plan/master/milestone-deadline", {
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
    const isAnyModalOpen =
      showHistoryModal ||
      showStatusModal ||
      showDeleteConfirmation ||
      showTeamModal ||
      showMilestoneUsersModal;

    if (isAnyModalOpen) {
      const scrollY = window.scrollY;

      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      // Cleanup - restore scroll when modal closes
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showHistoryModal, showStatusModal, showDeleteConfirmation, showTeamModal, showMilestoneUsersModal]);

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

  const allProjects = [...new Set(masterPlans.map(plan => plan.project))];

  // Separate into assigned and unassigned
  const userAssignedProjects = userData?.assignedProjects
    ?.filter(p => p.projectType === 'Project')
    .map(p => p.name) || [];

  const assignedProjectsSet = new Set(userAssignedProjects);
  const userProjects = allProjects.filter(p => assignedProjectsSet.has(p));
  const otherProjects = allProjects.filter(p => !assignedProjectsSet.has(p));

  const projects = { assigned: userProjects, other: otherProjects, all: allProjects };

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
      const response = await apiFetch(`/plan/master/${planId}/history`, {
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
      'project_renamed': '✏️ Project Renamed',
      'project_dates_changed': '📆 Project Timeline Changed'
    };
    return types[changeType] || changeType;
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('complete')) return '#3b82f6';
    if (statusLower.includes('on track')) return '#10b981';
    if (statusLower.includes('at risk')) return '#f59e0b';
    if (statusLower.includes('delay')) return '#ef4444';
    return '#94a3b8';
  };

  const changeTypeDisplayNames = {
    'all': 'All Changes',
    'status_changed': 'Status Changed',
    'dates_changed': 'Dates Changed',
    'milestone_added': 'Milestone Added',
    'milestone_deleted': 'Milestone Deleted',
    'project_renamed': 'Project Renamed',
    'project_dates_changed': 'Project Timeline Changed'
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
        const response = await apiFetch(`/plan/lock/${plan.id}/takeover`, {
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

      const response = await apiFetch(`/plan/master/${planToDelete.id}`, {
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

    // 🆕 CHECK IF END DATE HAS PASSED - PREVENT CHANGES
    // const milestone = plan.fields[milestoneName];
    // if (milestone && milestone.endDate) {
    //   const endDate = parseLocalDate(milestone.endDate);
    //   const today = new Date();
    //   today.setHours(0, 0, 0, 0);

    //   if (endDate < today && currentStatus !== 'Completed') {
    //     alert('❌ Cannot change status for milestones with past end dates. This milestone is automatically marked as Delayed.');
    //     return;
    //   }
    // }

    setSelectedMilestone({
      plan,
      milestoneName,
      currentStatus,
    });
    setNewStatus(currentStatus);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedMilestone || !newStatus) return;

    const { plan, milestoneName } = selectedMilestone;
    const milestone = plan.fields[milestoneName];

    // 🔒 Enforce rule: after end date → only Delayed or Completed
    if (milestone?.endDate) {
      const endDate = parseLocalDate(milestone.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (
        endDate < today &&
        !['Completed', 'Delayed'].includes(newStatus)
      ) {
        alert('❌ After the end date, a milestone can only be marked as Delayed or Completed.');
        return;
      }
    }

    try {
      console.log(`🔄 Updating status for ${milestoneName} to ${newStatus}`);

      // 🔥 NEW ENDPOINT - Status change only
      const response = await apiFetch(`/plan/master/${plan.id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestoneName: milestoneName,
          newStatus: newStatus,
        })
      });

      if (response.ok) {
        console.log('✅ Status updated successfully');
        alert(`Status updated successfully!`);

        // 🔥 UPDATE LOCAL STATE IMMEDIATELY
        const updatedFields = {
          ...plan.fields,
          [milestoneName]: {
            ...plan.fields[milestoneName],
            status: newStatus
          }
        };

        const updatedPlans = masterPlans.map(p =>
          p.id === plan.id ? { ...p, fields: updatedFields } : p
        );
        setMasterPlans(updatedPlans);
        setFilteredPlans(updatedPlans.filter(p =>
          selectedProjects.length === 0 || selectedProjects.includes(p.project)
        ));
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
      zIndex: 1000,
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
    selectedUserCard: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '12px 16px',
      marginBottom: '8px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(226,232,240,0.3)'
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
      marginTop: '8px',
      animation: 'slideIn 0.2s ease-out',
      transformOrigin: 'top left'
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
      backdropFilter: 'blur(4px)',
      animation: 'modalBackdropFadeIn 0.25s ease-out'
    },
    statusModalContent: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.8)' : '1px solid rgba(255,255,255,0.8)',
      maxWidth: '550px',
      width: '90%',
      animation: 'modalContentSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
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
      marginTop: '40px',
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
      flexDirection: 'column',
      gap: '4px',
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
              : type === 'history'  // 🆕  
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
              : type === 'history'  // 🆕  
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
      backdropFilter: 'blur(8px)',
      animation: 'modalBackdropFadeIn 0.25s ease-out'
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
      flexDirection: 'column',
      animation: 'modalContentSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
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
                className="profile-tooltip-animated"
                style={styles.profileTooltip}
                onMouseEnter={() => setShowProfileTooltip(true)}
                onMouseLeave={() => setShowProfileTooltip(false)}
              >
                <div style={styles.tooltipArrow}></div>
                <div style={styles.userInfo}>
                  <div style={styles.avatar}>
                    {userData
                      ? `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}` || 'U'
                      : 'U'}
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
                      {masterPlans.length}
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      Plans
                    </div>
                  </div>

                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {
                        masterPlans.filter(plan => {
                          const fields = typeof plan.fields === 'string'
                            ? JSON.parse(plan.fields)
                            : plan.fields;

                          if (!fields) return false;

                          const milestones = Object.values(fields)
                            .filter(v => typeof v === 'object' && v?.status);

                          return milestones.length > 0 &&
                            milestones.some(m => m.status !== 'Completed');
                        }).length
                      }
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      In Progress
                    </div>
                  </div>

                  <div style={styles.tooltipStatItem}>
                    <div style={styles.tooltipStatNumber}>
                      {
                        masterPlans.filter(plan => {
                          const fields = typeof plan.fields === 'string'
                            ? JSON.parse(plan.fields)
                            : plan.fields;

                          if (!fields) return false;

                          const milestones = Object.values(fields)
                            .filter(v => typeof v === 'object' && v?.status);

                          return milestones.length > 0 &&
                            milestones.every(m => m.status === 'Completed');
                        }).length
                      }
                    </div>
                    <div style={styles.tooltipStatLabel}>
                      Completed
                    </div>
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
        <div>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: isDarkMode ? '#e2e8f0' : '#1e293b',
              margin: 0
            }}
          >
            Master Plans Timeline
          </h2>

          <div
            key={subtitleIndex}
            style={{
              marginTop: '6px',
              fontSize: '13px',
              fontWeight: '500',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              animation: 'fadeIn 0.4s ease'
            }}
            onMouseEnter={() => setIsSubtitleHovered(true)}
            onMouseLeave={() => setIsSubtitleHovered(false)}
          >
            {headerSubtitles[subtitleIndex]}
          </div>
        </div>
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

              {/* Your Assigned Projects Section */}
              {projects.assigned.length > 0 && (
                <>
                  <div style={{
                    padding: '8px 20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: isDarkMode ? '#3b82f6' : '#2563eb',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Your Assigned Projects
                  </div>
                  {projects.assigned.map((project) => (
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

                  {projects.other.length > 0 && (
                    <div style={{
                      height: '1px',
                      backgroundColor: isDarkMode ? 'rgba(75,85,99,0.5)' : 'rgba(226,232,240,0.8)',
                      margin: '8px 12px'
                    }} />
                  )}
                </>
              )}

              {/* All Projects Section */}
              {projects.other.length > 0 && (
                <>
                  <div style={{
                    padding: '8px 20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    All Projects
                  </div>
                  {projects.other.map((project) => (
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
                </>
              )}

              {/* Empty state if no projects at all */}
              {projects.all.length === 0 && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontSize: '13px'
                }}>
                  No projects available
                </div>
              )}

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
        <>
          <GanttSkeleton isDarkMode={isDarkMode} />
          <div style={styles.statsContainer}>
            <StatCardSkeleton isDarkMode={isDarkMode} />
            <StatCardSkeleton isDarkMode={isDarkMode} />
            <StatCardSkeleton isDarkMode={isDarkMode} />
          </div>
        </>
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

                    {filteredPlans.map((plan, planIndex) => {
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
                              id: fieldData.id,
                              name: key,
                              status: fieldData.status || fieldData,
                              startDate: parseLocalDate(fieldData.startDate) || null,
                              endDate: parseLocalDate(fieldData.endDate) || null,
                              color: getPhaseColor(fieldData.status || fieldData),
                            });
                          }
                        });
                      }

                      // 🆕 SORT MILESTONES CHRONOLOGICALLY (by startDate, then endDate)
                      phases.sort((a, b) => {
                        if (!a.startDate && !b.startDate) return 0;
                        if (!a.startDate) return 1;
                        if (!b.startDate) return -1;

                        const diff = a.startDate - b.startDate;
                        if (diff !== 0) return diff;

                        // fallback: end date
                        if (!a.endDate && !b.endDate) return 0;
                        if (!a.endDate) return 1;
                        if (!b.endDate) return -1;
                        return a.endDate - b.endDate;
                      });

                      // 🆕 WATERFALL MODE - Each milestone gets its own row
                      if (viewMode === 'waterfall' && selectedProjects.length === 1) {
                        return phases.map((phase, phaseIdx) => {
                          const isTopRow = phaseIdx === 0;
                          return (
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
                                    onMouseEnter={(e) => {
                                      if (tooltipTimeoutRef.current) {
                                        clearTimeout(tooltipTimeoutRef.current);
                                      }

                                      const rect = e.currentTarget.getBoundingClientRect();

                                      setTooltipData({
                                        x: rect.left + rect.width / 2,
                                        y: rect.top,
                                        plan,
                                        phase,
                                        phaseStart,
                                        phaseEnd
                                      });
                                    }}
                                    onMouseLeave={() => {
                                      tooltipTimeoutRef.current = setTimeout(() => {
                                        setTooltipData(null);
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

                                  </div>
                                );
                              })()}
                            </div>
                          );  // ← ADD THIS
                        });
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
                              position: 'relative',
                              cursor: 'pointer',  // 🆕 ADD
                              transition: 'all 0.2s ease'  // 🆕 ADD
                            }}
                            >
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

                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(2, 1fr)',
                                  gap: '6px',
                                  marginLeft: '12px',
                                  opacity: 0.85
                                }}
                              >
                                {/* History */}
                                <button
                                  style={styles.actionButton(false, 'history')}
                                  onClick={() => fetchPlanHistory(plan.id, plan.project)}
                                  title="View history"
                                >
                                  <History size={14} />
                                </button>

                                {/* Edit */}
                                {planPermissions[plan.id] !== 'viewer' && (
                                  <button
                                    style={styles.actionButton(false, 'edit')}
                                    onClick={() => handleEditPlan(plan)}
                                    title="Edit plan"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}

                                {/* Users/Team - NEW BUTTON */}
                                {planPermissions[plan.id] === 'owner' && (
                                  <button
                                    style={{
                                      ...styles.actionButton(false, 'users'),
                                      backgroundColor: isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)',
                                      color: '#8b5cf6'
                                    }}
                                    onClick={() => handleManageTeam(plan)}
                                    title="Manage team"
                                  >
                                    <Users size={14} />
                                  </button>
                                )}

                                {/* Delete */}
                                {(planPermissions[plan.id] === 'owner') && (
                                  <button
                                    style={styles.actionButton(false, 'delete')}
                                    onClick={() => handleDeletePlan(plan)}
                                    title="Delete plan"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

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
                                    onMouseEnter={(e) => {
                                      if (tooltipTimeoutRef.current) {
                                        clearTimeout(tooltipTimeoutRef.current);
                                      }

                                      const rect = e.currentTarget.getBoundingClientRect();

                                      setTooltipData({
                                        x: rect.left + rect.width / 2,
                                        y: rect.top,
                                        plan,
                                        phase,
                                        phaseStart,
                                        phaseEnd
                                      });
                                    }}
                                    onMouseLeave={() => {
                                      tooltipTimeoutRef.current = setTimeout(() => {
                                        setTooltipData(null);
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
                          top: '-35px',
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
            <h3 style={styles.statusModalTitle}>Change Milestone Status</h3>

            <p style={styles.statusModalSubtitle}>
              <strong>Project:</strong> {selectedMilestone.plan.project}
              <br />
              <strong>Milestone:</strong> {selectedMilestone.milestoneName}
            </p>

            <div style={{ marginBottom: '24px' }}>
              <Dropdown
                value={newStatus}
                onChange={(value) => setNewStatus(value)}
                options={['On Track', 'At Risk', 'Completed', 'Delayed']}
                isDarkMode={isDarkMode}
                compact={true}
              />
            </div>

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
                style={{
                  ...styles.modalButton(hoveredItem === 'confirm-status', 'primary'),
                  backgroundColor: hoveredItem === 'confirm-status' ? '#2563eb' : '#3b82f6'
                }}
                onMouseEnter={() => setHoveredItem('confirm-status')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={confirmStatusChange}
              >
                Update Status {/* Changed from "Submit for Approval" */}
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
              {/* 🆕 FILTER DROPDOWN */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)'
              }}>
                <Dropdown
                  label="Filter by Change Type"
                  value={changeTypeDisplayNames[historyFilter]}
                  onChange={(displayValue) => {
                    // Convert display name back to filter value
                    const filterValue = Object.keys(changeTypeDisplayNames).find(
                      key => changeTypeDisplayNames[key] === displayValue
                    );
                    setHistoryFilter(filterValue || 'all');
                  }}
                  options={Object.values(changeTypeDisplayNames)}
                  isDarkMode={isDarkMode}
                  compact={true}
                />
              </div>

              {isLoadingHistory ? (
                <ModalSkeleton isDarkMode={isDarkMode} />
              ) : planHistory.length === 0 ? (
                <div style={styles.historyEmptyState}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    No history found
                  </div>
                  <div>This plan has no recorded changes yet</div>
                </div>
              ) : (() => {
                // 🆕 APPLY FILTER
                const filteredHistory = historyFilter === 'all'
                  ? planHistory
                  : planHistory.filter(item => item.ChangeType === historyFilter);

                if (filteredHistory.length === 0) {
                  return (
                    <div style={styles.historyEmptyState}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                        No matching changes
                      </div>
                      <div>Try selecting a different filter</div>
                    </div>
                  );
                }

                return filteredHistory.map((item, index) => (
                  <div
                    key={item.Id || index}
                    style={styles.historyItem(hoveredItem === `history-${index}`)}
                    onMouseEnter={() => setHoveredItem(`history-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* ... rest of history item rendering stays the same ... */}
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

                    {item.ChangeType === 'status_changed' && item.OldValue && item.NewValue ? (
                      <div style={styles.historyChangeDetails}>
                        <span style={{
                          ...styles.historyValue(true),
                          backgroundColor: getStatusColor(item.OldValue) + '20',
                          borderColor: getStatusColor(item.OldValue) + '40',
                          color: getStatusColor(item.OldValue)
                        }}>
                          {item.OldValue}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '700' }}>→</span>
                        <span style={{
                          ...styles.historyValue(false),
                          backgroundColor: getStatusColor(item.NewValue) + '20',
                          borderColor: getStatusColor(item.NewValue) + '40',
                          color: getStatusColor(item.NewValue)
                        }}>
                          {item.NewValue}
                        </span>
                      </div>
                    ) : item.OldValue && item.NewValue ? (
                      <div style={styles.historyChangeDetails}>
                        <span style={styles.historyValue(true)}>
                          {item.OldValue}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: '700' }}>→</span>
                        <span style={styles.historyValue(false)}>
                          {item.NewValue}
                        </span>
                      </div>
                    ) : null}

                    {!item.OldValue && item.NewValue && (
                      <div style={styles.historyChangeDetails}>
                        <span style={{
                          ...styles.historyValue(false),
                          ...(item.ChangeType === 'status_changed' && {
                            backgroundColor: getStatusColor(item.NewValue) + '20',
                            borderColor: getStatusColor(item.NewValue) + '40',
                            color: getStatusColor(item.NewValue)
                          })
                        }}>
                          {item.NewValue}
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
                ));
              })()}
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
                  setHistoryFilter('all');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 MILESTONE USERS MODAL */}
      {showMilestoneUsersModal && selectedMilestoneForUsers && (
        <div style={styles.statusModal}>
          <div style={styles.statusModalContent}>
            <h3 style={styles.statusModalTitle}>Manage Milestone Users</h3>
            <p style={styles.statusModalSubtitle}>
              <strong>Project:</strong> {selectedMilestoneForUsers.plan.project}
              <br />
              <strong>Milestone:</strong> {selectedMilestoneForUsers.milestoneName}
            </p>

            {isLoadingMilestoneUsers ? (
              <ModalSkeleton isDarkMode={isDarkMode} />
            ) : (
              <>
                {/* Current Users */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '12px',
                    display: 'block'
                  }}>
                    Assigned Users ({milestoneUsers.length})
                  </label>

                  {milestoneUsers.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }}>
                      No users assigned to this milestone
                    </div>
                  ) : (
                    milestoneUsers.map(user => (
                      <div
                        key={user.userId}
                        style={{
                          ...styles.selectedUserCard,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: isDarkMode ? '#e2e8f0' : '#1e293b',
                            fontSize: '13px'
                          }}>
                            {user.firstName} {user.lastName}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: isDarkMode ? '#94a3b8' : '#64748b'
                          }}>
                            {user.email}
                          </div>
                        </div>
                        <button
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: hoveredItem === `remove-milestone-user-${user.userId}`
                              ? 'rgba(239,68,68,0.2)'
                              : 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={() => setHoveredItem(`remove-milestone-user-${user.userId}`)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={() => removeUserFromMilestone(user.userId)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add User */}
                {availableUsersForMilestone.length > 0 ? (
                  <div>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isDarkMode ? '#d1d5db' : '#374151',
                      marginBottom: '8px',
                      display: 'block'
                    }}>
                      Add Team Member to Milestone
                    </label>
                    <Dropdown
                      value=""
                      onChange={(value) => {
                        if (value) {
                          const user = availableUsersForMilestone.find(u =>
                            `${u.firstName} ${u.lastName}` === value
                          );
                          if (user) {
                            addUserToMilestone(user.userId);
                          }
                        }
                      }}
                      options={availableUsersForMilestone.map(u => `${u.firstName} ${u.lastName}`)}
                      isDarkMode={isDarkMode}
                      placeholder="Select a team member..."
                      searchable={true}
                      compact={true}
                    />
                    <div style={{
                      fontSize: '12px',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      marginTop: '8px',
                      fontStyle: 'italic'
                    }}>
                      💡 Only team members from "Manage Team" can be assigned to milestones
                    </div>
                  </div>
                ) : milestoneUsers.length > 0 ? (
                  <div style={{
                    padding: '12px',
                    backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: isDarkMode ? '#93c5fd' : '#3b82f6',
                    border: isDarkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.2)'
                  }}>
                    ✓ All team members are already assigned to this milestone
                  </div>
                ) : (
                  <div style={{
                    padding: '12px',
                    backgroundColor: isDarkMode ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.05)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: isDarkMode ? '#fbbf24' : '#f59e0b',
                    border: isDarkMode ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(251,191,36,0.2)'
                  }}>
                    ⚠️ No team members available. Add team members in "Manage Team" first.
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                style={styles.modalButton(hoveredItem === 'close-users', 'cancel')}
                onMouseEnter={() => setHoveredItem('close-users')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  setShowMilestoneUsersModal(false);
                  setSelectedMilestoneForUsers(null);
                  setMilestoneUsers([]);
                  setAvailableUsersForMilestone([]);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 TEAM MANAGEMENT MODAL */}
      {showTeamModal && selectedPlanForTeam && (
        <div style={styles.statusModal}>
          <div style={styles.statusModalContent}>
            <h3 style={styles.statusModalTitle}>Manage Team & Permissions</h3>
            <p style={styles.statusModalSubtitle}>
              <strong>Project:</strong> {selectedPlanForTeam.project}
            </p>

            {isLoadingTeamModal ? (
              <ModalSkeleton isDarkMode={isDarkMode} />
            ) : (
              <>
                {/* Current Team Members */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '12px',
                    display: 'block'
                  }}>
                    Team Members ({teamMembersForPlan.length})
                  </label>

                  {teamMembersForPlan.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.8)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }}>
                      No team members yet
                    </div>
                  ) : (
                    teamMembersForPlan.map(member => (
                      <div
                        key={member.userId}
                        style={{
                          ...styles.selectedUserCard,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: '600',
                            color: isDarkMode ? '#e2e8f0' : '#1e293b',
                            fontSize: '13px',
                            marginBottom: '2px'
                          }}>
                            {member.firstName} {member.lastName}
                            {member.permission === 'owner' && (
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#3b82f620',
                                color: '#3b82f6',
                                fontWeight: '700'
                              }}>
                                OWNER
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: isDarkMode ? '#94a3b8' : '#64748b'
                          }}>
                            {member.email}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ width: '120px' }}>
                            <Dropdown
                              value={member.permission}
                              onChange={(value) => updateTeamMemberPermission(member.userId, value)}
                              options={['owner', 'editor', 'viewer']}
                              isDarkMode={isDarkMode}
                              compact={true}
                            />
                          </div>

                          <button
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={() => removeTeamMember(member.userId)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Team Member */}
                {availableUsersForTeam.length > 0 && (
                  <div>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isDarkMode ? '#d1d5db' : '#374151',
                      marginBottom: '8px',
                      display: 'block'
                    }}>
                      Add Team Member
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                      <Dropdown
                        value={selectedUserIdForTeam ? availableUsersForTeam.find(u => u.id === parseInt(selectedUserIdForTeam))?.firstName + ' ' + availableUsersForTeam.find(u => u.id === parseInt(selectedUserIdForTeam))?.lastName : ''}
                        onChange={(value) => {
                          const user = availableUsersForTeam.find(u => `${u.firstName} ${u.lastName}` === value);
                          setSelectedUserIdForTeam(user ? user.id.toString() : '');
                        }}
                        options={availableUsersForTeam.map(u => `${u.firstName} ${u.lastName}`)}
                        isDarkMode={isDarkMode}
                        placeholder="Select a user..."
                        searchable={true}
                        compact={true}
                      />

                      <Dropdown
                        value={selectedPermissionForTeam}
                        onChange={(value) => setSelectedPermissionForTeam(value)}
                        options={['owner', 'editor', 'viewer']}
                        isDarkMode={isDarkMode}
                        compact={true}
                      />

                      <button
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: selectedUserIdForTeam ? '#3b82f6' : isDarkMode ? '#4b5563' : '#e5e7eb',
                          color: selectedUserIdForTeam ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: selectedUserIdForTeam ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={addTeamMember}
                        disabled={!selectedUserIdForTeam}
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: isDarkMode ? '#93c5fd' : '#3b82f6',
                  lineHeight: '1.6'
                }}>
                  <strong>Permissions:</strong><br />
                  • <strong>Owner:</strong> Full control including team management<br />
                  • <strong>Editor:</strong> Can edit milestones and dates<br />
                  • <strong>Viewer:</strong> Read-only access
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                style={styles.modalButton(hoveredItem === 'close-team', 'cancel')}
                onMouseEnter={() => setHoveredItem('close-team')}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  setShowTeamModal(false);
                  setSelectedPlanForTeam(null);
                  setTeamMembersForPlan([]);
                  setAvailableUsersForTeam([]);
                  setSelectedUserIdForTeam('');
                  setSelectedPermissionForTeam('editor');
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {tooltipData && (
        <div
          style={{
            position: 'fixed',
            top: Math.max(12, tooltipData.y - 12),
            left: tooltipData.x,
            transform: 'translate(-50%, -100%)',
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.98)' : '#ffffff',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '14px 18px',
            minWidth: '220px',
            maxWidth: '320px',
            zIndex: 9999999,
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            border: isDarkMode
              ? '1px solid rgba(51,65,85,0.8)'
              : '1px solid rgba(226,232,240,0.9)',
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => {
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current);
            }
          }}
          onMouseLeave={() => {
            tooltipTimeoutRef.current = setTimeout(() => {
              setTooltipData(null);
            }, 150);
          }}
        >
          {/* TITLE */}
          <div
            style={{
              fontWeight: 700,
              marginBottom: '6px',
              color: isDarkMode ? '#f8fafc' : '#1e293b'
            }}
          >
            {tooltipData.phase.name}
          </div>

          {/* DATES */}
          <div
            style={{
              fontSize: '11px',
              marginBottom: '6px',
              color: isDarkMode ? '#cbd5f5' : '#475569',
              opacity: 1
            }}
          >
            {tooltipData.phaseStart.toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })} –{' '}
            {tooltipData.phaseEnd.toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })}
          </div>

          {/* STATUS */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: tooltipData.phase.color,
              marginBottom: '10px'
            }}
          >
            {tooltipData.phase.status}
          </div>

          {/* MANAGE USERS */}
          {(planPermissions[tooltipData.plan.id] === 'owner') && (
            <button
              style={{
                ...styles.changeStatusButton(false),
                width: '100%',
                marginBottom: '6px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: '1px solid #2563eb',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
                boxShadow: hoveredItem === 'tooltip-team'
                  ? '0 6px 16px rgba(59,130,246,0.35)'
                  : 'none',
                transform: hoveredItem === 'tooltip-team'
                  ? 'translateY(-1px)'
                  : 'none'
              }}
              onMouseEnter={() => setHoveredItem('tooltip-team')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (tooltipTimeoutRef.current) {
                  clearTimeout(tooltipTimeoutRef.current);
                }
                setTooltipData(null); // Close tooltip immediately
                handleManageMilestoneUsers(
                  tooltipData.plan,
                  tooltipData.phase.name,
                  tooltipData.phase.id
                );
              }}
            >
              <Users size={12} />
              Milestone Team
            </button>
          )}

          {/* CHANGE STATUS */}
          {planPermissions[tooltipData.plan.id] === 'owner' && (
            <button
              style={{
                ...styles.changeStatusButton(false),
                width: '100%',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
                boxShadow: hoveredItem === 'tooltip-status'
                  ? '0 6px 16px rgba(59,130,246,0.35)'
                  : 'none',
                transform: hoveredItem === 'tooltip-status'
                  ? 'translateY(-1px)'
                  : 'none'
              }}
              onMouseEnter={() => setHoveredItem('tooltip-status')}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (tooltipTimeoutRef.current) {
                  clearTimeout(tooltipTimeoutRef.current);
                }
                setTooltipData(null); // Close tooltip immediately
                handleChangeStatus(
                  tooltipData.plan,
                  tooltipData.phase.name,
                  tooltipData.phase.status
                );
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
};

export default AdminViewPlan;