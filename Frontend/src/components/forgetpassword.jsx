import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ForgetPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Reset requested for:', email);
    // Backend hookup will go here later
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(to right, #0079D3, #00A1F1)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: '"Segoe UI", sans-serif',
      padding: '20px'
    },
    formBox: {
      backgroundColor: '#fff',
      padding: '40px',
      borderRadius: '10px',
      width: '100%',
      maxWidth: '400px',
      position: 'relative',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
    },
    backButton: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      background: 'none',
      border: 'none',
      color: '#0079D3',
      cursor: 'pointer'
    },
    header: {
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '30px',
      marginTop: '10px',
      color: '#1f2937'
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: '6px',
      border: '1px solid #ccc',
      fontSize: '15px',
      marginBottom: '24px',
      outline: 'none'
    },
    button: {
      width: '100%',
      backgroundColor: '#0079D3',
      color: 'white',
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formBox}>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          <ArrowLeft size={20} />
        </button>

        <h2 style={styles.header}>Reset Password</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email/Phone"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button}>NEXT</button>
        </form>
      </div>
    </div>
  );
};

export default ForgetPassword;
