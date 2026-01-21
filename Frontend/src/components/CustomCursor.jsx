import React, { useEffect, useState } from 'react';

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === 'true';
    } catch (error) {
      return false;
    }
  });

  useEffect(() => {
    // Listen for dark mode changes
    const handleStorageChange = () => {
      try {
        const savedMode = localStorage.getItem('darkMode');
        setIsDarkMode(savedMode === 'true');
      } catch (error) {
        console.log('LocalStorage not available');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Poll for changes (in case storage event doesn't fire)
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const updatePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      const isClickable = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.style.cursor === 'pointer' ||
        window.getComputedStyle(target).cursor === 'pointer';
      
      setIsHovering(isClickable);
    };

    window.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  const styles = {
    customCursor: {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: 99999,
      transform: `translate(${position.x}px, ${position.y}px)`,
      transition: 'transform 0.05s ease-out',
      left: 0,
      top: 0
    },
    cursorSvg: {
      width: isHovering ? '44px' : '36px',
      height: isHovering ? '44px' : '36px',
      transform: `translate(-6px, -6px) scale(${isHovering ? 1.15 : 1})`,
      transition: 'all 0.2s ease',
      filter: `drop-shadow(0 2px 4px ${isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)'})`
    }
  };

  // Hide default cursor
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        cursor: none !important;
      }
      a, button, input, textarea, select, [role="button"] {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div style={styles.customCursor}>
      <svg 
        style={styles.cursorSvg}
        viewBox="0 0 24 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer stroke (outline) */}
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
          fill={isDarkMode ? '#000000' : '#FFFFFF'}
          stroke={isDarkMode ? '#FFFFFF' : '#000000'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Inner fill */}
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
            fill={isDarkMode ? '#000000' : '#FFFFFF'}
          stroke={isDarkMode ? '#FFFFFF' : '#000000'}
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;