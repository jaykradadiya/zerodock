export type SoundType = 'pop' | 'tick' | 'swoosh';

type LegacyAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
const AudioContextConstructor = typeof window === 'undefined'
  ? undefined
  : window.AudioContext || (window as LegacyAudioWindow).webkitAudioContext;

// Lazy-create AudioContext on first use to avoid wasting resources if sound is never played
let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (!audioCtx && AudioContextConstructor) {
    audioCtx = new AudioContextConstructor();
  }
  return audioCtx;
}

export function playSound(type: SoundType) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'pop') {
    // A soft, low-frequency pop
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } else if (type === 'tick') {
    // A sharp, high-frequency tick
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  } else if (type === 'swoosh') {
    // A soft sweeping sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }
}
