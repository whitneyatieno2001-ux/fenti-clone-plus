import { useCallback, useRef } from 'react';

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function createAudioContext(): AudioContext {
  const w = window as WebkitWindow;
  const Ctx = window.AudioContext || w.webkitAudioContext;
  return new Ctx();
}

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

  // Entry: quick cash register "ka-ching" blip
  const playEntrySound = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }, [getCtx]);

  // Win: bright coin-drop / slot-win sparkle
  const playWinSound = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const notes = [880, 1108.73, 1318.51, 1760]; // A5, C#6, E6, A6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }, [getCtx]);

  // Loss: short low buzz / dull thud
  const playLossSound = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }, [getCtx]);

  const playTradeSound = useCallback(
    (isWin: boolean) => {
      playEntrySound();
      setTimeout(() => {
        if (isWin) playWinSound();
        else playLossSound();
      }, 120);
    },
    [playEntrySound, playWinSound, playLossSound]
  );

  return { playEntrySound, playWinSound, playLossSound, playTradeSound };
}
