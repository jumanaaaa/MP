import { createContext, useState, useContext, useEffect } from 'react';

const SidebarContext = createContext();

// Helper function to get initial state from localStorage
const getInitialCollapsedState = () => {
  try {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error reading initial sidebar state from localStorage:', error);
  }
  return false; // Default to expanded
};

export const SidebarProvider = ({ children }) => {
  // Initialize directly from localStorage
  const [collapsed, setCollapsed] = useState(getInitialCollapsedState);

  // Save to localStorage whenever collapsed changes
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
      
      // Verify the save worked
      const verification = localStorage.getItem('sidebarCollapsed');
      if (verification !== JSON.stringify(collapsed)) {
        // Retry once if save failed
        localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
      }
    } catch (error) {
      console.error('Error saving sidebar state to localStorage:', error);
    }
  }, [collapsed]);

  const toggleSidebar = () => {
    setCollapsed(prev => !prev);
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};