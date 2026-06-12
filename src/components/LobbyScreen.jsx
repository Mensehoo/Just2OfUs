import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, User, ArrowRight, Heart } from 'lucide-react';

export default function LobbyScreen({ roomCode, onJoin, userName, setUserName }) {
  const [localStream, setLocalStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [errorText, setErrorText] = useState('');

  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize media devices
  useEffect(() => {
    let activeStream = null;

    async function setupDevices() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        activeStream = stream;
        setLocalStream(stream);
        setPermissionError(false);

        // Bind stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Set up Web Audio Analyser for mic volume indicator
        setupAudioAnalyser(stream);
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setPermissionError(true);
      }
    }

    setupDevices();

    // Clean up tracks on unmount
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Set up microphone level visualizer
  const setupAudioAnalyser = (stream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(new MediaStream([audioTracks[0]]));
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current || !audioContextRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        
        // Convert to percentage (0 - 100)
        const percent = Math.min(100, Math.floor((average / 128) * 100));
        setMicLevel(percent);

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("Failed to initialize audio analyzer for preview:", e);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = userName.trim();
    if (!cleanName) {
      setErrorText('Please write your name 💙');
      return;
    }
    
    // Stop local preview tracks so they can be re-initialized in the Call Room
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    onJoin({
      name: cleanName,
      micEnabled,
      cameraEnabled
    });
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.roomBadge}>
            <Heart size={14} color="var(--color-primary)" fill="var(--color-primary)" />
            <span>Space: {roomCode}</span>
          </div>
          <h2 style={styles.title}>Ready to join?</h2>
          <p style={styles.subtitle}>Check your camera and audio settings before stepping in.</p>
        </div>

        {/* Video Preview Card */}
        <div style={styles.previewContainer}>
          {permissionError ? (
            <div style={styles.errorOverlay}>
              <div style={styles.errorIcon}>⚠️</div>
              <h3 style={styles.errorTitle}>Permissions Required</h3>
              <p style={styles.errorDesc}>
                Just2OfUs needs camera and microphone access to connect you. Please enable them in your browser settings.
              </p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="video-element"
                style={{ ...styles.video, display: cameraEnabled ? 'block' : 'none' }}
              />
              {!cameraEnabled && (
                <div style={styles.avatarPlaceholder}>
                  <div className="cute-avatar">
                    {userName ? userName.slice(0, 2).toUpperCase() : '💙'}
                  </div>
                  <span style={styles.avatarText}>Camera is turned off</span>
                </div>
              )}
              
              {/* Floating controls in the preview */}
              <div style={styles.previewControls}>
                <button 
                  type="button" 
                  onClick={toggleMic}
                  className={`control-icon-btn ${micEnabled ? 'active' : 'off'}`}
                  title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button 
                  type="button" 
                  onClick={toggleCamera}
                  className={`control-icon-btn ${cameraEnabled ? 'active' : 'off'}`}
                  title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mic Level Indicator (only if mic is enabled and permissions granted) */}
        {!permissionError && micEnabled && (
          <div style={styles.volumeContainer}>
            <span style={styles.volumeLabel}>Mic Volume Level</span>
            <div className="mic-vol-bar-container">
              <div 
                className="mic-vol-bar-fill" 
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>
        )}

        {/* Name Input & Join Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputContainer}>
            <User size={18} style={styles.inputIcon} />
            <input 
              type="text" 
              placeholder="What should your boyfriend call you?"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                setErrorText('');
              }}
              className="cute-input"
              style={styles.input}
              maxLength={20}
            />
          </div>
          {errorText && <div style={styles.errorText}>{errorText}</div>}

          <button 
            type="submit" 
            className="cute-btn cute-btn-primary" 
            style={styles.joinBtn}
            disabled={permissionError}
          >
            Join Cozy Call
            <ArrowRight size={18} />
          </button>
        </form>
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
    zIndex: 2,
    minHeight: '100vh',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  roomBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(255, 117, 151, 0.1)',
    border: '1px solid rgba(255, 117, 151, 0.2)',
    padding: '0.3rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-primary-light)',
    marginBottom: '0.25rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    borderRadius: '20px',
    overflow: 'hidden',
    background: '#150c1c',
    border: '2px solid rgba(255, 117, 151, 0.1)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    background: 'radial-gradient(circle, #251733 0%, #11091a 100%)',
  },
  avatarText: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    fontWeight: 500,
  },
  previewControls: {
    position: 'absolute',
    bottom: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '1rem',
    zIndex: 10,
  },
  errorOverlay: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    background: 'rgba(35, 10, 10, 0.3)',
  },
  errorIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  errorTitle: {
    fontSize: '1.1rem',
    color: 'var(--color-danger)',
    marginBottom: '0.5rem',
  },
  errorDesc: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
  },
  volumeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  volumeLabel: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputContainer: {
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
  joinBtn: {
    width: '100%',
    padding: '1.1rem',
  },
  errorText: {
    color: 'var(--color-danger)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textAlign: 'left',
    paddingLeft: '0.5rem',
  }
};
