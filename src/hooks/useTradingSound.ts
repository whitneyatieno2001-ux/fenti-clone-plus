import { useCallback, useRef } from 'react';

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function createAudioContext(): AudioContext {
  const w = window as WebkitWindow;
  const Ctx = window.AudioContext || w.webkitAudioContext;
  return new Ctx();
}

// Professional trading sound hook with realistic audio cues
export function useTradingSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = createAudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Entry tick: clean digital "click" notification
  const playEntrySound = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Click oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

    filter.type = 'highpass';
    filter.frequency.value = 800;

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }, [getCtx]);

  // Win sound: satisfying ascending chime (3-note arpeggio)
  const playWinSound = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
    const delays = [0, 0.07, 0.14];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const start = now + delays[i];
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.4);
    });

    // Add subtle high shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 1567.98; // G6

    shimmerGain.gain.setValueAtTime(0, now + 0.15);
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.18);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.15);
    shimmer.stop(now + 0.55);
  }, [getCtx]);

  // Loss sound: subtle descending tone (non-harsh)
  const playLossSound = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Main tone - descending
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Subtle second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(349.23, now + 0.05); // F4
    osc2.frequency.exponentialRampToValueAtTime(174.61, now + 0.25);

    gain2.gain.setValueAtTime(0.08, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc2.connect(ctx.destination);
    gain2.connect(ctx.destination);
    osc2.connect(gain2);

    osc2.start(now + 0.05);
    osc2.stop(now + 0.3);
  }, [getCtx]);

  // Combined trade sound with entry + result
  const playTradeSound = useCallback(
    (isWin: boolean) => {
      playEntrySound();
      setTimeout(() => {
        if (isWin) {
          playWinSound();
        } else {
          playLossSound();
        }
      }, 150);
    },
    [playEntrySound, playWinSound, playLossSound]
  );

  return { playEntrySound, playWinSound, playLossSound, playTradeSound };
}
