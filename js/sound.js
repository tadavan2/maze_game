// sound.js — Web Audio sound engine.
// Self-contained: audioCtx is module-private.

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

export function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Shared helper — all simple sounds are just an oscillator with frequency/gain ramps.
// freqSteps: array of { value, time } — first entry uses setValueAtTime, rest use ramp or set.
// Options: type, gainStart, duration, useSet (use setValueAtTime instead of exponentialRamp for freq)
function playTone({ type, freqSteps, gainStart, duration, useSet, delay = 0 }) {
  ensureAudio();
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;

  freqSteps.forEach((step, i) => {
    if (i === 0 || useSet) {
      osc.frequency.setValueAtTime(step.value, t + step.time);
    } else {
      osc.frequency.exponentialRampToValueAtTime(step.value, t + step.time);
    }
  });

  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.setValueAtTime(gainStart, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export function playEngineSound() {
  playTone({
    type: 'sawtooth',
    freqSteps: [{ value: 80, time: 0 }, { value: 120, time: 0.08 }, { value: 60, time: 0.15 }],
    gainStart: 0.08, duration: 0.15,
  });
}

export function playBoostSound() {
  playTone({
    type: 'sawtooth',
    freqSteps: [{ value: 100, time: 0 }, { value: 400, time: 0.3 }, { value: 80, time: 0.5 }],
    gainStart: 0.15, duration: 0.5,
  });
}

export function playStarSound() {
  playTone({
    type: 'sine',
    freqSteps: [{ value: 600, time: 0 }, { value: 1200, time: 0.15 }],
    gainStart: 0.12, duration: 0.2,
  });
}

export function playCountdownBeep(final) {
  playTone({
    type: 'square',
    freqSteps: [{ value: final ? 880 : 440, time: 0 }],
    gainStart: 0.12, duration: final ? 0.4 : 0.2,
  });
}

export function playSkidSound() {
  playTone({
    type: 'sawtooth',
    freqSteps: [{ value: 300, time: 0 }, { value: 50, time: 0.4 }],
    gainStart: 0.15, duration: 0.4,
  });
}

export function playBonkSound() {
  playTone({
    type: 'triangle',
    freqSteps: [{ value: 200, time: 0 }, { value: 80, time: 0.15 }],
    gainStart: 0.2, duration: 0.2,
  });
}

export function playSirenSound() {
  // Siren uses setValueAtTime for step changes (not ramps)
  playTone({
    type: 'sine',
    freqSteps: [{ value: 600, time: 0 }, { value: 800, time: 0.15 }, { value: 600, time: 0.3 }],
    gainStart: 0.12, duration: 0.4, useSet: true,
  });
}

export function playWinSound() {
  // Win is a multi-note arpeggio — each note staggers via delay
  ensureAudio();
  [523, 659, 784, 1047].forEach((freq, i) => {
    playTone({
      type: 'sine',
      freqSteps: [{ value: freq, time: 0 }],
      gainStart: 0.12, duration: 0.3, delay: i * 0.12,
    });
  });
}
