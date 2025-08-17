// LayoutWithSidebar.jsx
import { useSidebar } from '../context/sidebarcontext';
import Sidebar from './sidebar';

const LayoutWithSidebar = ({ children }) => {
  const { collapsed } = useSidebar();

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div
        style={{
          marginLeft: collapsed ? '80px' : '220px',
          transition: 'margin-left 0.3s ease',
          width: '100%',
          padding: '20px',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default LayoutWithSidebar;