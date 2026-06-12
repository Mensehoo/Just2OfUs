import React, { useEffect, useRef, useState } from 'react';
import { Peer } from 'peerjs';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, 
  PhoneOff, Send, MessageSquare, Copy, Check, Heart, User, Sparkles 
} from 'lucide-react';
import { playJoinSound, playLeaveSound, playHeartSound } from '../utils/audio';

export default function RoomScreen({ roomCode, joinDetails, onLeave }) {
  const { name: userName, micEnabled: initialMic, cameraEnabled: initialCamera } = joinDetails;

  // Connection & Stream States
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [dataConnection, setDataConnection] = useState(null);
  const [callConnection, setCallConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, waiting, connected, disconnected
  
  // Device States
  const [localMic, setLocalMic] = useState(initialMic);
  const [localCamera, setLocalCamera] = useState(initialCamera);
  const [peerMic, setPeerMic] = useState(true);
  const [peerCamera, setPeerCamera] = useState(true);
  const [peerName, setPeerName] = useState('Your Boyfriend');

  // Screen Share States
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const screenTrackRef = useRef(null);
  const screenAudioTrackRef = useRef(null);
  const audioMixerCtxRef = useRef(null);
  const micSourceRef = useRef(null);
  const screenSourceRef = useRef(null);
  const mixedDestRef = useRef(null);

  // Chat States
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Floating Hearts State
  const [hearts, setHearts] = useState([]);

  // Copy Link State
  const [copied, setCopied] = useState(false);

  // Refs for Video Elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatMessagesEndRef = useRef(null);

  // 1. Get user media and set up Peer connection
  useEffect(() => {
    let activeStream = null;
    let activePeer = null;

    async function initCall() {
      try {
        // Request camera and microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        activeStream = stream;
        setLocalStream(stream);

        // Apply initial lobby settings to tracks
        stream.getAudioTracks().forEach(t => t.enabled = initialMic);
        stream.getVideoTracks().forEach(t => t.enabled = initialCamera);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize PeerJS
        // Peer A tries to register as 'roomCode' (acts as Host)
        const peerInstance = new Peer(roomCode, {
          debug: 1, // Only errors
        });
        activePeer = peerInstance;
        setPeer(peerInstance);

        peerInstance.on('open', (id) => {
          console.log('Registered as Host with ID:', id);
          setConnectionStatus('waiting');
          
          // Wait for incoming connections
          peerInstance.on('call', (incomingCall) => {
            incomingCall.answer(stream);
            setCallConnection(incomingCall);
            
            incomingCall.on('stream', (remStream) => {
              setRemoteStream(remStream);
              setConnectionStatus('connected');
              playJoinSound();
            });
          });

          peerInstance.on('connection', (conn) => {
            setDataConnection(conn);
            setupDataListeners(conn);
          });
        });

        // PeerJS Error Handler: If the ID is already taken, we are the Guest!
        peerInstance.on('error', (err) => {
          if (err.type === 'unavailable-id') {
            console.log('Room ID taken, registering as Guest...');
            
            // Re-create Peer with a random ID (guest role)
            const guestPeer = new Peer({
              debug: 1
            });
            activePeer = guestPeer;
            setPeer(guestPeer);

            guestPeer.on('open', (guestId) => {
              console.log('Guest peer opened. Calling Host:', roomCode);
              setConnectionStatus('connecting');

              // Call Host
              const call = guestPeer.call(roomCode, stream, {
                metadata: { name: userName }
              });
              setCallConnection(call);

              call.on('stream', (remStream) => {
                setRemoteStream(remStream);
                setConnectionStatus('connected');
                playJoinSound();
              });

              call.on('error', (cErr) => {
                console.error("Call error:", cErr);
                setConnectionStatus('disconnected');
              });

              // Establish Data Connection
              const conn = guestPeer.connect(roomCode, {
                metadata: { name: userName }
              });
              setDataConnection(conn);
              setupDataListeners(conn);
            });
          } else {
            console.error('PeerJS error:', err);
            setConnectionStatus('disconnected');
          }
        });

      } catch (err) {
        console.error('Failed to get media devices:', err);
        setConnectionStatus('disconnected');
      }
    }

    initCall();

    // Clean up connections on leave/unmount
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      if (activePeer) {
        activePeer.destroy();
      }
    };
  }, [roomCode]);

  // Bind local and remote video elements once established and rendered
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, connectionStatus]);

  // Bind video element to remoteStream once it is established
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, connectionStatus]);

  // Scroll chat to bottom when message arrives
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  // Reset unread count when chat opens
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
    }
  }, [chatOpen]);

  // 2. Set up event listeners for the Peer data channel (chat, sync state, hearts)
  const setupDataListeners = (conn) => {
    conn.on('open', () => {
      console.log('Data connection established!');
      
      // Exchange initial handshake names & device states
      conn.send({
        type: 'handshake',
        name: userName,
        micEnabled: localMic,
        cameraEnabled: localCamera,
        screenSharing: isScreenSharing
      });

      conn.on('data', (data) => {
        if (!data || !data.type) return;

        switch (data.type) {
          case 'handshake':
            setPeerName(data.name);
            setPeerMic(data.micEnabled);
            setPeerCamera(data.cameraEnabled);
            setPeerScreenSharing(data.screenSharing || false);
            break;
          case 'state-change':
            if (data.device === 'mic') setPeerMic(data.enabled);
            if (data.device === 'camera') setPeerCamera(data.enabled);
            break;
          case 'screen-share':
            setPeerScreenSharing(data.sharing);
            break;
          case 'chat':
            setMessages(prev => [
              ...prev, 
              { sender: 'peer', text: data.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ]);
            if (!chatOpen) {
              setUnreadCount(prev => prev + 1);
            }
            break;
          case 'heart':
            triggerHeartAnimation();
            break;
          default:
            break;
        }
      });

      conn.on('close', () => {
        console.log('Partner disconnected.');
        setConnectionStatus('waiting');
        setRemoteStream(null);
        setCallConnection(null);
        setPeerScreenSharing(false);
        playLeaveSound();
      });
    });
  };

  // 3. Audio / Video Toggle Functions
  const toggleLocalMic = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        const newState = !track.enabled;
        track.enabled = newState;
        setLocalMic(newState);
        if (dataConnection && dataConnection.open) {
          dataConnection.send({ type: 'state-change', device: 'mic', enabled: newState });
        }
      }
    }
  };

  const toggleLocalCamera = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        const newState = !track.enabled;
        track.enabled = newState;
        setLocalCamera(newState);
        if (dataConnection && dataConnection.open) {
          dataConnection.send({ type: 'state-change', device: 'camera', enabled: newState });
        }
      }
    }
  };

  // 4. Screen Sharing logic
  const toggleScreenShare = async () => {
    if (!callConnection || !callConnection.peerConnection) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true // Request tab/system audio track
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        // Check if there is an audio track in the screen share
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        
        if (screenAudioTrack && localStream && localStream.getAudioTracks()[0]) {
          screenAudioTrackRef.current = screenAudioTrack;
          try {
            // Set up Web Audio API to mix microphone and screen audio
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioMixerCtxRef.current = audioCtx;

            const mixedDest = audioCtx.createMediaStreamDestination();
            mixedDestRef.current = mixedDest;

            // Connect local mic (respects mute state automatically)
            const micSource = audioCtx.createMediaStreamSource(new MediaStream([localStream.getAudioTracks()[0]]));
            micSourceRef.current = micSource;
            micSource.connect(mixedDest);

            // Connect screen audio source
            const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTrack]));
            screenSourceRef.current = screenSource;
            screenSource.connect(mixedDest);

            // Replace WebRTC audio track with mixed track
            const senders = callConnection.peerConnection.getSenders();
            const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
            if (audioSender) {
              audioSender.replaceTrack(mixedDest.stream.getAudioTracks()[0]);
            }
          } catch (audioErr) {
            console.warn("Failed to mix screen share audio, proceeding with video only:", audioErr);
          }
        }

        // Find the sender that transmits video tracks
        const senders = callConnection.peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');

        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }

        setIsScreenSharing(true);
        if (dataConnection && dataConnection.open) {
          dataConnection.send({ type: 'screen-share', sharing: true });
        }

        // Show local screen share preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Listen for when browser's built-in "Stop Sharing" button is clicked
        screenTrack.onended = () => {
          stopLocalScreenSharing();
        };

      } catch (err) {
        console.error("Screen share failed or cancelled:", err);
      }
    } else {
      stopLocalScreenSharing();
    }
  };

  const stopLocalScreenSharing = () => {
    // 1. Stop screen video track
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    // 2. Stop screen audio track
    if (screenAudioTrackRef.current) {
      screenAudioTrackRef.current.stop();
      screenAudioTrackRef.current = null;
    }

    // 3. Restore microphone and camera tracks and clean up Web Audio nodes
    if (callConnection && callConnection.peerConnection) {
      const senders = callConnection.peerConnection.getSenders();
      
      // Restore original camera track
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && videoTrack) {
          videoSender.replaceTrack(videoTrack);
        }
      }

      // Restore original microphone track (if it was replaced by mixed audio)
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
        if (audioSender && audioTrack) {
          audioSender.replaceTrack(audioTrack);
        }
      }
    }

    // Disconnect Web Audio API nodes
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (screenSourceRef.current) {
      screenSourceRef.current.disconnect();
      screenSourceRef.current = null;
    }
    if (mixedDestRef.current) {
      mixedDestRef.current = null;
    }
    if (audioMixerCtxRef.current) {
      audioMixerCtxRef.current.close();
      audioMixerCtxRef.current = null;
    }

    setIsScreenSharing(false);
    if (dataConnection && dataConnection.open) {
      dataConnection.send({ type: 'screen-share', sharing: false });
    }

    // Restore local camera preview
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  };

  // 5. Send Chat Messages
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { sender: 'self', text: messageInput, time: timestamp };
    
    setMessages(prev => [...prev, newMsg]);
    
    if (dataConnection && dataConnection.open) {
      dataConnection.send({ type: 'chat', text: messageInput });
    }

    setMessageInput('');
  };

  // 6. Floating Heart Sender & Receiver
  const sendHeart = () => {
    // Play sound locally
    playHeartSound();
    // Trigger local animation
    triggerHeartAnimation();
    // Send signal to peer
    if (dataConnection && dataConnection.open) {
      dataConnection.send({ type: 'heart' });
    }
  };

  const triggerHeartAnimation = () => {
    playHeartSound();
    const emojis = ['💙', '🩵', '🤍', '☁️', '⭐', '🎈', '✨'];
    const heartObj = {
      id: Date.now() + Math.random(),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      left: 10 + Math.random() * 80, // organic distribution
      size: 1.5 + Math.random() * 2 // random scale (1.5 - 3.5rem)
    };

    setHearts(prev => [...prev, heartObj]);
    
    // Auto-remove heart after animation completes
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== heartObj.id));
    }, 3000);
  };

  // 7. Copy Room Link
  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 8. Hangup / Disconnect
  const hangUp = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
    }
    if (peer) {
      peer.destroy();
    }
    onLeave();
  };

  // RENDER GRID LAYOUT
  const renderVideoGrid = () => {
    const isLocalLarge = isScreenSharing;
    const isPeerLarge = peerScreenSharing;
    const isAnyoneSharing = isLocalLarge || isPeerLarge;

    return (
      <div className={isAnyoneSharing ? 'sharing-layout' : 'video-grid'}>
        {/* Local Participant Card */}
        <div 
          className={`video-card-wrapper ${isLocalLarge ? 'large-video-card' : isAnyoneSharing ? 'thumbnail-video-card' : ''}`}
        >
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`video-element ${isScreenSharing ? 'screen-shared' : ''}`}
            style={{ display: localCamera || isScreenSharing ? 'block' : 'none' }}
          />

          {(!localCamera && !isScreenSharing) && (
            <div className="video-avatar-container">
              <div className="cute-avatar">
                {userName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}

          <div className="video-overlay">
            <span className="video-badge">
              <User size={12} color="var(--color-primary)" />
              {userName} (You)
            </span>
            <div style={styles.badgeRow}>
              {!localMic && (
                <span className="video-badge" style={{ backgroundColor: 'rgba(255, 107, 107, 0.75)', color: 'white' }}>
                  <MicOff size={12} />
                </span>
              )}
              {isScreenSharing && (
                <span className="video-badge" style={{ backgroundColor: 'rgba(56, 163, 253, 0.75)', color: 'white' }}>
                  Sharing Screen
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Remote Participant Card */}
        <div 
          className={`video-card-wrapper ${isPeerLarge ? 'large-video-card' : isAnyoneSharing ? 'thumbnail-video-card' : ''}`}
        >
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className={`video-element remote ${peerScreenSharing ? 'screen-shared' : ''}`}
            style={{ 
              display: peerCamera || peerScreenSharing ? 'block' : 'none',
              objectFit: peerScreenSharing ? 'contain' : 'cover'
            }}
          />

          {(!peerCamera && !peerScreenSharing) && (
            <div className="video-avatar-container">
              <div className="cute-avatar" style={{ background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary-light) 100%)' }}>
                {peerName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}

          <div className="video-overlay">
            <span className="video-badge">
              <Heart size={12} color="var(--color-primary)" fill="var(--color-primary)" />
              {peerName}
            </span>
            <div style={styles.badgeRow}>
              {!peerMic && (
                <span className="video-badge" style={{ backgroundColor: 'rgba(255, 107, 107, 0.75)', color: 'white' }}>
                  <MicOff size={12} />
                </span>
              )}
              {peerScreenSharing && (
                <span className="video-badge" style={{ backgroundColor: 'rgba(56, 163, 253, 0.75)', color: 'white' }}>
                  Sharing Screen
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="meeting-container">
      {/* Toast Notification for Copied Link */}
      {copied && (
        <div className="cute-toast">
          <Sparkles size={16} color="var(--color-primary-light)" />
          <span>Space link copied to clipboard! Share it with your bf 💙</span>
        </div>
      )}

      {/* Floating Hearts Container */}
      <div style={styles.heartsOverlay}>
        {hearts.map(h => (
          <span 
            key={h.id} 
            className="floating-heart" 
            style={{ 
              left: `${h.left}%`, 
              fontSize: `${h.size}rem` 
            }}
          >
            {h.emoji}
          </span>
        ))}
      </div>

      <div style={styles.mainArea} className="main-area-mobile-override">
        {/* Waiting / Call content */}
        {connectionStatus === 'connecting' && (
          <div style={styles.centeredState}>
            <div className="cute-avatar" style={styles.loadingPulse}>✨</div>
            <h2 style={styles.stateTitle}>Creating Connection...</h2>
            <p style={styles.stateDesc}>Opening a secure private tunnel for the two of you 💙</p>
          </div>
        )}

        {connectionStatus === 'waiting' && (
          <div style={styles.centeredState}>
            <div style={styles.heartPulseWrapper}>
              <Heart size={64} color="var(--color-primary)" fill="var(--color-primary)" style={styles.heartPulse} />
            </div>
            <h2 style={styles.stateTitle}>Waiting for your partner...</h2>
            <p style={styles.stateDesc}>Send this invitation link to your boyfriend so he can join you!</p>
            
            <div style={styles.inviteBox} className="glass-panel">
              <span style={styles.inviteUrl}>just2ofus.space/?room={roomCode}</span>
              <button 
                onClick={copyInviteLink} 
                className="cute-btn cute-btn-secondary"
                style={styles.inviteCopyBtn}
              >
                {copied ? <Check size={18} color="var(--color-success)" /> : <Copy size={18} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {connectionStatus === 'connected' && renderVideoGrid()}

        {connectionStatus === 'disconnected' && (
          <div style={styles.centeredState}>
            <div className="cute-avatar" style={{ background: 'var(--color-danger)' }}>🥀</div>
            <h2 style={styles.stateTitle}>Call Disconnected</h2>
            <p style={styles.stateDesc}>Connection was closed or lost. Please try rejoining 💙</p>
            <button onClick={hangUp} className="cute-btn cute-btn-primary" style={{ marginTop: '1rem' }}>
              Back to Home
            </button>
          </div>
        )}
      </div>

      {/* Slide-out Chat Drawer */}
      {chatOpen && (
        <div className="chat-drawer">
          <div style={styles.chatHeader}>
            <h3 className="chat-title">Sweet Notes 💌</h3>
            <button 
              onClick={() => setChatOpen(false)} 
              className="control-icon-btn" 
              style={{ width: '36px', height: '36px' }}
            >
              &times;
            </button>
          </div>
          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={styles.chatEmptyState}>
                  <p>No messages yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Send a sweet note to start! 💙</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`chat-message ${m.sender}`}>
                    <div>{m.text}</div>
                    <div className="chat-meta">{m.time}</div>
                  </div>
                ))
              )}
              <div ref={chatMessagesEndRef} />
            </div>
            <form onSubmit={sendChatMessage} style={styles.chatForm}>
              <input 
                type="text" 
                placeholder="Type a sweet message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="cute-input"
                style={styles.chatInput}
              />
              <button type="submit" className="cute-btn cute-btn-primary" style={styles.chatSendBtn}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Call Control Bar */}
      <div className="control-bar">
        <div className="room-label">
          <Heart size={14} fill="var(--color-primary)" color="var(--color-primary)" />
          <span className="room-label-text">{roomCode}</span>
        </div>

        <div className="control-group">
          <button 
            onClick={toggleLocalMic} 
            className={`control-icon-btn ${localMic ? 'active' : 'off'}`}
            title={localMic ? "Mute Mic" : "Unmute Mic"}
          >
            {localMic ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button 
            onClick={toggleLocalCamera} 
            className={`control-icon-btn ${localCamera ? 'active' : 'off'}`}
            title={localCamera ? "Turn Camera Off" : "Turn Camera On"}
          >
            {localCamera ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {connectionStatus === 'connected' && (
            <>
              <button 
                onClick={toggleScreenShare} 
                className={`control-icon-btn ${isScreenSharing ? 'active' : ''}`}
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              </button>

              <button 
                onClick={sendHeart} 
                className="control-icon-btn active"
                style={{ ...styles.heartBtn, ...styles.pulseBtn }}
                title="Send a Heart"
              >
                <Heart size={24} fill="white" color="white" />
              </button>

              <button 
                onClick={() => setChatOpen(!chatOpen)} 
                className={`control-icon-btn ${chatOpen ? 'active' : ''}`}
                style={styles.chatBtnWrapper}
                title="Chat Panel"
              >
                <MessageSquare size={20} />
                {unreadCount > 0 && <span style={styles.chatBadge}>{unreadCount}</span>}
              </button>
            </>
          )}

          <button 
            onClick={copyInviteLink} 
            className="control-icon-btn"
            title="Copy Invite Link"
          >
            <Copy size={20} />
          </button>

          <button 
            onClick={hangUp} 
            className="control-icon-btn hangup"
            title="Leave Call"
          >
            <PhoneOff size={20} />
          </button>
        </div>

        <div className="hidden-spacer-mobile" style={styles.hiddenSpacer} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    height: '100dvh',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    position: 'relative',
    padding: '1.5rem',
    paddingBottom: '7rem', // Space for control bar
    zIndex: 2,
  },
  centeredState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    textAlign: 'center',
    gap: '1.25rem',
  },
  stateTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--color-text)',
  },
  stateDesc: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    maxWidth: '400px',
    lineHeight: '1.5',
  },
  inviteBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '440px',
    padding: '0.8rem 1rem',
    borderRadius: '16px',
    background: 'rgba(56, 163, 253, 0.05)',
    border: '1.5px dashed var(--color-primary)',
    gap: '1rem',
  },
  inviteUrl: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    textAlign: 'left',
    color: 'var(--color-primary-hover)',
  },
  inviteCopyBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
  },
  loadingPulse: {
    animation: 'pulse-glow 2s infinite ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
  },
  heartPulseWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100px',
    height: '100px',
  },
  heartPulse: {
    filter: 'drop-shadow(0 0 15px rgba(56, 163, 253, 0.6))',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
  },
  normalLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharingLayout: {
    display: 'flex',
    flexDirection: 'row',
    gap: '1.5rem',
    width: '100%',
    height: '100%',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
    }
  },
  videoCardWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
    maxHeight: '80vh',
  },
  largeVideoCard: {
    flex: 3,
  },
  thumbnailVideoCard: {
    flex: 1,
    maxWidth: '280px',
    aspectRatio: '16/9',
    maxHeight: '180px',
    alignSelf: 'flex-start',
    zIndex: 10,
    '@media (max-width: 768px)': {
      maxWidth: '100%',
      maxHeight: '140px',
      alignSelf: 'auto',
    }
  },
  badgeRow: {
    display: 'flex',
    gap: '0.5rem',
    pointerEvents: 'none',
  },
  heartsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 999,
    overflow: 'hidden',
  },
  controlBar: {
    position: 'absolute',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '720px',
    padding: '0.85rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '28px',
    zIndex: 100,
    boxShadow: '0 12px 40px rgba(30, 144, 255, 0.15)',
    border: '1px solid rgba(56, 163, 253, 0.25)',
  },
  roomLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(56, 163, 253, 0.08)',
    padding: '0.4rem 0.8rem',
    borderRadius: '14px',
    border: '1px solid rgba(56, 163, 253, 0.12)',
  },
  roomLabelText: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--color-primary-light)',
    fontFamily: 'monospace',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  heartBtn: {
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    width: '56px',
    height: '56px',
  },
  pulseBtn: {
    animation: 'pulse-glow 2s infinite ease-in-out',
  },
  chatBtnWrapper: {
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: '-3px',
    right: '-3px',
    background: 'var(--color-primary)',
    color: 'white',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(28, 16, 38, 0.9)',
  },
  hiddenSpacer: {
    width: '100px', // Matches label width to keep controls centered
    visibility: 'hidden',
    '@media (max-width: 600px)': {
      display: 'none',
    }
  },
  chatDrawer: {
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    bottom: '7.5rem',
    width: '340px',
    zIndex: 99,
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem',
    border: '1.5px solid rgba(56, 163, 253, 0.25)',
    borderRadius: '24px',
    boxShadow: '0 10px 30px rgba(30, 144, 255, 0.12)',
    '@media (max-width: 500px)': {
      width: 'calc(100% - 3rem)',
    }
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '0.5rem',
  },
  chatTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--color-primary-light)',
  },
  chatEmptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '150px',
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  chatForm: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  chatInput: {
    padding: '0.7rem 1rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
  },
  chatSendBtn: {
    padding: '0.7rem',
    borderRadius: '12px',
    width: '42px',
  }
};
