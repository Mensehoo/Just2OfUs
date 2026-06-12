import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import LobbyScreen from './components/LobbyScreen';
import RoomScreen from './components/RoomScreen';

export default function App() {
  const [step, setStep] = useState('welcome'); // welcome, lobby, room
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('just2ofus_username') || '';
  });
  const [joinDetails, setJoinDetails] = useState(null);

  // Parse room query parameter on mount for quick sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const cleanRoom = roomParam.trim().toLowerCase();
      setRoomCode(cleanRoom);
      setStep('lobby');
    }
  }, []);

  // Save name to localStorage when changed
  useEffect(() => {
    if (userName.trim()) {
      localStorage.setItem('just2ofus_username', userName.trim());
    }
  }, [userName]);

  const handleRoomSelect = (code) => {
    setRoomCode(code);
    
    // Update the URL to include the room query param for easier copy-pasting
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    setStep('lobby');
  };

  const handleJoinCall = (details) => {
    setJoinDetails(details);
    setStep('room');
  };

  const handleLeaveCall = () => {
    // Reset to welcome page
    setStep('welcome');
    setRoomCode('');
    setJoinDetails(null);

    // Clear room query parameter in browser address bar
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {step === 'welcome' && (
        <WelcomeScreen 
          onRoomSelect={handleRoomSelect} 
          defaultRoomCode={roomCode}
        />
      )}

      {step === 'lobby' && (
        <LobbyScreen
          roomCode={roomCode}
          onJoin={handleJoinCall}
          userName={userName}
          setUserName={setUserName}
        />
      )}

      {step === 'room' && (
        <RoomScreen
          roomCode={roomCode}
          joinDetails={joinDetails}
          onLeave={handleLeaveCall}
        />
      )}
    </div>
  );
}
