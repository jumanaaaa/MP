// LayoutWithSidebar.jsx
import { useSidebar } from '../context/sidebarcontext';
import Sidebar from './sidebar';
import { useEffect, useState } from 'react';

const LayoutWithSidebar = ({ children }) => {
  const { collapsed } = useSidebar();
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Get initial sidebar state from localStorage
  const [currentMargin, setCurrentMargin] = useState(() => {
    try {
      const savedCollapsed = localStorage.getItem('sidebarCollapsed');
      const isCollapsed = savedCollapsed === 'true';
      return isCollapsed ? '80px' : '220px';
    } catch {
      return '220px';
    }
  });

  useEffect(() => {
    setCurrentMargin(collapsed ? '80px' : '220px');
    setInitialLoad(false);
  }, [collapsed]);

  return (
    <div style={{ 
      display: 'flex', 
      margin: 0, 
      padding: 0,
      minHeight: '100vh'
    }}>
      <Sidebar />
      <div
        style={{
          marginLeft: currentMargin,
          transition: initialLoad ? 'none' : 'margin-left 0.3s ease',
          flex: 1,
          padding: '0',
          boxSizing: 'border-box',
          minHeight: '100vh'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default LayoutWithSidebar;