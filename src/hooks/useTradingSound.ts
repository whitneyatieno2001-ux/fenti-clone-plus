import { useCallback } from 'react';

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContext() {
  const w = window as WebkitWindow;
  const Ctx = window.AudioContext || w.webkitAudioContext;
  return new Ctx();
}

function playTone(opts: {
  startHz: number;
  endHz?: number;
  durationMs: number;
  type?: OscillatorType;
  volume?: number;
}) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type ?? 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const dur = opts.durationMs / 1000;

  const vol = opts.volume ?? 0.25;
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  osc.frequency.setValueAtTime(opts.startHz, now);
  if (opts.endHz && opts.endHz !== opts.startHz) {
    osc.frequency.exponentialRampToValueAtTime(opts.endHz, now + Math.max(0.05, dur * 0.7));
  }

  osc.start(now);
  osc.stop(now + dur);
}

// Simple, "binary bot" style cues: entry tick + win chime + loss buzz.
export function useTradingSound() {
  const playEntrySound = useCallback(() => {
    // Short "tick" like trade executed
    playTone({ startHz: 900, endHz: 700, durationMs: 90, type: 'square', volume: 0.12 });
  }, []);

  const playWinSound = useCallback(() => {
    // Chime up
    playTone({ startHz: 520, endHz: 1040, durationMs: 180, type: 'triangle', volume: 0.2 });
    setTimeout(() => playTone({ startHz: 780, endHz: 1240, durationMs: 140, type: 'triangle', volume: 0.14 }), 120);
  }, []);

  const playLossSound = useCallback(() => {
    // Buzz down
    playTone({ startHz: 420, endHz: 160, durationMs: 220, type: 'sawtooth', volume: 0.18 });
  }, []);

  const playTradeSound = useCallback(
    (isWin: boolean) => {
      playEntrySound();
      setTimeout(() => {
        if (isWin) playWinSound();
        else playLossSound();
      }, 110);
    },
    [playEntrySound, playWinSound, playLossSound]
  );

  return { playEntrySound, playWinSound, playLossSound, playTradeSound };
}
