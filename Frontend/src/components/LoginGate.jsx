import { useState, useEffect } from "react";
import IntroLoader from "../components/IntroLoader";
import LoginForm from "../components/login";

const LoginGate = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [animationPhase, setAnimationPhase] = useState("initial"); // initial, flipping, revealing, done

  useEffect(() => {
    // Animation sequence
    setTimeout(() => setAnimationPhase("flipping"), 300);
    setTimeout(() => setAnimationPhase("revealing"), 1100);
    setTimeout(() => {
      setAnimationPhase("done");
      setShowIntro(false);
    }, 2000);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Login Form - Always rendered */}
      <LoginForm />
      
      {/* Intro Animation Overlay */}
      {showIntro && (
        <IntroLoader animationPhase={animationPhase} />
      )}
    </div>
  );
};

export default LoginGate;