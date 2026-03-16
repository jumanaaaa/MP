import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Bot, HelpCircle, X, ChevronDown, ChevronUp, Sparkles, Minimize2, Maximize2, Download } from 'lucide-react';

/**
 * MaxCap Help Page with Microsoft Copilot Studio Integration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Microsoft Copilot Studio
 * 2. Upload MaxCap_Training_Guide_Complete.md to Knowledge base
 * 3. Go to Channels → Web app
 * 4. Copy the embed code
 * 5. Replace the iframe src below with your actual embed URL
 */

const AdminHelp = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState({
        'getting-started': true // Expand first section by default
    });
    const [showChatbot, setShowChatbot] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        try {
            const savedMode = localStorage.getItem('darkMode');
            return savedMode === 'true';
        } catch {
            return false;
        }
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const helpSections = [
        {
            id: 'getting-started',
            title: '🚀 Getting Started',
            icon: <Sparkles size={20} />,
            content: [
                {
                    question: 'New to MaxCap? Start Here!',
                    answer: `Step 1: Set Up Your Profile
- Click your avatar in the top-right corner
- Complete your personal information
- Connect ManicTime (ask admin for help)

Step 2: Create Your First Individual Plan
- Go to Plan → Individual Plan
- Click + Create New Plan
- Choose project type and add milestones

Step 3: Start Tracking Time
- Go to Actuals → Actuals
- Select category, enter dates and hours
- Save your entry

Step 4: Plan Your Week
- Go to Plan → Weekly Allocation
- Use AI recommendations ✨

Step 5: Review Your Performance
- Go to Reports
- Analyze capacity utilization`
                }
            ]
        },
        {
            id: 'navigation',
            title: '📍 Page Navigation',
            icon: <BookOpen size={20} />,
            content: [
                {
                    question: 'Dashboard',
                    answer: 'Overview of your work with stats, calendar, recent activity, and quick actions.'
                },
                {
                    question: 'Actuals',
                    answer: 'Time tracking with three sections:\n• Manual Entry\n• ManicTime View\n• AI Project Matching'
                },
                {
                    question: 'Plan',
                    answer: 'Three sections:\n• Master Plan (organization-level)\n• Individual Plan (your assignments)\n• Weekly Allocation (short-term planning)'
                },
                {
                    question: 'Reports',
                    answer: 'Analytics and performance metrics with capacity trends and project performance.'
                }
            ]
        },
        {
            id: 'ai-features',
            title: '✨ AI-Powered Features',
            icon: <Bot size={20} />,
            content: [
                {
                    question: 'AI Project Matching',
                    answer: `Automatically matches ManicTime activities to projects

How to use:
1. Actuals → Match Projects
2. Select projects
3. Click "Match with AI" ✨
4. Review matches
5. Accept and save

Best for: Weekly automation`
                },
                {
                    question: 'AI Milestone Recommendations',
                    answer: `Suggests realistic milestones based on patterns

How to use:
1. Create/Edit Individual Plan
2. Click "Get AI Recommendations" ✨
3. Review suggestions
4. Accept or modify

Best for: New plan creation`
                },
                {
                    question: 'AI Weekly Allocation',
                    answer: `Balances time across active projects

How to use:
1. Plan → Weekly Allocation
2. Select week
3. Click "Get AI Recommendations" ✨
4. Review allocation
5. Save

Best for: Monday planning`
                }
            ]
        },
        {
            id: 'common-tasks',
            title: '🔧 Common Tasks',
            icon: <HelpCircle size={20} />,
            content: [
                {
                    question: 'Track time manually',
                    answer: `1. Actuals → Actuals
2. Select Category
3. Choose project/leave type
4. Enter dates and hours
5. Save`
                },
                {
                    question: 'Create individual plan',
                    answer: `1. Plan → Individual Plan
2. + Create New Plan
3. Choose project type
4. Set timeline
5. Add milestones (manual or AI)
6. Save`
                },
                {
                    question: 'Plan your week',
                    answer: `1. Plan → Weekly Allocation
2. Select week
3. Add hours manually OR use AI ✨
4. Review capacity (<100%)
5. Save`
                },
                {
                    question: 'Connect ManicTime',
                    answer: `1. Contact admin
2. Provide device name
3. Admin configures setup
4. Profile → ManicTime Integration
5. Test Connection
6. Should show 🟢 Connected`
                }
            ]
        },
        {
            id: 'metrics',
            title: '🎯 Key Metrics',
            icon: <Search size={20} />,
            content: [
                {
                    question: 'Planning Accuracy',
                    answer: `(Actual ÷ Planned) × 100%

✅ 95-105%: Excellent
🟢 90-110%: Good
🟡 85-115%: Fair
🔴 <85% or >115%: Review needed`
                },
                {
                    question: 'Capacity Utilization',
                    answer: `(Hours Logged ÷ Available) × 100%

🟢 0-85%: Healthy
🟡 85-100%: At capacity
🔴 >100%: Over-allocated

Default: 42.5 hours/week`
                },
                {
                    question: 'Efficiency',
                    answer: `(Spent ÷ Planned) × 100%

🟢 90-110%: On track
🟡 80-120%: Watch zone
🔴 <80% or >120%: Attention needed`
                }
            ]
        },
        {
            id: 'faq',
            title: '❓ Troubleshooting',
            icon: <HelpCircle size={20} />,
            content: [
                {
                    question: 'ManicTime activities not showing?',
                    answer: `Check:
- Connection status (Profile)
- Date range has work days
- Admin configured device
- ManicTime app running
- Not in excluded list

Contact admin if persists`
                },
                {
                    question: 'AI matching found 0 matches?',
                    answer: `Reasons:
- No AI Context configured
- Wrong date range
- Activity names mismatch
- Activities filtered out

Fix: Configure AI Context resources`
                },
                {
                    question: 'Calendar won\'t load?',
                    answer: `Token expired:
1. Profile → Microsoft Integration
2. Click "Reconnect"
3. Sign in
4. Grant permissions
5. Try again

Tokens expire ~90 days`
                }
            ]
        }
    ];

    const filteredSections = searchQuery
        ? helpSections.map(section => ({
            ...section,
            content: section.content.filter(
                item =>
                    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })).filter(section => section.content.length > 0)
        : helpSections;

    const styles = {
        container: {
            minHeight: '100vh',
            background: isDarkMode
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '30px 40px',
            margin: '0',
            fontFamily: '"Montserrat", sans-serif',
        },
        header: {
            background: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            border: isDarkMode ? '1px solid rgba(71, 85, 105, 0.8)' : '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
        title: {
            fontSize: '32px',
            fontWeight: '700',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        subtitle: {
            fontSize: '16px',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            marginBottom: '8px',
        },
        aiNote: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
            borderRadius: '8px',
            marginTop: '16px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
        },
        aiNoteText: {
            fontSize: '14px',
            color: isDarkMode ? '#93c5fd' : '#2563eb',
        },
        downloadButton: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '12px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)',
            background: isDarkMode
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(59, 130, 246, 0.06)',
            color: isDarkMode ? '#93c5fd' : '#2563eb',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            fontFamily: '"Montserrat", sans-serif',
        },
        searchContainer: {
            position: 'relative',
            marginTop: '24px',
        },
        searchInput: {
            width: '100%',
            padding: '14px 48px 14px 48px',
            borderRadius: '12px',
            border: isDarkMode ? '1px solid rgba(71, 85, 105, 0.8)' : '1px solid rgba(226, 232, 240, 0.8)',
            background: isDarkMode ? 'rgba(51, 65, 85, 0.6)' : 'rgba(255, 255, 255, 0.9)',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease',
        },
        searchIcon: {
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: isDarkMode ? '#64748b' : '#94a3b8',
        },
        contentGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
            gap: '20px',
            marginBottom: '100px', // Space for floating chatbot
        },
        section: {
            background: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            border: isDarkMode ? '1px solid rgba(71, 85, 105, 0.8)' : '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
        },
        sectionHeader: (isExpanded) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '8px',
            transition: 'background 0.2s ease',
            background: isExpanded ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
        }),
        sectionTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '20px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
        },
        questionBlock: {
            marginTop: '16px',
            padding: '16px',
            borderLeft: '3px solid #3b82f6',
            background: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(248, 250, 252, 0.8)',
            borderRadius: '0 8px 8px 0',
        },
        question: {
            fontSize: '16px',
            fontWeight: '600',
            color: isDarkMode ? '#e2e8f0' : '#1e293b',
            marginBottom: '12px',
        },
        answer: {
            fontSize: '14px',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            lineHeight: '1.6',
            whiteSpace: 'pre-line',
        },
        // Floating chatbot styles
        floatingChatbot: (isOpen, isMinimized) => ({
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: isOpen ? (isMinimized ? '360px' : '420px') : '60px',
            height: isOpen ? (isMinimized ? '60px' : '600px') : '60px',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
        }),
        chatbotCard: {
            background: isDarkMode ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(71, 85, 105, 0.8)' : '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            transform: showChatbot ? 'scale(1)' : 'scale(0.8)',
            opacity: showChatbot ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        chatbotHeader: {
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
        },
        chatbotTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '16px',
            fontWeight: '600',
        },
        headerButtons: {
            display: 'flex',
            gap: '8px',
        },
        headerButton: {
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
        },
        copilotContainer: {
            flex: 1,
            overflow: 'hidden',
            background: isDarkMode ? '#1e293b' : '#ffffff',
            display: isMinimized ? 'none' : 'block',
        },
        toggleButton: {
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            cursor: 'pointer',
            color: 'white',
            display: showChatbot ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.3s ease',
            animation: 'pulse 2s infinite',
        }
    };

    // Add CSS animations
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% {
                    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
                }
                50% {
                    box-shadow: 0 4px 30px rgba(59, 130, 246, 0.6);
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.title}>
                    <BookOpen size={32} color="#3b82f6" />
                    MaxCap Help Center
                </div>
                <div style={styles.subtitle}>
                    Get help with MaxCap features, AI tools, and common tasks
                </div>

                <div 
                    style={styles.aiNote}
                    onClick={() => setShowChatbot(true)}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'}
                >
                    <Bot size={20} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
                    <span style={styles.aiNoteText}>
                        💬 Click here or the bottom-right button to chat with the AI Assistant
                    </span>
                </div>

                <a
                    href="/MaxCap_User_Guide.docx"
                    download="MaxCap_User_Guide.docx"
                    style={styles.downloadButton}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDarkMode
                            ? 'rgba(59, 130, 246, 0.22)'
                            : 'rgba(59, 130, 246, 0.13)';
                        e.currentTarget.style.borderColor = isDarkMode
                            ? 'rgba(59, 130, 246, 0.7)'
                            : 'rgba(59, 130, 246, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDarkMode
                            ? 'rgba(59, 130, 246, 0.12)'
                            : 'rgba(59, 130, 246, 0.06)';
                        e.currentTarget.style.borderColor = isDarkMode
                            ? 'rgba(59, 130, 246, 0.4)'
                            : 'rgba(59, 130, 246, 0.3)';
                    }}
                >
                    <Download size={16} />
                    Download User Guide (.docx)
                </a>

                <div style={styles.searchContainer}>
                    <Search size={20} style={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search help topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            <div style={styles.contentGrid}>
                {filteredSections.map((section) => (
                    <div key={section.id} style={styles.section}>
                        <div
                            style={styles.sectionHeader(expandedSections[section.id])}
                            onClick={() => toggleSection(section.id)}
                        >
                            <div style={styles.sectionTitle}>
                                {section.icon}
                                {section.title}
                            </div>
                            {expandedSections[section.id] ? (
                                <ChevronUp size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                            ) : (
                                <ChevronDown size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                            )}
                        </div>

                        {expandedSections[section.id] && (
                            <div>
                                {section.content.map((item, index) => (
                                    <div key={index} style={styles.questionBlock}>
                                        <div style={styles.question}>{item.question}</div>
                                        <div style={styles.answer}>{item.answer}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Floating Chatbot */}
            <div style={styles.floatingChatbot(showChatbot, isMinimized)}>
                {showChatbot ? (
                    <div style={styles.chatbotCard}>
                        <div style={styles.chatbotHeader}>
                            <div style={styles.chatbotTitle}>
                                <Bot size={20} />
                                MaxCap AI Assistant
                            </div>
                            <div style={styles.headerButtons}>
                                <button
                                    style={styles.headerButton}
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                                    title={isMinimized ? "Expand" : "Minimize"}
                                >
                                    {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                                </button>
                                <button
                                    style={styles.headerButton}
                                    onClick={() => {
                                        setShowChatbot(false);
                                        setIsMinimized(false);
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div style={styles.copilotContainer}>
                            <iframe
                                src="https://copilotstudio.microsoft.com/environments/Default-7dae6b7e-a024-4264-bf0b-f8cc2bc79204/bots/copilots_header_f263f/webchat?__version__=2"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    background: isDarkMode ? '#1e293b' : '#ffffff'
                                }}
                                title="MaxCap AI Assistant"
                                allow="microphone"
                            />
                        </div>
                    </div>
                ) : (
                    <button
                        style={styles.toggleButton}
                        onClick={() => setShowChatbot(true)}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.1)';
                            e.target.style.boxShadow = '0 6px 30px rgba(59, 130, 246, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.4)';
                        }}
                    >
                        <Bot size={28} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdminHelp;