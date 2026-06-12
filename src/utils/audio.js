// Cute audio synthesizer using Web Audio API (no external file dependencies)
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a cute, ascending arpeggio for joining a room
 */
export function playJoinSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.08;
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'triangle'; // Soft sound
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0, now + idx * duration);
      gainNode.gain.linearRampToValueAtTime(0.12, now + idx * duration + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * duration + duration * 1.5);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + idx * duration);
      osc.stop(now + idx * duration + duration * 1.5);
    });
  } catch (e) {
    console.warn("Failed to play join sound:", e);
  }
}

/**
 * Plays a gentle, descending arpeggio for leaving a room
 */
export function playLeaveSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Notes: C6 (1046.50Hz), G5 (783.99Hz), E5 (659.25Hz), C5 (523.25Hz)
    const notes = [1046.50, 783.99, 659.25, 523.25];
    const duration = 0.08;
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0, now + idx * duration);
      gainNode.gain.linearRampToValueAtTime(0.10, now + idx * duration + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * duration + duration * 1.5);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + idx * duration);
      osc.stop(now + idx * duration + duration * 1.5);
    });
  } catch (e) {
    console.warn("Failed to play leave sound:", e);
  }
}

/**
 * Plays a cute, high-pitched double-beep when a heart is sent
 */
export function playHeartSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Quick double chime: E6 (1318.51Hz) followed by G6 (1567.98Hz)
    const notes = [1318.51, 1567.98];
    const startTimes = [0, 0.07];
    const durations = [0.06, 0.18];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // Sine wave with a touch of triangle for sweet retro warmth
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const t = now + startTimes[idx];
      const dur = durations[idx];
      
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.15, t + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(t);
      osc.stop(t + dur);
    });
  } catch (e) {
    console.warn("Failed to play heart sound:", e);
  }
}
