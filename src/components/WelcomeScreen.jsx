import React, { useState } from 'react';
import { Heart, Key, Compass } from 'lucide-react';

const CUTE_ADJECTIVES = [
  'cozy', 'sweet', 'warm', 'honey', 'sugar', 'cuddle', 'starry', 
  'milky', 'cloudy', 'lovely', 'magic', 'dreamy', 'fluffy', 'sparkly'
];

const CUTE_NOUNS = [
  'nest', 'haven', 'garden', 'den', 'sky', 'island', 'valley', 
  'bubble', 'castle', 'meadow', 'room', 'space', 'cabin', 'cottage'
];

function generateCuteRoomCode() {
  const adj = CUTE_ADJECTIVES[Math.floor(Math.random() * CUTE_ADJECTIVES.length)];
  const noun = CUTE_NOUNS[Math.floor(Math.random() * CUTE_NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${adj}-${noun}-${num}`;
}

export default function WelcomeScreen({ onRoomSelect, defaultRoomCode }) {
  const [roomCodeInput, setRoomCodeInput] = useState(defaultRoomCode || '');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    const code = generateCuteRoomCode();
    onRoomSelect(code);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim().toLowerCase();
    if (!cleanCode) {
      setError('Please enter a space code first 💙');
      return;
    }
    onRoomSelect(cleanCode);
  };

  return (
    <div style={styles.container}>
      {/* Background Floating Sparkle Hearts */}
      <div className="sparkles">
        <Heart className="sparkle-heart" style={{ top: '15%', left: '10%', width: 28, height: 28, animationDelay: '0s' }} />
        <Heart className="sparkle-heart" style={{ top: '25%', right: '15%', width: 20, height: 20, animationDelay: '2s' }} />
        <Heart className="sparkle-heart" style={{ bottom: '20%', left: '20%', width: 22, height: 22, animationDelay: '4s' }} />
        <Heart className="sparkle-heart" style={{ bottom: '30%', right: '25%', width: 26, height: 26, animationDelay: '1s' }} />
      </div>

      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <Heart size={48} color="var(--color-primary)" fill="var(--color-primary)" style={styles.logoIcon} />
          </div>
          <h1 style={styles.title}>Just2OfUs</h1>
          <p style={styles.subtitle}>Your private, cozy space to meet and chat 💙</p>
        </div>

        <div style={styles.actions}>
          <button 
            className="cute-btn cute-btn-primary" 
            style={styles.actionBtn}
            onClick={handleCreateRoom}
          >
            <Compass size={20} />
            Start a Cozy Space
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerLine}></span>
            <span style={styles.dividerText}>or join existing</span>
            <span style={styles.dividerLine}></span>
          </div>

          <form onSubmit={handleJoinRoom} style={styles.form}>
            <div style={styles.inputWrapper}>
              <Key size={18} style={styles.inputIcon} />
              <input 
                type="text" 
                placeholder="Enter Space Code (e.g. cozy-nest-42)"
                value={roomCodeInput}
                onChange={(e) => {
                  setRoomCodeInput(e.target.value);
                  setError('');
                }}
                className="cute-input"
                style={styles.input}
              />
            </div>
            {error && <div style={styles.errorText}>{error}</div>}
            <button 
              type="submit" 
              className="cute-btn cute-btn-secondary" 
              style={styles.submitBtn}
            >
              Enter Space
            </button>
          </form>
        </div>
      </div>
      
      <div style={styles.footer}>
        Made with 💙 for Yudarthvader
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '2rem',
    position: 'relative',
    zIndex: 2,
    minHeight: '100vh',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '2.5rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    background: 'rgba(255, 117, 151, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
    border: '1px dashed rgba(255, 117, 151, 0.3)',
  },
  logoIcon: {
    filter: 'drop-shadow(0 4px 10px rgba(255, 117, 151, 0.3))',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    background: 'linear-gradient(to right, var(--color-primary-light), var(--color-secondary-light))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  actionBtn: {
    width: '100%',
    padding: '1.1rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    color: 'var(--color-text-muted)',
    fontSize: '0.85rem',
    margin: '0.25rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '1.25rem',
    color: 'var(--color-primary-light)',
    opacity: 0.7,
  },
  input: {
    paddingLeft: '3.25rem',
  },
  submitBtn: {
    width: '100%',
    padding: '1rem',
    border: '1px solid rgba(255, 117, 151, 0.2)',
  },
  errorText: {
    color: 'var(--color-danger)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textAlign: 'left',
    paddingLeft: '0.5rem',
  },
  footer: {
    marginTop: '2rem',
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    opacity: 0.6,
  }
};
