import React, { useEffect, useRef } from 'react';
import { PlaybackState } from '../lib/amcAudio';
import { PULSE_META } from '../lib/amcCodec';

interface OscilloscopeProps {
  playback: PlaybackState;
  baseFreq: number;
  isDark: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  playback,
  baseFreq,
  isDark,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(0);
  const ampRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let animId = 0;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const targetW = Math.round(rect.width * dpr);
        const targetH = Math.round(rect.height * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        animId = requestAnimationFrame(draw);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const cw = w / dpr;
      const ch = h / dpr;

      // Clear background
      ctx.fillStyle = isDark ? '#0B1120' : '#F8FAFC';
      ctx.fillRect(0, 0, cw, ch);

      // Subtle coordinate grid
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.06)';
      ctx.lineWidth = 1;
      const stepX = 36;
      const stepY = 18;
      ctx.beginPath();
      for (let x = stepX; x < cw; x += stepX) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
      }
      for (let y = stepY; y < ch; y += stepY) {
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
      }
      ctx.stroke();

      // Center axis line
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, ch / 2);
      ctx.lineTo(cw, ch / 2);
      ctx.stroke();

      // Smooth amplitude envelope
      const targetAmp = playback.amplitude > 0 ? 1 : 0;
      ampRef.current += (targetAmp - ampRef.current) * Math.min(1, dt * 24);
      if (ampRef.current < 0.005 && targetAmp === 0) ampRef.current = 0;

      if (!prefersReducedMotion) {
        phaseRef.current += dt * 16;
      }

      const pulse = playback.activePulse;
      const midY = ch / 2;
      const maxAmp = ch * 0.36;

      // Waveform color based on active pulse primitive
      let strokeColor = isDark ? '#38BDF8' : '#0284C7';
      if (pulse === '═') {
        strokeColor = isDark ? '#FBBF24' : '#D97706';
      } else if (pulse === '~') {
        strokeColor = isDark ? '#2DD4BF' : '#0D9488';
      } else if (pulse === '−') {
        strokeColor = isDark ? '#60A5FA' : '#2563EB';
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.75;
      ctx.beginPath();

      const cyclesBase = Math.max(4, Math.round(baseFreq / 80));
      for (let x = 0; x <= cw; x += 1.5) {
        const normX = x / cw;
        const windowEnv = Math.sin(normX * Math.PI);
        let yVal = 0;

        if (ampRef.current > 0.005) {
          if (pulse === '═') {
            // Dual-harmonic superposition (f0 + 1.5*f0)
            const f1 = Math.sin(normX * cyclesBase * Math.PI * 2 - phaseRef.current);
            const f2 = 0.55 * Math.sin(normX * cyclesBase * 1.5 * Math.PI * 2 - phaseRef.current * 1.5);
            yVal = (f1 + f2) * 0.65;
          } else if (pulse === '~') {
            // FM Chirp sweep across frame
            const chirpFreq = cyclesBase * (0.6 + normX * 1.3);
            yVal = Math.sin(normX * chirpFreq * Math.PI * 2 - phaseRef.current * 1.25);
          } else {
            yVal = Math.sin(normX * cyclesBase * Math.PI * 2 - phaseRef.current);
          }
          yVal *= ampRef.current * windowEnv * maxAmp;
        }

        const py = midY - yVal;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [playback, baseFreq, isDark]);

  const activeMeta = playback.activePulse ? PULSE_META[playback.activePulse] : null;

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-800 dark:text-slate-100">Carrier Oscilloscope</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
          <span className="font-mono tabular-nums">
            {playback.isPlaying
              ? playback.activePulse
                ? `TX ${playback.activePulse} (${activeMeta?.name})`
                : 'TX Inter-pulse Gap'
              : 'Idle'}
          </span>
        </div>
        <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {playback.activeFreqHz > 0
            ? playback.harmonicFreqHz > 0
              ? `${Math.round(playback.activeFreqHz)} Hz + ${Math.round(playback.harmonicFreqHz)} Hz`
              : `${Math.round(playback.activeFreqHz)} Hz`
            : `${baseFreq} Hz Carrier`}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-16 block"
        aria-label="Real-time AMC carrier waveform oscilloscope"
      />
    </div>
  );
};
