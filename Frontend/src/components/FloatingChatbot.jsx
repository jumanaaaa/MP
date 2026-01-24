import React, { useState, useEffect } from 'react';
import { Bot, X, Minimize2, Maximize2 } from 'lucide-react';

/**
 * Reusable Floating Chatbot Component
 * Integrates Microsoft Copilot Studio chatbot across all pages
 * 
 * Usage:
 * import FloatingChatbot from '../components/FloatingChatbot';
 * <FloatingChatbot isDarkMode={isDarkMode} />
 */

const FloatingChatbot = ({ 
    isDarkMode = false,
    position = { bottom: '24px', right: '24px' },
    iframeUrl = "https://copilotstudio.microsoft.com/environments/Default-7dae6b7e-a024-4264-bf0b-f8cc2bc79204/bots/copilots_header_f263f/webchat?__version__=2"
}) => {
    const [showChatbot, setShowChatbot] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const styles = {
        floatingChatbot: (isOpen, isMinimized) => ({
            position: 'fixed',
            bottom: position.bottom,
            right: position.right,
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
        return () => {
            try {
                document.head.removeChild(style);
            } catch (e) {
                // Style already removed
            }
        };
    }, []);

    return (
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
                            src={iframeUrl}
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
    );
};

export default FloatingChatbot;