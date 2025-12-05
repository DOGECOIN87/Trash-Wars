import { useEffect, useRef, useCallback } from 'react';

export const useAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext lazily or on mount
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }
  }, []);

  const resumeCtx = useCallback(() => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  }, []);

  const playSweep = useCallback((startFreq: number, endFreq: number, type: OscillatorType, duration: number, vol: number) => {
    if (!audioCtxRef.current) return;
    resumeCtx();
    const ctx = audioCtxRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, [resumeCtx]);

  const playNoise = useCallback((duration: number, vol: number) => {
    if (!audioCtxRef.current) return;
    resumeCtx();
    const ctx = audioCtxRef.current;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Filter noise for "crunch" / explosion texture
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }, [resumeCtx]);

  const playEat = useCallback(() => {
    // High pitch random variation 'bloop'
    const pitch = 600 + Math.random() * 200;
    playSweep(pitch, pitch + 200, 'sine', 0.1, 0.05);
  }, [playSweep]);

  const playSplit = useCallback(() => {
    // Sharp 'zap' laser sound
    playSweep(800, 200, 'sawtooth', 0.15, 0.1);
  }, [playSweep]);

  const playEject = useCallback(() => {
    // Soft 'pfft' / throw sound
    playSweep(300, 100, 'square', 0.1, 0.03);
  }, [playSweep]);

  const playVirus = useCallback(() => {
    // Explosion crunch
    playNoise(0.4, 0.15);
  }, [playNoise]);

  const playCashOut = useCallback(() => {
     // Victory shimmer
     playSweep(400, 1200, 'triangle', 0.5, 0.1);
     setTimeout(() => playSweep(600, 1500, 'sine', 0.5, 0.1), 100);
     setTimeout(() => playSweep(800, 2000, 'sine', 0.8, 0.05), 200);
  }, [playSweep]);

  return { playEat, playSplit, playEject, playVirus, playCashOut };
};