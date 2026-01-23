import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Search, ChevronRight, MessageCircle, X, BookOpen, Zap, BarChart, HelpCircle, Users as UsersIcon, Clock, Settings } from 'lucide-react';
import { apiFetch } from '../utils/api';
import ReactWebChat, { createDirectLine } from 'botframework-webchat';

const Help = () => {
  const [userData, setUserData] = useState(null);
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('quick-start');
  const [showCopilot, setShowCopilot] = useState(false);
  const [directLine, setDirectLine] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

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
    if (showCopilot) {
      // Initialize DirectLine connection
      const dl = createDirectLine({
        domain: 'https://default7dae6b7ea0244264bf0bf8cc2bc792.04.environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/copilots_header_f263f',
        // No token needed with anonymous auth
      });
      setDirectLine(dl);
    } else {
      // Clean up connection when modal closes
      setDirectLine(null);
    }
  }, [showCopilot]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setShowProfileTooltip(false);
  };

  const helpSections = [
    {
      id: 'quick-start',
      title: '🚀 Quick Start Guide',
      icon: <Zap size={20} />,
      content: (
        <div>
          <h2>New to MaxCap? Start Here!</h2>
          
          <div style={styles.stepCard(isDarkMode)}>
            <h3>Step 1: Set Up Your Profile</h3>
            <ul>
              <li>Click your avatar in the top-right corner</li>
              <li>Complete your personal information</li>
              <li>Connect ManicTime (ask your admin for help)</li>
            </ul>
          </div>

          <div style={styles.stepCard(isDarkMode)}>
            <h3>Step 2: Create Your First Individual Plan</h3>
            <ul>
              <li>Go to Plan → Individual Plan</li>
              <li>Click + Create New Plan</li>
              <li>Choose project type (Master Plan Linked, Operations, or Custom)</li>
              <li>Add milestones or use AI recommendations ✨</li>
            </ul>
          </div>

          <div style={styles.stepCard(isDarkMode)}>
            <h3>Step 3: Start Tracking Time</h3>
            <ul>
              <li>Go to Actuals → Actuals</li>
              <li>Select category: Projects, Meetings, or Admin/Others</li>
              <li>Enter date range and hours</li>
              <li>Save your entry</li>
            </ul>
          </div>

          <div style={styles.stepCard(isDarkMode)}>
            <h3>Step 4: Plan Your Week</h3>
            <ul>
              <li>Go to Plan → Weekly Allocation</li>
              <li>Select upcoming week</li>
              <li>Use AI recommendations for balanced allocation ✨</li>
              <li>Save your weekly plan</li>
            </ul>
          </div>

          <div style={styles.stepCard(isDarkMode)}>
            <h3>Step 5: Review Your Performance</h3>
            <ul>
              <li>Go to Reports</li>
              <li>Select date range</li>
              <li>Analyze your capacity utilization</li>
              <li>Identify trends and patterns</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'navigation',
      title: '📍 Page Navigation',
      icon: <BookOpen size={20} />,
      content: (
        <div>
          <h2>Understanding Each Page</h2>

          <div style={styles.pageCard(isDarkMode)}>
            <h3>Dashboard</h3>
            <p><strong>What you'll find:</strong> Overview of your work, quick stats, recent activity</p>
            <p><strong>Key Features:</strong></p>
            <ul>
              <li>📊 Total projects, hours logged, team size, completion rate</li>
              <li>📅 Mini calendar for date reference</li>
              <li>📝 Recent activity feed</li>
              <li>⚡ Quick action buttons</li>
            </ul>
            <p><strong>When to use:</strong> Start of each day to see your work overview</p>
          </div>

          <div style={styles.pageCard(isDarkMode)}>
            <h3>Actuals</h3>
            <p><strong>What you'll find:</strong> Time tracking with manual entry and ManicTime integration</p>
            <p><strong>Three Sections:</strong></p>
            <ol>
              <li><strong>Actuals</strong> - Manual time entry</li>
              <li><strong>ManicTime</strong> - View tracked activities</li>
              <li><strong>Match Projects</strong> - AI-powered matching</li>
            </ol>
            <div style={styles.proTip(isDarkMode)}>
              💡 <strong>Pro Tip:</strong> Use AI matching weekly to automate actuals entry!
            </div>
          </div>

          <div style={styles.pageCard(isDarkMode)}>
            <h3>Plan</h3>
            <p><strong>What you'll find:</strong> All your planning tools in one place</p>
            <p><strong>Three Sections:</strong></p>
            <ol>
              <li><strong>Master Plan</strong> - Organization-level projects</li>
              <li><strong>Individual Plan</strong> - Your personal assignments</li>
              <li><strong>Weekly Allocation</strong> - Short-term planning</li>
            </ol>
            <div style={styles.proTip(isDarkMode)}>
              💡 <strong>Pro Tip:</strong> Use Individual Plans for long-term, Weekly Allocation for short-term!
            </div>
          </div>

          <div style={styles.pageCard(isDarkMode)}>
            <h3>Reports</h3>
            <p><strong>What you'll find:</strong> Analytics and performance metrics</p>
            <p><strong>What You Can See:</strong></p>
            <ul>
              <li>📈 Planning accuracy percentage</li>
              <li>⏱️ Total hours (planned vs. actual)</li>
              <li>📊 Capacity utilization trends</li>
              <li>🎯 Project performance breakdown</li>
              <li>📅 Monthly trend charts</li>
            </ul>
          </div>

          <div style={styles.pageCard(isDarkMode)}>
            <h3>Users (Admin Only)</h3>
            <p><strong>What you'll find:</strong> Team management tools</p>
            <p><strong>Admin Can:</strong></p>
            <ul>
              <li>Add new users</li>
              <li>Edit user details</li>
              <li>Assign roles (Admin/Member)</li>
              <li>Configure ManicTime integration</li>
              <li>Manage permissions</li>
            </ul>
            <p style={{ color: '#f59e0b', fontStyle: 'italic' }}>
              Not an admin? This page won't appear in your navigation.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'ai-features',
      title: '✨ AI-Powered Features',
      icon: <Zap size={20} />,
      content: (
        <div>
          <h2>Making the Most of AI</h2>

          <div style={styles.featureCard(isDarkMode)}>
            <h3>1. AI Project Matching (Actuals)</h3>
            <p><strong>What it does:</strong> Automatically matches your ManicTime activities to projects</p>
            <p><strong>How to use:</strong></p>
            <ol>
              <li>Go to Actuals → Match Projects</li>
              <li>Select projects you worked on</li>
              <li>Choose date range</li>
              <li>Click "Match with AI" ✨</li>
              <li>Review matches (confidence: High/Medium/Low)</li>
              <li>Accept and save</li>
            </ol>
            <p><strong>How it works:</strong></p>
            <ul>
              <li>Level 2 (Best): Uses configured AI Context (websites, apps, file patterns)</li>
              <li>Level 1 (Basic): Uses project name matching</li>
            </ul>
            <div style={styles.exampleBox(isDarkMode)}>
              <strong>Example:</strong><br/>
              Activity: "MaxCap - Chrome"<br/>
              Match: MaxCap Development<br/>
              Confidence: High<br/>
              Reason: Matched [website]: MaxCap<br/>
              Hours: 8.5
            </div>
          </div>

          <div style={styles.featureCard(isDarkMode)}>
            <h3>2. AI Milestone Recommendations (Individual Plan)</h3>
            <p><strong>What it does:</strong> Suggests realistic milestones based on your work patterns</p>
            <p><strong>How to use:</strong></p>
            <ol>
              <li>Create/Edit Individual Plan</li>
              <li>Click "Get AI Recommendations" ✨</li>
              <li>Optionally add your goals/requirements</li>
              <li>Review suggested milestones</li>
              <li>Accept, modify, or regenerate</li>
            </ol>
            <p><strong>What AI considers:</strong></p>
            <ul>
              <li>Your average hours per week (past 6 months)</li>
              <li>Project distribution patterns</li>
              <li>Master plan context (if linked)</li>
              <li>Timeline duration</li>
            </ul>
          </div>

          <div style={styles.featureCard(isDarkMode)}>
            <h3>3. AI Weekly Allocation (Weekly Planning)</h3>
            <p><strong>What it does:</strong> Balances your time across all active projects</p>
            <p><strong>How to use:</strong></p>
            <ol>
              <li>Go to Plan → Weekly Allocation</li>
              <li>Select your week</li>
              <li>Click "Get AI Recommendations" ✨</li>
              <li>Optionally add your weekly goals</li>
              <li>Review suggested allocation</li>
              <li>Accept, modify, or regenerate</li>
            </ol>
            <p><strong>What AI considers:</strong></p>
            <ul>
              <li>Your active projects</li>
              <li>Master plan milestones due this week</li>
              <li>Historical work patterns</li>
              <li>Available capacity (42.5 hours default)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'metrics',
      title: '🎯 Key Metrics',
      icon: <BarChart size={20} />,
      content: (
        <div>
          <h2>Understanding Your Numbers</h2>

          <div style={styles.metricCard(isDarkMode)}>
            <h3>Planning Accuracy</h3>
            <p><strong>What it means:</strong> How well your plans match reality</p>
            <p><strong>Formula:</strong> (Actual Hours ÷ Planned Hours) × 100%</p>
            <p><strong>Targets:</strong></p>
            <ul>
              <li style={{ color: '#10b981' }}>✅ 95-105%: Excellent - Very accurate planning</li>
              <li style={{ color: '#10b981' }}>🟢 90-110%: Good - Acceptable variance</li>
              <li style={{ color: '#f59e0b' }}>🟡 85-115%: Fair - Room for improvement</li>
              <li style={{ color: '#ef4444' }}>🔴 &lt;85% or &gt;115%: Poor - Review planning process</li>
            </ul>
            <div style={styles.exampleBox(isDarkMode)}>
              <strong>Example:</strong> Planned 100h, Actual 95h = 95% accuracy ✅
            </div>
          </div>

          <div style={styles.metricCard(isDarkMode)}>
            <h3>Capacity Utilization</h3>
            <p><strong>What it means:</strong> Percentage of your available time being used</p>
            <p><strong>Formula:</strong> (Total Hours Logged ÷ Available Capacity) × 100%</p>
            <p><strong>Color Coding:</strong></p>
            <ul>
              <li style={{ color: '#10b981' }}>🟢 0-85%: Healthy - Room for more work</li>
              <li style={{ color: '#f59e0b' }}>🟡 85-100%: At capacity - Fully utilized</li>
              <li style={{ color: '#ef4444' }}>🔴 &gt;100%: Over-allocated - Risk of burnout</li>
            </ul>
            <p><strong>Default Capacity:</strong> 42.5 hours/week (8.5 hours/day × 5 days)</p>
          </div>

          <div style={styles.metricCard(isDarkMode)}>
            <h3>Efficiency</h3>
            <p><strong>What it means:</strong> How much time projects consume vs. planned</p>
            <p><strong>Formula:</strong> (Spent Hours ÷ Planned Hours) × 100%</p>
            <p><strong>Per Project:</strong></p>
            <ul>
              <li style={{ color: '#10b981' }}>🟢 90-110%: On track</li>
              <li style={{ color: '#f59e0b' }}>🟡 80-90% or 110-120%: Watch zone</li>
              <li style={{ color: '#ef4444' }}>🔴 &lt;80% or &gt;120%: Needs attention</li>
            </ul>
          </div>

          <div style={styles.metricCard(isDarkMode)}>
            <h3>Man-Days</h3>
            <p><strong>What it means:</strong> Time expressed in standard "days" of work</p>
            <p><strong>Formula:</strong> Hours ÷ 8</p>
            <p><strong>Examples:</strong></p>
            <ul>
              <li>8 hours = 1.0 man-day</li>
              <li>40 hours = 5.0 man-days (1 week)</li>
              <li>7.5 hours = 0.94 man-days</li>
            </ul>
            <p><strong>Use case:</strong> Easier comparison and budgeting</p>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: '❓ FAQ',
      icon: <HelpCircle size={20} />,
      content: (
        <div>
          <h2>Frequently Asked Questions</h2>

          <details style={styles.faqItem(isDarkMode)}>
            <summary>What is MaxCap?</summary>
            <p>MaxCap is IHRP's project management and capacity utilization system. It helps you plan projects, track time, and analyze your work performance.</p>
          </details>

          <details style={styles.faqItem(isDarkMode)}>
            <summary>Who can use MaxCap?</summary>
            <p>All IHRP team members. Access level depends on role:</p>
            <ul>
              <li><strong>Admin:</strong> Full access + user management</li>
              <li><strong>Member:</strong> Standard features (no user management)</li>
            </ul>
          </details>

          <details style={styles.faqItem(isDarkMode)}>
            <summary>Why can't I see ManicTime activities?</summary>
            <p>Check:</p>
            <ol>
              <li>ManicTime connection status (Profile page)</li>
              <li>Date range includes actual work days</li>
              <li>Admin has configured your device</li>
              <li>ManicTime app is running on your computer</li>
              <li>Activities aren't in excluded list (Session lock, Power off)</li>
            </ol>
            <p>Contact admin if still having issues.</p>
          </details>

          <details style={styles.faqItem(isDarkMode)}>
            <summary>What's the difference between Master Plan and Individual Plan?</summary>
            <p><strong>Master Plan:</strong> Organization-level project, team-visible, strategic</p>
            <p><strong>Individual Plan:</strong> Your personal assignment, linked or standalone</p>
            <p><em>Think: Master = "What the team is doing", Individual = "What I'm doing"</em></p>
          </details>

          <details style={styles.faqItem(isDarkMode)}>
            <summary>How often should I update my plans?</summary>
            <ul>
              <li><strong>Master Plans:</strong> Monthly review, update as project evolves</li>
              <li><strong>Individual Plans:</strong> Bi-weekly or when milestones change</li>
              <li><strong>Weekly Allocation:</strong> Every Monday for the week ahead</li>
            </ul>
          </details>

          <details style={styles.faqItem(isDarkMode)}>
            <summary>Should I log time in ManicTime or MaxCap?</summary>
            <p><strong>Both!</strong></p>
            <p><strong>ManicTime:</strong> Automatic tracking, runs in background</p>
            <p><strong>MaxCap:</strong> Official logging via manual entry OR import from ManicTime via AI matching</p>
            <p><em>Best workflow: Let ManicTime track automatically, then use AI matching weekly to create MaxCap actuals!</em></p>
          </details>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: '🎓 Best Practices',
      icon: <UsersIcon size={20} />,
      content: (
        <div>
          <h2>Tips for Success</h2>

          <div style={styles.practiceSection(isDarkMode)}>
            <h3>Time Tracking Best Practices</h3>
            <div style={styles.dosDonts(isDarkMode)}>
              <div>
                <h4 style={{ color: '#10b981' }}>✅ Do:</h4>
                <ul>
                  <li>Log time weekly (Friday afternoon is ideal)</li>
                  <li>Use ManicTime AI matching to save time</li>
                  <li>Add notes for clarity (meeting topics, deliverables)</li>
                  <li>Review your weekly hours before submitting</li>
                  <li>Categorize correctly (Projects vs. Meetings vs. Admin)</li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: '#ef4444' }}>❌ Don't:</h4>
                <ul>
                  <li>Wait until month-end (you'll forget details)</li>
                  <li>Round everything to 8 hours (not realistic)</li>
                  <li>Skip logging meetings (they count!)</li>
                  <li>Log leave as "Projects" (use Admin/Others)</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={styles.practiceSection(isDarkMode)}>
            <h3>Planning Best Practices</h3>
            <div style={styles.dosDonts(isDarkMode)}>
              <div>
                <h4 style={{ color: '#10b981' }}>✅ Do:</h4>
                <ul>
                  <li>Create Individual Plans for all major work</li>
                  <li>Use AI recommendations as starting point</li>
                  <li>Plan milestones consecutively (no gaps)</li>
                  <li>Review and adjust plans monthly</li>
                  <li>Align individual plans with master plans</li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: '#ef4444' }}>❌ Don't:</h4>
                <ul>
                  <li>Over-commit (leave buffer for unknowns)</li>
                  <li>Create plans without checking capacity</li>
                  <li>Ignore AI warnings (e.g., over-allocated)</li>
                  <li>Set unrealistic deadlines</li>
                  <li>Plan in isolation (consult your manager)</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={styles.practiceSection(isDarkMode)}>
            <h3>Weekly Allocation Best Practices</h3>
            <div style={styles.dosDonts(isDarkMode)}>
              <div>
                <h4 style={{ color: '#10b981' }}>✅ Do:</h4>
                <ul>
                  <li>Plan every Monday morning</li>
                  <li>Use AI for balanced distribution</li>
                  <li>Leave 2-3 hours buffer for meetings/admin</li>
                  <li>Align with master plan priorities</li>
                  <li>Be realistic about interruptions</li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: '#ef4444' }}>❌ Don't:</h4>
                <ul>
                  <li>Plan at 100% capacity (always over-runs)</li>
                  <li>Ignore conflicting meetings (check calendar)</li>
                  <li>Allocate to inactive projects</li>
                  <li>Skip review of AI suggestions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: '📞 Getting Help',
      icon: <MessageCircle size={20} />,
      content: (
        <div>
          <h2>Need More Assistance?</h2>

          <div style={styles.contactCard(isDarkMode)}>
            <h3>💬 Ask MaxCap Copilot</h3>
            <p>Get instant answers to your questions using our AI assistant.</p>
            <button
              style={styles.copilotButton(isDarkMode, false)}
              onClick={() => setShowCopilot(true)}
            >
              <MessageCircle size={16} />
              Open Copilot Chat
            </button>
          </div>

          <div style={styles.contactCard(isDarkMode)}>
            <h3>👤 Contact Admin</h3>
            <p>For account issues, ManicTime setup, permission requests, or technical problems.</p>
            <p style={{ fontSize: '14px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Email: admin@ihrp.sg
            </p>
          </div>

          <div style={styles.contactCard(isDarkMode)}>
            <h3>📚 Training Resources</h3>
            <ul>
              <li>Video tutorials (coming soon)</li>
              <li>Team workshops</li>
              <li>User guide (this document)</li>
            </ul>
          </div>

          <div style={styles.contactCard(isDarkMode)}>
            <h3>💡 Feedback</h3>
            <p>We'd love to hear from you!</p>
            <ul>
              <li>Report bugs via email</li>
              <li>Suggest features in team meetings</li>
              <li>Share your success stories</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = searchQuery.trim()
    ? helpSections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : helpSections;

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
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
      padding: '30px 30px 0',
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
    container: {
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: '30px',
      padding: '0 30px 30px',
      maxWidth: '1600px',
      margin: '0 auto'
    },
    sidebar: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(255,255,255,0.9)',
      borderRadius: '20px',
      padding: '24px',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      height: 'fit-content',
      position: 'sticky',
      top: '30px'
    },
    searchBox: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.9)',
      color: isDarkMode ? '#e2e8f0' : '#1e293b',
      fontSize: '14px',
      outline: 'none',
      marginBottom: '20px'
    },
    navList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    navItem: (isActive, isHovered) => ({
      padding: '12px 16px',
      borderRadius: '12px',
      marginBottom: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: isActive
        ? 'rgba(59,130,246,0.15)'
        : isHovered
        ? (isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)')
        : 'transparent',
      color: isActive
        ? '#3b82f6'
        : (isDarkMode ? '#e2e8f0' : '#1e293b'),
      fontWeight: isActive ? '600' : '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent'
    }),
    mainContent: {
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(255,255,255,0.9)',
      borderRadius: '20px',
      padding: '40px',
      backdropFilter: 'blur(10px)',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      minHeight: '600px'
    },
    section: {
      marginBottom: '60px'
    },
    sectionTitle: {
      fontSize: '32px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: isDarkMode ? '2px solid rgba(75,85,99,0.5)' : '2px solid rgba(226,232,240,0.8)'
    },
    stepCard: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)'
    }),
    pageCard: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)'
    }),
    proTip: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
      borderLeft: '4px solid #3b82f6',
      borderRadius: '8px',
      padding: '12px 16px',
      marginTop: '16px',
      fontSize: '14px',
      color: isDarkMode ? '#93c5fd' : '#3b82f6'
    }),
    featureCard: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)'
    }),
    exampleBox: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.3)',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
      fontFamily: 'monospace',
      fontSize: '13px',
      color: isDarkMode ? '#cbd5e1' : '#475569'
    }),
    metricCard: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)'
    }),
    faqItem: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '12px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      cursor: 'pointer'
    }),
    practiceSection: (isDarkMode) => ({
      marginBottom: '32px'
    }),
    dosDonts: (isDarkMode) => ({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginTop: '16px'
    }),
    contactCard: (isDarkMode) => ({
      backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px',
      border: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)'
    }),
    copilotButton: (isDarkMode, isHovered) => ({
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: isHovered ? '#2563eb' : '#3b82f6',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      marginTop: '12px'
    }),
    copilotModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    },
    copilotContainer: {
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: '20px',
      width: '90%',
      maxWidth: '800px',
      height: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      border: isDarkMode ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226,232,240,0.8)'
    },
    copilotHeader: {
      padding: '20px 24px',
      borderBottom: isDarkMode ? '1px solid rgba(75,85,99,0.5)' : '1px solid rgba(226,232,240,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    copilotTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    closeButton: {
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      color: isDarkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    copilotBody: {
      flex: 1,
      overflow: 'hidden'
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.headerRow}>
        <h1 style={styles.header}>Help Center</h1>
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
                <button style={styles.themeToggle} onClick={toggleTheme}>
                  {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={styles.container}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Search size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchBox}
            />
          </div>

          <ul style={styles.navList}>
            {filteredSections.map((section) => (
              <li
                key={section.id}
                style={styles.navItem(
                  activeSection === section.id,
                  hoveredCard === section.id
                )}
                onMouseEnter={() => setHoveredCard(section.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => scrollToSection(section.id)}
              >
                {section.icon}
                <span>{section.title}</span>
                <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content */}
        <main style={styles.mainContent}>
          {filteredSections.map((section) => (
            <div key={section.id} id={section.id} style={styles.section}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              {section.content}
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              <Search size={48} style={{ marginBottom: '16px' }} />
              <p>No help topics found matching "{searchQuery}"</p>
            </div>
          )}
        </main>
      </div>

      {/* Copilot Modal */}
      {showCopilot && (
        <div style={styles.copilotModal} onClick={() => setShowCopilot(false)}>
          <div style={styles.copilotContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.copilotHeader}>
              <div style={styles.copilotTitle}>
                <MessageCircle size={24} color="#3b82f6" />
                MaxCap Copilot
              </div>
              <button
                style={styles.closeButton}
                onClick={() => setShowCopilot(false)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>
            <div style={styles.copilotBody}>
              {directLine && (
                <ReactWebChat
                  directLine={directLine}
                  userID={userData?.email || 'anonymous'}
                  username={userData ? `${userData.firstName} ${userData.lastName}` : 'User'}
                  styleOptions={{
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    bubbleBackground: isDarkMode ? '#374151' : '#f3f4f6',
                    bubbleFromUserBackground: '#3b82f6',
                    bubbleFromUserTextColor: '#ffffff',
                    bubbleTextColor: isDarkMode ? '#e5e7eb' : '#1f2937',
                    sendBoxBackground: isDarkMode ? '#374151' : '#ffffff',
                    sendBoxTextColor: isDarkMode ? '#e5e7eb' : '#1f2937',
                    botAvatarBackgroundColor: '#3b82f6',
                    botAvatarInitials: 'MC',
                    userAvatarBackgroundColor: '#10b981',
                    userAvatarInitials: userData 
                      ? `${userData.firstName?.[0]}${userData.lastName?.[0]}` 
                      : 'U',
                    hideUploadButton: true,
                    sendBoxHeight: 50,
                    bubbleBorderRadius: 12,
                    bubbleFromUserBorderRadius: 12,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Help;