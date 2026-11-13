import { DecodedToken, PULSE_UNITS, Pulse } from './amcCodec';

export interface PlaybackState {
  isPlaying: boolean;
  activeTokenIndex: number | null;
  activePulseIndex: number | null;
  activePulse: Pulse | null;
  activeFreqHz: number;
  harmonicFreqHz: number;
  amplitude: number;
}

class AmcAudioEngine {
  private ctx: AudioContext | null = null;
  private isAborted = false;
  private activeNodes: AudioNode[] = [];
  private timers: number[] = [];

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public stop(): void {
    this.isAborted = true;
    for (const id of this.timers) {
      window.clearTimeout(id);
    }
    this.timers = [];
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Node may already be stopped
      }
    }
    this.activeNodes = [];
  }

  private schedulePulseAudio(
    ctx: AudioContext,
    pulse: Pulse,
    startTime: number,
    unitSec: number,
    baseFreq: number,
    volume: number
  ): number {
    const units = PULSE_UNITS[pulse];
    const duration = units * unitSec;
    const attack = Math.min(0.008, duration * 0.15);
    const release = Math.min(0.012, duration * 0.2);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, startTime);
    masterGain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume), startTime + attack);
    masterGain.gain.setValueAtTime(Math.max(0.01, volume), startTime + Math.max(attack, duration - release));
    masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    masterGain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';

    if (pulse === '~') {
      // FM Chirp: sweeps smoothly from 0.78x to 1.42x base frequency
      osc1.frequency.setValueAtTime(baseFreq * 0.78, startTime);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.42, startTime + duration);
    } else {
      osc1.frequency.setValueAtTime(baseFreq, startTime);
    }

    osc1.connect(masterGain);
    osc1.start(startTime);
    osc1.stop(startTime + duration + 0.01);
    this.activeNodes.push(osc1, masterGain);

    if (pulse === '═') {
      // Double-Harmonic Long: adds a resonant perfect fifth harmonic (1.5x)
      const osc2 = ctx.createOscillator();
      const harmonicGain = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 1.5, startTime);
      harmonicGain.gain.setValueAtTime(0.42, startTime);
      osc2.connect(harmonicGain);
      harmonicGain.connect(masterGain);
      osc2.start(startTime);
      osc2.stop(startTime + duration + 0.01);
      this.activeNodes.push(osc2, harmonicGain);
    }

    return duration;
  }

  public playSinglePulse(pulse: Pulse, wpm = 18, baseFreq = 680, volume = 0.25): void {
    const ctx = this.ensureContext();
    const unitSec = 1.2 / Math.max(5, wpm);
    this.schedulePulseAudio(ctx, pulse, ctx.currentTime + 0.01, unitSec, baseFreq, volume);
  }

  public playToken(pulses: Pulse[], wpm = 18, baseFreq = 680, volume = 0.25): void {
    if (!pulses.length) return;
    const ctx = this.ensureContext();
    const unitSec = 1.2 / Math.max(5, wpm);
    let cursor = ctx.currentTime + 0.01;
    pulses.forEach((p, idx) => {
      const dur = this.schedulePulseAudio(ctx, p, cursor, unitSec, baseFreq, volume);
      cursor += dur;
      if (idx < pulses.length - 1) {
        cursor += unitSec;
      }
    });
  }

  public playSequence(
    tokens: DecodedToken[],
    options: {
      wpm: number;
      baseFreq: number;
      volume?: number;
      onState: (state: PlaybackState) => void;
      onComplete: () => void;
    }
  ): void {
    this.stop();
    this.isAborted = false;

    const ctx = this.ensureContext();
    const unitSec = 1.2 / Math.max(5, options.wpm);
    const volume = options.volume ?? 0.25;

    let cursorMs = 20;
    const baseAudioTime = ctx.currentTime + 0.02;

    for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
      const tok = tokens[tIdx];

      if (tok.kind === 'space' || tok.kind === 'tab' || tok.kind === 'newline') {
        const gapUnits = tok.kind === 'newline' ? 7 : 4;
        const startMs = cursorMs;
        const tId = window.setTimeout(() => {
          if (this.isAborted) return;
          options.onState({
            isPlaying: true,
            activeTokenIndex: tIdx,
            activePulseIndex: null,
            activePulse: null,
            activeFreqHz: 0,
            harmonicFreqHz: 0,
            amplitude: 0,
          });
        }, startMs);
        this.timers.push(tId);
        cursorMs += gapUnits * unitSec * 1000;
        continue;
      }

      if (!tok.pulses.length) continue;

      tok.pulses.forEach((pulse, pIdx) => {
        const audioStart = baseAudioTime + cursorMs / 1000;
        const durSec = this.schedulePulseAudio(
          ctx,
          pulse,
          audioStart,
          unitSec,
          options.baseFreq,
          volume
        );
        const startMs = cursorMs;
        const durMs = durSec * 1000;

        const onId = window.setTimeout(() => {
          if (this.isAborted) return;
          options.onState({
            isPlaying: true,
            activeTokenIndex: tIdx,
            activePulseIndex: pIdx,
            activePulse: pulse,
            activeFreqHz: pulse === '~' ? options.baseFreq * 1.1 : options.baseFreq,
            harmonicFreqHz: pulse === '═' ? options.baseFreq * 1.5 : 0,
            amplitude: 1,
          });
        }, startMs);
        this.timers.push(onId);

        const offId = window.setTimeout(() => {
          if (this.isAborted) return;
          options.onState({
            isPlaying: true,
            activeTokenIndex: tIdx,
            activePulseIndex: null,
            activePulse: null,
            activeFreqHz: 0,
            harmonicFreqHz: 0,
            amplitude: 0,
          });
        }, startMs + durMs);
        this.timers.push(offId);

        cursorMs += durMs;
        if (pIdx < tok.pulses.length - 1) {
          cursorMs += unitSec * 1000; // 1u intra-character gap
        }
      });

      // 3u inter-character gap
      cursorMs += 3 * unitSec * 1000;
    }

    const doneId = window.setTimeout(() => {
      if (this.isAborted) return;
      options.onState({
        isPlaying: false,
        activeTokenIndex: null,
        activePulseIndex: null,
        activePulse: null,
        activeFreqHz: 0,
        harmonicFreqHz: 0,
        amplitude: 0,
      });
      options.onComplete();
    }, cursorMs + 40);
    this.timers.push(doneId);
  }
}

export const amcAudio = new AmcAudioEngine();
