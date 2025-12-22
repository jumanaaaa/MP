import React, { useEffect, useState } from "react";
import {
    Layers,
    Globe,
    Users,
    Plus,
    Save,
    User,
    Shield,
    Eye,
    Lock,
    Trash2,
    Sparkles,
    Zap,
    X,
    ChevronDown,
    ChevronRight,
    Briefcase,
    Cog
} from "lucide-react";

const SecretDepartmentsPage = () => {
    const allowedEmails = ['muhammad.hasan@ihrp.sg', 'jumana.haseen@ihrp.sg'];
    const [aiContext, setAiContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userData, setUserData] = useState(null);

    // modals / state
    const [showAddContext, setShowAddContext] = useState(false);
    const [activeContext, setActiveContext] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);
    const [showProfileTooltip, setShowProfileTooltip] = useState(false);
    const [profileAnchor, setProfileAnchor] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        aiContext: true,
        websites: true
    });

    const [newContext, setNewContext] = useState({
        domainId: "",
        name: "",
        purpose: "",
        aiContext: "",
        projectType: "Project"
    });

    const [showWebsiteInputs, setShowWebsiteInputs] = useState(false);
    const [websiteInputs, setWebsiteInputs] = useState([
        { value: "", description: "" }
    ]);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        try {
            const savedMode = localStorage.getItem('darkMode');
            return savedMode === 'true';
        } catch (error) {
            return true;
        }
    });

    // ======================
    // FETCH DATA
    // ======================
    useEffect(() => {
        fetchAIContext();
        fetchUserData();
    }, []);

    useEffect(() => {
        setShowWebsiteInputs(false);
        setWebsiteInputs([{ value: "", description: "" }]);
    }, [activeContext?.id]);

    const fetchUserData = async () => {
        try {
            const response = await fetch('http://localhost:3000/user/profile', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                setUserData(data);
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    const fetchAIContext = async () => {
        try {
            const res = await fetch(
                "http://localhost:3000/api/ai/admin/structure",
                { credentials: "include" }
            );

            if (!res.ok) throw new Error("Failed to load admin AI structure");

            const data = await res.json();
            setAiContext(data.domains || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ======================
    // ACTIONS
    // ======================
    const createContext = async () => {
        if (!newContext.domainId) {
            alert("Please select a department");
            return;
        }

        if (!newContext.name.trim()) {
            alert("Please enter a context name");
            return;
        }

        try {
            await fetch("http://localhost:3000/api/ai/contexts", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newContext)
            });

            setShowAddContext(false);
            setNewContext({ domainId: "", name: "", purpose: "", aiContext: "", projectType: "Project" });
            fetchAIContext();
        } catch (error) {
            console.error('Failed to create context:', error);
            alert('Failed to create context. Please try again.');
        }
    };

    const addWebsiteRow = () => {
        setWebsiteInputs([...websiteInputs, { value: "", description: "" }]);
    };

    const updateWebsiteRow = (index, field, val) => {
        const updated = [...websiteInputs];
        updated[index][field] = val;
        setWebsiteInputs(updated);
    };

    const saveWebsites = async () => {
        if (!activeContext) return;

        const existing = (activeContext.resources || []).map(r => r.value);

        const validSites = websiteInputs.filter(
            w => w.value.trim() && !existing.includes(w.value.trim())
        );

        if (validSites.length === 0) {
            alert("Add at least one website");
            return;
        }

        try {
            for (const site of validSites) {
                await fetch("http://localhost:3000/api/ai/context-resources", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contextId: activeContext.id,
                        resourceType: "website",
                        identifier: site.value,
                        description: site.description
                    })
                });
            }

            setWebsiteInputs([{ value: "", description: "" }]);
            setShowWebsiteInputs(false);
            fetchAIContext();
        } catch (error) {
            console.error('Failed to save websites:', error);
            alert('Failed to save websites. Please try again.');
        }
    };

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        setShowProfileTooltip(false);
        try {
            localStorage.setItem('darkMode', newMode);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // ======================
    // STYLES
    // ======================
    const styles = {
        page: {
            minHeight: "100vh",
            padding: '32px',
            background: isDarkMode
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
            fontFamily: '"Montserrat", sans-serif',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
        },
        pageGlow: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDarkMode
                ? 'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)'
                : 'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0
        },
        headerRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            position: 'relative',
            zIndex: 10
        },
        header: {
            fontSize: '28px',
            fontWeight: '700',
            background: isDarkMode
                ? 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        headerIcon: {
            animation: 'pulse 2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))'
        },
        subtitle: {
            fontSize: '14px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            marginTop: '8px',
            fontWeight: '500',
            letterSpacing: '0.5px'
        },
        headerRight: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            position: 'relative'
        },
        addButton: (isHovered) => ({
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: isHovered
                ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isHovered
                ? '0 8px 25px rgba(139,92,246,0.3)'
                : '0 4px 12px rgba(139,92,246,0.2)',
            transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0)',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }),
        profileButton: (isHovered) => ({
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: isHovered
                ? 'rgba(139,92,246,0.15)'
                : isDarkMode ? 'rgba(51,65,85,0.9)' : 'rgba(255,255,255,0.9)',
            color: isHovered ? '#8b5cf6' : isDarkMode ? '#e2e8f0' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isHovered
                ? '0 8px 25px rgba(139,92,246,0.2)'
                : '0 4px 12px rgba(0,0,0,0.08)',
            transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }),
        profileTooltip: {
            position: 'fixed',
            top: '80px',
            right: '32px',
            backgroundColor: isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
            padding: '16px',
            minWidth: '250px',
            border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(255,255,255,0.8)',
            zIndex: 999999,   // now actually works
            pointerEvents: 'auto',
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
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '600',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
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
            backgroundColor: 'rgba(139,92,246,0.1)',
            color: '#8b5cf6',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '8px',
            width: '100%',
            transition: 'all 0.2s ease'
        },
        contentContainer: {
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: '28px',
            position: 'relative',
            zIndex: 10
        },
        panel: (isHovered) => ({
            background: isDarkMode
                ? 'rgba(30,41,59,0.6)'
                : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '28px',
            border: isDarkMode
                ? '1px solid rgba(139,92,246,0.2)'
                : '1px solid rgba(139,92,246,0.1)',
            boxShadow: isHovered
                ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(139,92,246,0.1)'
                : '0 8px 25px rgba(0,0,0,0.08)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            position: 'relative',
            overflow: 'visible'
        }),
        panelGlow: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)',
            opacity: 0.5
        },
        panelTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '18px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: isDarkMode
                ? '2px solid rgba(139,92,246,0.2)'
                : '2px solid rgba(139,92,246,0.1)'
        },
        typeHeader: {
            fontSize: '13px',
            fontWeight: '700',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: '16px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        contextCard: (isActive, isHovered) => ({
            background: isActive
                ? (isDarkMode ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)')
                : (isHovered ? (isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(248,250,252,0.8)') : 'transparent'),
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '10px',
            border: isActive
                ? (isDarkMode ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(139,92,246,0.3)')
                : (isDarkMode ? '1px solid rgba(51,65,85,0.3)' : '1px solid rgba(226,232,240,0.5)'),
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
            boxShadow: isActive ? '0 4px 12px rgba(139,92,246,0.2)' : 'none'
        }),
        contextTitle: {
            fontWeight: '600',
            fontSize: '14px',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        },
        contextSubtitle: {
            fontSize: '11px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px'
        },
        muted: {
            fontSize: '12px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            lineHeight: '1.4'
        },
        sectionHeader: (isExpanded, isHovered) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            marginTop: '16px',
            marginBottom: '12px',
            background: isHovered
                ? (isDarkMode ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)')
                : (isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(248,250,252,0.5)'),
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: isDarkMode
                ? '1px solid rgba(139,92,246,0.2)'
                : '1px solid rgba(139,92,246,0.1)'
        }),
        sectionTitle: {
            fontSize: '16px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        sectionContent: (isExpanded) => ({
            maxHeight: isExpanded ? '2000px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
            paddingTop: isExpanded ? '8px' : '0'
        }),
        button: (isHovered, variant = 'primary') => {
            const variants = {
                primary: {
                    background: isHovered
                        ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                        : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    color: '#fff'
                },
                secondary: {
                    background: isHovered
                        ? (isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)')
                        : (isDarkMode ? 'rgba(51,65,85,0.6)' : 'rgba(248,250,252,0.7)'),
                    color: isDarkMode ? '#e2e8f0' : '#1e293b'
                }
            };

            return {
                marginTop: '12px',
                padding: '12px 20px',
                ...variants[variant],
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered
                    ? '0 8px 20px rgba(139,92,246,0.3)'
                    : '0 4px 12px rgba(139,92,246,0.2)',
                width: '100%'
            };
        },
        input: {
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: isDarkMode
                ? '1px solid rgba(139,92,246,0.3)'
                : '1px solid rgba(139,92,246,0.2)',
            background: isDarkMode
                ? 'rgba(30,41,59,0.5)'
                : 'rgba(255,255,255,0.8)',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease',
            marginBottom: '12px',
            fontFamily: '"Montserrat", sans-serif'
        },
        select: {
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: isDarkMode
                ? '1px solid rgba(139,92,246,0.3)'
                : '1px solid rgba(139,92,246,0.2)',
            background: isDarkMode
                ? 'rgba(30,41,59,0.5)'
                : 'rgba(255,255,255,0.8)',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease',
            marginBottom: '12px',
            fontFamily: '"Montserrat", sans-serif',
            cursor: 'pointer'
        },
        textarea: {
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: isDarkMode
                ? '1px solid rgba(139,92,246,0.3)'
                : '1px solid rgba(139,92,246,0.2)',
            background: isDarkMode
                ? 'rgba(30,41,59,0.5)'
                : 'rgba(255,255,255,0.8)',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease',
            marginBottom: '12px',
            fontFamily: '"Montserrat", sans-serif',
            resize: 'vertical',
            minHeight: '80px'
        },
        tag: (isHovered) => ({
            background: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#8b5cf6',
            marginRight: '8px',
            marginBottom: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            border: isDarkMode
                ? '1px solid rgba(139,92,246,0.3)'
                : '1px solid rgba(139,92,246,0.2)'
        }),
        deleteButton: (isHovered) => ({
            background: 'transparent',
            border: 'none',
            color: isHovered ? '#dc2626' : '#ef4444',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)'
        }),
        websiteInput: {
            display: 'flex',
            gap: '8px',
            marginBottom: '8px',
            alignItems: 'center'
        },
        websiteAddButton: (isHovered) => ({
            padding: '12px',
            background: isHovered
                ? (isDarkMode ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)')
                : (isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)'),
            border: 'none',
            borderRadius: '8px',
            color: '#8b5cf6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
        }),
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease'
        },
        modalContent: {
            background: isDarkMode
                ? 'rgba(30,41,59,0.95)'
                : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            border: isDarkMode
                ? '1px solid rgba(139,92,246,0.3)'
                : '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease',
            position: 'relative'
        },
        modalTitle: {
            fontSize: '24px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        modalClose: (isHovered) => ({
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: isHovered ? '#ef4444' : (isDarkMode ? '#94a3b8' : '#64748b'),
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }),
        label: {
            fontSize: '12px',
            fontWeight: '600',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            marginBottom: '6px',
            display: 'block'
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px 20px',
            color: isDarkMode ? '#94a3b8' : '#64748b'
        },
        loadingState: {
            textAlign: 'center',
            padding: '60px 20px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontSize: '16px'
        }
    };

    // Add animations
    if (typeof document !== 'undefined' && !document.getElementById('secret-animations')) {
        const style = document.createElement('style');
        style.id = 'secret-animations';
        style.innerHTML = `
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { 
                    opacity: 0; 
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0);
                }
            }
            .input-focus:focus, select:focus {
                border-color: ${isDarkMode ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.4)'} !important;
                box-shadow: 0 0 0 3px rgba(139,92,246,0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ======================
    // RENDER
    // ======================
    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.pageGlow} />
                <div style={styles.loadingState}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                        Accessing Secret Departments...
                    </div>
                </div>
            </div>
        );
    }

    const isAuthorized = userData && allowedEmails.includes(userData.email);

    if (!isAuthorized) {
        return (
            <div style={styles.page}>
                <div style={styles.pageGlow} />
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚫</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                        Private Access Only
                    </div>
                    <p style={{ ...styles.muted, maxWidth: '400px', margin: '0 auto' }}>
                        This department is restricted to authorized personnel only. 
                        Your email (<strong>{userData?.email || 'Unknown'}</strong>) does not have permission to view this page.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/admindashboard'}
                        style={{ ...styles.button(hoveredItem === 'back'), width: 'auto', marginTop: '24px', padding: '12px 32px' }}
                        onMouseEnter={() => setHoveredItem('back')}
                        onMouseLeave={() => setHoveredItem(null)}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.page}>
                <div style={styles.pageGlow} />
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                        Access Denied
                    </div>
                    <div>Error: {error}</div>
                </div>
            </div>
        );
    }

    // Group contexts by domain and project type
    const groupedContexts = {};
    aiContext?.forEach(domain => {
        if (!groupedContexts[domain.name]) {
            groupedContexts[domain.name] = {
                id: domain.id,
                name: domain.name,
                projects: [],
                operations: []
            };
        }

        domain.contexts?.forEach(ctx => {
            const contextWithDomain = {
                ...ctx,
                domainName: domain.name,
                domainId: domain.id
            };

            if (ctx.projectType === 'Operations') {
                groupedContexts[domain.name].operations.push(contextWithDomain);
            } else {
                groupedContexts[domain.name].projects.push(contextWithDomain);
            }
        });
    });

    // Calculate total contexts
    const totalContexts = aiContext?.reduce((sum, d) => sum + (d.contexts?.length || 0), 0) || 0;

    return (
        <div style={styles.page}>
            <div style={styles.pageGlow} />

            {/* Header */}
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.header}>
                        <span style={styles.headerIcon}>🔐</span>
                        Secret Departments
                    </h1>
                    <div style={styles.subtitle}>
                        <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
                        AI Context Management System
                    </div>
                </div>

                <div style={styles.headerRight}>
                    {/* Add Context Button */}
                    <button
                        style={styles.addButton(hoveredItem === 'add-context')}
                        onMouseEnter={() => setHoveredItem('add-context')}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => setShowAddContext(true)}
                    >
                        <Plus size={18} />
                        New Context
                    </button>

                    {/* Profile Button */}
                    <div style={{ position: 'relative', zIndex: 100000 }}>
                        <button
                            style={styles.profileButton(hoveredCard === 'profile')}
                            onMouseEnter={(e) => {
                                setHoveredCard('profile');
                                const rect = e.currentTarget.getBoundingClientRect();
                                setProfileAnchor({
                                    top: rect.bottom + 12,
                                    right: window.innerWidth - rect.right
                                });
                                setShowProfileTooltip(true);
                            }}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <User size={20} />
                        </button>


                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={styles.contentContainer}>
                {/* LEFT: CONTEXT LIST */}
                <div
                    style={styles.panel(hoveredCard === 'left')}
                    onMouseEnter={() => setHoveredCard('left')}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <div style={styles.panelGlow} />

                    <h3 style={styles.panelTitle}>
                        <Layers size={20} />
                        All Contexts ({totalContexts})
                    </h3>

                    {totalContexts === 0 && (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
                            <p style={styles.muted}>No contexts created yet</p>
                            <p style={{ ...styles.muted, marginTop: '8px' }}>
                                Click "New Context" to get started
                            </p>
                        </div>
                    )}

                    {Object.values(groupedContexts).map(domain => (
                        <div key={`domain-${domain.id}`} style={{ marginBottom: '24px' }}>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <Shield size={16} style={{ color: '#8b5cf6' }} />
                                {domain.name}
                            </div>

                            {/* Projects */}
                            {domain.projects.length > 0 && (
                                <>
                                    <div style={styles.typeHeader}>
                                        <Briefcase size={12} />
                                        Projects
                                    </div>
                                    {domain.projects.map(ctx => (
                                        <div
                                            key={`ctx-${ctx.id}`}
                                            style={styles.contextCard(
                                                activeContext?.id === ctx.id,
                                                hoveredItem === `ctx-${ctx.id}`
                                            )}
                                            onClick={() => setActiveContext(ctx)}
                                            onMouseEnter={() => setHoveredItem(`ctx-${ctx.id}`)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                        >
                                            <div style={styles.contextTitle}>
                                                <Zap size={14} />
                                                {ctx.name}
                                            </div>
                                            <div style={styles.muted}>{ctx.purpose}</div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Operations */}
                            {domain.operations.length > 0 && (
                                <>
                                    <div style={styles.typeHeader}>
                                        <Cog size={12} />
                                        Operations
                                    </div>
                                    {domain.operations.map(ctx => (
                                        <div
                                            key={`ctx-${ctx.id}`}
                                            style={styles.contextCard(
                                                activeContext?.id === ctx.id,
                                                hoveredItem === `ctx-${ctx.id}`
                                            )}
                                            onClick={() => setActiveContext(ctx)}
                                            onMouseEnter={() => setHoveredItem(`ctx-${ctx.id}`)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                        >
                                            <div style={styles.contextTitle}>
                                                <Zap size={14} />
                                                {ctx.name}
                                            </div>
                                            <div style={styles.muted}>{ctx.purpose}</div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* RIGHT: CONTEXT DETAILS */}
                <div
                    style={styles.panel(hoveredCard === 'right')}
                    onMouseEnter={() => setHoveredCard('right')}
                    onMouseLeave={() => setHoveredCard(null)}
                >
                    <div style={styles.panelGlow} />

                    {!activeContext && (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎯</div>
                            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                                Select a context to view details
                            </div>
                            <p style={styles.muted}>
                                Choose a project context from the left panel to manage its settings
                            </p>
                        </div>
                    )}

                    {activeContext && (
                        <>
                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <Sparkles size={24} style={{ color: '#8b5cf6' }} />
                                {activeContext.name}
                            </h2>
                            <p style={{ ...styles.muted, marginBottom: '8px' }}>
                                {activeContext.purpose}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
                                    border: isDarkMode ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(139,92,246,0.2)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#8b5cf6'
                                }}>
                                    <Shield size={10} />
                                    {activeContext.domainName}
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: activeContext.projectType === 'Operations'
                                        ? (isDarkMode ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.1)')
                                        : (isDarkMode ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)'),
                                    border: activeContext.projectType === 'Operations'
                                        ? '1px solid rgba(245,158,11,0.3)'
                                        : '1px solid rgba(16,185,129,0.3)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: activeContext.projectType === 'Operations' ? '#f59e0b' : '#10b981'
                                }}>
                                    {activeContext.projectType === 'Operations' ? <Cog size={10} /> : <Briefcase size={10} />}
                                    {activeContext.projectType || 'Project'}
                                </div>
                            </div>

                            {/* AI Context Section */}
                            <div
                                style={styles.sectionHeader(
                                    expandedSections.aiContext,
                                    hoveredItem === 'section-ai'
                                )}
                                onClick={() => toggleSection('aiContext')}
                                onMouseEnter={() => setHoveredItem('section-ai')}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                <div style={styles.sectionTitle}>
                                    <Lock size={16} />
                                    AI Context
                                </div>
                                {expandedSections.aiContext ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </div>
                            <div style={styles.sectionContent(expandedSections.aiContext)}>
                                <p style={{
                                    ...styles.muted,
                                    padding: '16px',
                                    background: isDarkMode
                                        ? 'rgba(139,92,246,0.1)'
                                        : 'rgba(139,92,246,0.05)',
                                    borderRadius: '10px',
                                    border: isDarkMode
                                        ? '1px solid rgba(139,92,246,0.2)'
                                        : '1px solid rgba(139,92,246,0.1)',
                                    lineHeight: '1.6'
                                }}>
                                    {activeContext.aiContext}
                                </p>
                            </div>

                            {/* Websites Section */}
                            <div
                                style={styles.sectionHeader(
                                    expandedSections.websites,
                                    hoveredItem === 'section-web'
                                )}
                                onClick={() => toggleSection('websites')}
                                onMouseEnter={() => setHoveredItem('section-web')}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                <div style={styles.sectionTitle}>
                                    <Globe size={16} />
                                    Linked Websites ({(activeContext.resources || []).length})
                                </div>
                                {expandedSections.websites ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </div>
                            <div style={styles.sectionContent(expandedSections.websites)}>
                                {!showWebsiteInputs && (
                                    <button
                                        style={styles.button(hoveredItem === 'add-website', 'secondary')}
                                        onMouseEnter={() => setHoveredItem('add-website')}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        onClick={() => setShowWebsiteInputs(true)}
                                    >
                                        <Plus size={16} />
                                        Add Website
                                    </button>
                                )}

                                {showWebsiteInputs && (
                                    <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                                        {websiteInputs.map((w, i) => (
                                            <div key={`website-input-${i}`} style={styles.websiteInput}>
                                                <input
                                                    className="input-focus"
                                                    style={{ ...styles.input, flex: 2, marginBottom: 0 }}
                                                    placeholder="https://website.com"
                                                    value={w.value}
                                                    onChange={e =>
                                                        updateWebsiteRow(i, "value", e.target.value)
                                                    }
                                                />

                                                <input
                                                    className="input-focus"
                                                    style={{ ...styles.input, flex: 2, marginBottom: 0 }}
                                                    placeholder="Description (optional)"
                                                    value={w.description}
                                                    onChange={e =>
                                                        updateWebsiteRow(i, "description", e.target.value)
                                                    }
                                                />

                                                <button
                                                    style={styles.websiteAddButton(hoveredItem === `add-row-${i}`)}
                                                    onMouseEnter={() => setHoveredItem(`add-row-${i}`)}
                                                    onMouseLeave={() => setHoveredItem(null)}
                                                    onClick={addWebsiteRow}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            style={styles.button(hoveredItem === 'save-websites')}
                                            onMouseEnter={() => setHoveredItem('save-websites')}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            onClick={saveWebsites}
                                        >
                                            <Save size={16} />
                                            Save Websites
                                        </button>
                                    </div>
                                )}

                                <div style={{ marginTop: '16px' }}>
                                    {(activeContext.resources || []).length === 0 && (
                                        <p style={styles.muted}>No websites linked yet</p>
                                    )}

                                    {(activeContext.resources || []).map((r) => (
                                        <div
                                            key={`resource-${r.id}`}
                                            style={styles.tag(hoveredItem === `tag-${r.id}`)}
                                            onMouseEnter={() => setHoveredItem(`tag-${r.id}`)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                        >
                                            <Globe size={12} />
                                            <span>{r.value}</span>

                                            <button
                                                onClick={async () => {
                                                    await fetch(
                                                        `http://localhost:3000/api/ai/context-resources/${r.id}`,
                                                        {
                                                            method: "DELETE",
                                                            credentials: "include"
                                                        }
                                                    );
                                                    fetchAIContext();
                                                }}
                                                style={styles.deleteButton(hoveredItem === `delete-${r.id}`)}
                                                onMouseEnter={() => setHoveredItem(`delete-${r.id}`)}
                                                onMouseLeave={() => setHoveredItem(null)}
                                                title="Remove website"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ADD CONTEXT MODAL */}
            {showAddContext && (
                <div style={styles.modal} onClick={() => setShowAddContext(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button
                            style={styles.modalClose(hoveredItem === 'close')}
                            onMouseEnter={() => setHoveredItem('close')}
                            onMouseLeave={() => setHoveredItem(null)}
                            onClick={() => setShowAddContext(false)}
                        >
                            <X size={20} />
                        </button>

                        <h3 style={styles.modalTitle}>
                            <Sparkles size={24} />
                            Create New Context
                        </h3>

                        <label style={styles.label}>
                            Department *
                        </label>
                        <select
                            className="input-focus"
                            style={styles.select}
                            value={newContext.domainId}
                            onChange={e => setNewContext({ ...newContext, domainId: e.target.value })}
                        >
                            <option value="">Select a department...</option>
                            {aiContext?.map(domain => (
                                <option key={`domain-option-${domain.id}`} value={domain.id}>
                                    {domain.name}
                                </option>
                            ))}
                        </select>

                        <label style={styles.label}>
                            Project Type *
                        </label>
                        <select
                            className="input-focus"
                            style={styles.select}
                            value={newContext.projectType}
                            onChange={e => setNewContext({ ...newContext, projectType: e.target.value })}
                        >
                            <option value="Project">Project</option>
                            <option value="Operations">Operations</option>
                        </select>

                        <label style={styles.label}>
                            Context Name *
                        </label>
                        <input
                            className="input-focus"
                            style={styles.input}
                            placeholder="e.g., Project Alpha, Marketing Campaign"
                            value={newContext.name}
                            onChange={e => setNewContext({ ...newContext, name: e.target.value })}
                        />

                        <label style={styles.label}>
                            Purpose
                        </label>
                        <textarea
                            className="input-focus"
                            style={styles.textarea}
                            placeholder="Brief description of this context"
                            value={newContext.purpose}
                            onChange={e => setNewContext({ ...newContext, purpose: e.target.value })}
                        />

                        <label style={styles.label}>
                            AI Context / Instructions
                        </label>
                        <textarea
                            className="input-focus"
                            style={styles.textarea}
                            placeholder="Provide context and instructions for AI"
                            value={newContext.aiContext}
                            onChange={e =>
                                setNewContext({ ...newContext, aiContext: e.target.value })
                            }
                        />

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                style={styles.button(hoveredItem === 'cancel', 'secondary')}
                                onMouseEnter={() => setHoveredItem('cancel')}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={() => setShowAddContext(false)}
                            >
                                Cancel
                            </button>
                            <button
                                style={styles.button(hoveredItem === 'create')}
                                onMouseEnter={() => setHoveredItem('create')}
                                onMouseLeave={() => setHoveredItem(null)}
                                onClick={createContext}
                            >
                                <Save size={16} />
                                Create Context
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showProfileTooltip && profileAnchor && (
                <div
                    style={{
                        ...styles.profileTooltip,
                        top: profileAnchor.top,
                        right: profileAnchor.right,
                        zIndex: 2147483647 // absolute top layer
                    }}
                    onMouseEnter={() => setShowProfileTooltip(true)}
                    onMouseLeave={() => setShowProfileTooltip(false)}
                >
                    <div style={styles.tooltipArrow} />

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
                            <div style={styles.tooltipStatNumber}>{aiContext?.length || 0}</div>
                            <div style={styles.tooltipStatLabel}>Domains</div>
                        </div>
                        <div style={styles.tooltipStatItem}>
                            <div style={styles.tooltipStatNumber}>{totalContexts}</div>
                            <div style={styles.tooltipStatLabel}>Contexts</div>
                        </div>
                        <div style={styles.tooltipStatItem}>
                            <div style={styles.tooltipStatNumber}>
                                {Object.values(groupedContexts).reduce((s, d) => s + d.projects.length, 0)}
                            </div>
                            <div style={styles.tooltipStatLabel}>Projects</div>
                        </div>
                    </div>

                    <button style={styles.themeToggle} onClick={toggleTheme}>
                        {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                </div>
            )}

        </div>
    );
};

export default SecretDepartmentsPage;