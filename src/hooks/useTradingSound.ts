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

  // iPhone message popup sound - short ascending chime
  const playProfitSound = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    
    // First tone - short bright pop
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.06);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone - higher follow-up
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1600, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.14);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.1, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);
  }, [getCtx]);

  return { playProfitSound };
}
