import { useEffect } from "react";

const IntroLoader = ({ animationPhase }) => {
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes hourglassFlip {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(-90deg) scale(1.1); }
  100% { transform: rotate(-180deg) scale(1); }
}
      
      @keyframes particleFloat {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
        50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
      }
      
      @keyframes ripple {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(4); opacity: 0; }
      }

      FIND (in keyframes section):
javascript@keyframes shimmerText {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

@keyframes twinklePulse {
  0%, 100% {
    text-shadow: 0 4px 30px rgba(59, 130, 246, 0.6),
                 0 0 20px rgba(59, 130, 246, 0.4);
  }
  50% {
    text-shadow: 0 4px 40px rgba(59, 130, 246, 0.9),
                 0 0 40px rgba(59, 130, 246, 0.7),
                 0 0 60px rgba(59, 130, 246, 0.5);
  }
}

    `;
    document.head.appendChild(styleElement);
    return () => document.head.contains(styleElement) && document.head.removeChild(styleElement);
  }, []);

  const styles = {
    root: {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      zIndex: 9999,
      clipPath: animationPhase === "revealing" 
        ? 'circle(0% at 50% 50%)'
        : animationPhase === "done"
        ? 'circle(0% at 50% 50%)'
        : 'circle(150% at 50% 50%)',
      transition: 'clip-path 0.9s cubic-bezier(0.85, 0, 0.15, 1)',
      pointerEvents: animationPhase === "done" ? "none" : "all"
    },
    
    // Animated background blobs
    blob1: {
      position: 'absolute',
      width: '600px',
      height: '600px',
      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
      borderRadius: '50%',
      top: '-200px',
      left: '-200px',
      filter: 'blur(60px)',
      animation: 'particleFloat 4s ease-in-out infinite'
    },
    
    blob2: {
      position: 'absolute',
      width: '500px',
      height: '500px',
      background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
      borderRadius: '50%',
      bottom: '-150px',
      right: '-150px',
      filter: 'blur(60px)',
      animation: 'particleFloat 5s ease-in-out infinite',
      animationDelay: '1s'
    },
    
    // Ripple effects during reveal
    rippleContainer: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      opacity: animationPhase === "revealing" ? 1 : 0,
      transition: 'opacity 0.3s ease'
    },
    
    ripple: (delay) => ({
      position: 'absolute',
      width: '200px',
      height: '200px',
      border: '3px solid rgba(59, 130, 246, 0.5)',
      borderRadius: '50%',
      animation: 'ripple 1.5s ease-out',
      animationDelay: `${delay}s`
    }),

    logoContainer: {
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '30px',
      transform: animationPhase === "revealing" 
        ? 'scale(0.8)' 
        : 'scale(1)',
      opacity: animationPhase === "revealing" ? 0 : 1,
      transition: 'all 0.6s cubic-bezier(0.85, 0, 0.15, 1)'
    },
    
    hourglassWrapper: {
      position: 'relative',
      width: '120px',
      height: '120px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    
    hourglass: {
      height: '100px',
      width: 'auto',
      filter: 'drop-shadow(0 10px 40px rgba(59, 130, 246, 0.8))',
      animation: animationPhase === "flipping" ? 'hourglassFlip 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none',
      transform: animationPhase === "flipping" || animationPhase === "revealing" ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: animationPhase !== "flipping" ? 'transform 0.1s ease' : 'none'
    },

      text: {
          fontSize: '42px',
          fontWeight: 700,
          background: 'linear-gradient(90deg, #ffffff 0%, #60a5fa 25%, #93c5fd 50%, #60a5fa 75%, #ffffff 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '0px',
          textShadow: '0 4px 30px rgba(59, 130, 246, 0.6)',
          fontFamily: '"Montserrat", sans-serif',
          opacity: animationPhase === "initial" ? 0 : 1,
          transform: animationPhase === "initial" ? 'translateY(20px)' : 'translateY(0)',
          transition: 'all 0.6s ease-out 0.3s',
          animation: 'shimmerText 3s ease-in-out infinite, twinklePulse 2s ease-in-out infinite'
      },
    
    loadingBar: {
      width: '200px',
      height: '3px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginTop: '10px',
      opacity: animationPhase === "initial" ? 0 : 1,
      transition: 'opacity 0.4s ease-out 0.4s'
    },
    
    loadingBarFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)',
      borderRadius: '10px',
      width: animationPhase === "initial" ? '0%' : animationPhase === "flipping" ? '50%' : '100%',
      transition: 'width 0.8s cubic-bezier(0.65, 0, 0.35, 1)',
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)'
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      
      {/* Ripple effects during page reveal */}
      <div style={styles.rippleContainer}>
        <div style={styles.ripple(0)} />
        <div style={styles.ripple(0.15)} />
        <div style={styles.ripple(0.3)} />
      </div>

      <div style={styles.logoContainer}>
        <div style={styles.hourglassWrapper}>
          <img
            src="/images/maxcap.png"
            alt="MAXCAP"
            style={styles.hourglass}
          />
        </div>

        <div style={styles.text}>MAXCAP</div>
        
        <div style={styles.loadingBar}>
          <div style={styles.loadingBarFill} />
        </div>
      </div>
    </div>
  );
};

export default IntroLoader;