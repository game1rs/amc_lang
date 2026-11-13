import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from 'lucide-react';
import {
  AmcOptions,
  DecodedToken,
  decodeAmcToEnglish,
  encodeEnglishToAmc,
  PULSE_META,
  Pulse,
} from '../lib/amcCodec';
import { amcAudio, PlaybackState } from '../lib/amcAudio';
import { Oscilloscope } from './Oscilloscope';

export type TranslationDirection = 'en-to-amc' | 'amc-to-en';

interface TranslatorWorkspaceProps {
  direction: TranslationDirection;
  onDirectionChange: (dir: TranslationDirection) => void;
  englishText: string;
  onEnglishChange: (val: string) => void;
  amcText: string;
  onAmcChange: (val: string) => void;
  options: AmcOptions;
  onOptionsChange: (opts: AmcOptions) => void;
  wpm: number;
  onWpmChange: (wpm: number) => void;
  baseFreq: number;
  onBaseFreqChange: (freq: number) => void;
  playback: PlaybackState;
  onPlayTokens: (tokens: DecodedToken[]) => void;
  onStopPlayback: () => void;
  isDark: boolean;
}

const SAMPLE_PRESETS = [
  {
    label: 'Greeting & Symbols',
    text: 'Signal Check: 2026! Ready @ 99.4%?',
  },
  {
    label: 'Physics Formula',
    text: 'E = mc^2 ± 0.05% (Δv ≈ 42.8 m/s)',
  },
  {
    label: 'Code & Logic',
    text: 'if (rate >= 95% && !err) { return [OK]; }',
  },
  {
    label: 'Currency & Math',
    text: 'Total: €1,250 ÷ 4 = £265.50 ≠ $0',
  },
];

const QUICK_SYMBOLS = [
  '@', '#', '$', '%', '&', '*', '+', '=', '±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '√', '°', '€', '£', '§', '{', '}', '[', ']',
];

export const TranslatorWorkspace: React.FC<TranslatorWorkspaceProps> = ({
  direction,
  onDirectionChange,
  englishText,
  onEnglishChange,
  amcText,
  onAmcChange,
  options,
  onOptionsChange,
  wpm,
  onWpmChange,
  baseFreq,
  onBaseFreqChange,
  playback,
  onPlayTokens,
  onStopPlayback,
  isDark,
}) => {
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);

  const encodeResult = useMemo(
    () => encodeEnglishToAmc(englishText, options),
    [englishText, options]
  );

  const decodeResult = useMemo(
    () => decodeAmcToEnglish(amcText, options),
    [amcText, options]
  );

  const activeTokens =
    direction === 'en-to-amc' ? encodeResult.tokens : decodeResult.tokens;

  const targetValue =
    direction === 'en-to-amc' ? encodeResult.amc : decodeResult.text;

  const unitSeconds = 1.2 / Math.max(5, wpm);
  const totalUnits = useMemo(() => {
    if (direction === 'en-to-amc') return encodeResult.unitCount;
    return decodeResult.tokens.reduce((acc, tok) => {
      if (tok.kind === 'space') return acc + 7;
      if (tok.kind === 'newline') return acc + 10;
      if (tok.kind === 'tab') return acc + 8;
      if (!tok.pulses.length) return acc;
      const pUnits = tok.pulses.reduce(
        (s, p) => s + PULSE_META[p].units,
        0
      );
      return acc + pUnits + Math.max(0, tok.pulses.length - 1) + 3;
    }, 0);
  }, [direction, encodeResult.unitCount, decodeResult.tokens]);

  const estimatedDurationSec = (totalUnits * unitSeconds).toFixed(1);
  const totalPulses = useMemo(
    () => activeTokens.reduce((acc, t) => acc + t.pulses.length, 0),
    [activeTokens]
  );

  const handleSwap = () => {
    onStopPlayback();
    if (direction === 'en-to-amc') {
      onAmcChange(encodeResult.amc);
      onDirectionChange('amc-to-en');
    } else {
      onEnglishChange(decodeResult.text);
      onDirectionChange('en-to-amc');
    }
  };

  const handleCopy = async (text: string, which: 'source' | 'target') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'source') {
        setCopiedSource(true);
        setTimeout(() => setCopiedSource(false), 1600);
      } else {
        setCopiedTarget(true);
        setTimeout(() => setCopiedTarget(false), 1600);
      }
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleClear = () => {
    onStopPlayback();
    if (direction === 'en-to-amc') {
      onEnglishChange('');
    } else {
      onAmcChange('');
    }
  };

  const insertAtInput = (str: string) => {
    if (direction === 'en-to-amc') {
      onEnglishChange(englishText + str);
    } else {
      const needsSpace = amcText.length > 0 && !amcText.endsWith(' ');
      onAmcChange(amcText + (needsSpace ? ' ' : '') + str);
    }
  };

  const playableTokens = activeTokens.filter(
    (t) => t.kind !== 'unknown' && (t.pulses.length > 0 || t.kind === 'space' || t.kind === 'newline' || t.kind === 'tab')
  );

  return (
    <div className="space-y-5">
      {/* Calibration & Codec Control Bar */}
      <section
        aria-label="Signal calibration controls"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Direction Segmented Control */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onDirectionChange('en-to-amc')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  direction === 'en-to-amc'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                English to AMC
              </button>
              <button
                type="button"
                onClick={() => onDirectionChange('amc-to-en')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  direction === 'amc-to-en'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                AMC to English
              </button>
            </div>

            <button
              type="button"
              onClick={handleSwap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Swap translation direction and carry output over"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Swap</span>
            </button>
          </div>

          {/* Cipher & Codec Parameters */}
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={options.caseSensitive}
                onChange={(e) =>
                  onOptionsChange({ ...options, caseSensitive: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="font-medium whitespace-nowrap">Preserve Case</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={options.includeParity}
                onChange={(e) =>
                  onOptionsChange({ ...options, includeParity: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="font-medium whitespace-nowrap">CRC-4 Parity Frame</span>
            </label>

            <div className="flex items-center gap-2">
              <label
                htmlFor="rotor-key-input"
                className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
              >
                Rotor Key
              </label>
              <input
                id="rotor-key-input"
                type="text"
                value={options.cipherKey}
                onChange={(e) =>
                  onOptionsChange({ ...options, cipherKey: e.target.value })
                }
                placeholder="None (Standard)"
                className="w-36 px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600"
              />
            </div>
          </div>
        </div>

        {/* Sample Presets & Acoustic Calibration */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">
              Test Vectors:
            </span>
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onStopPlayback();
                  if (direction === 'amc-to-en') {
                    onAmcChange(encodeEnglishToAmc(preset.text, options).amc);
                  } else {
                    onEnglishChange(preset.text);
                  }
                }}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="wpm-slider"
                className="text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap"
              >
                Speed
              </label>
              <input
                id="wpm-slider"
                type="range"
                min={6}
                max={36}
                step={1}
                value={wpm}
                onChange={(e) => onWpmChange(Number(e.target.value))}
                className="w-24 accent-cyan-600 cursor-pointer"
              />
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200 w-14">
                {wpm} WPM
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <label
                htmlFor="freq-slider"
                className="text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap"
              >
                Pitch
              </label>
              <input
                id="freq-slider"
                type="range"
                min={400}
                max={1000}
                step={20}
                value={baseFreq}
                onChange={(e) => onBaseFreqChange(Number(e.target.value))}
                className="w-24 accent-cyan-600 cursor-pointer"
              />
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200 w-16">
                {baseFreq} Hz
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dual Translation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Input Panel */}
        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {direction === 'en-to-amc' ? 'English Source' : 'AMC Signal Input'}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {direction === 'en-to-amc'
                  ? `${Array.from(englishText).length} chars`
                  : `${decodeResult.tokens.length} frames`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    direction === 'en-to-amc' ? englishText : amcText,
                    'source'
                  )
                }
                disabled={!(direction === 'en-to-amc' ? englishText : amcText)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copiedSource ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!(direction === 'en-to-amc' ? englishText : amcText)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <textarea
            value={direction === 'en-to-amc' ? englishText : amcText}
            onChange={(e) =>
              direction === 'en-to-amc'
                ? onEnglishChange(e.target.value)
                : onAmcChange(e.target.value)
            }
            placeholder={
              direction === 'en-to-amc'
                ? 'Type English text, numbers, punctuation, or mathematical symbols...'
                : 'Paste AMC pulses (· − ═ ~ /) or type ASCII shorthand (. - = ~ /) separated by spaces...'
            }
            rows={7}
            spellCheck={direction === 'en-to-amc'}
            className={`w-full flex-1 p-4 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-y min-h-[180px] leading-relaxed ${
              direction === 'amc-to-en' ? 'font-mono text-base tracking-wide' : 'text-[15px]'
            }`}
          />

          {/* Quick Insertion Bar */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto">
            {direction === 'en-to-amc' ? (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">
                  Insert Symbol:
                </span>
                {QUICK_SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => insertAtInput(sym)}
                    className="px-2 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors shrink-0 cursor-pointer"
                  >
                    {sym}
                  </button>
                ))}
              </>
            ) : (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">
                  Insert Pulse:
                </span>
                {(['·', '−', '═', '~'] as Pulse[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      amcAudio.playSinglePulse(p, wpm, baseFreq);
                      onAmcChange(amcText + p);
                    }}
                    className="px-2.5 py-0.5 text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:border-cyan-500 transition-colors shrink-0 cursor-pointer"
                    title={`${PULSE_META[p].name} (${PULSE_META[p].units}u)`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onAmcChange(amcText + ' ')}
                  className="px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:border-cyan-500 transition-colors shrink-0 cursor-pointer"
                >
                  Char Space
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAmcChange(
                      amcText + (amcText.endsWith(' ') || !amcText ? '/ ' : ' / ')
                    )
                  }
                  className="px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:border-cyan-500 transition-colors shrink-0 cursor-pointer"
                >
                  Word ( / )
                </button>
                <span className="ml-auto text-xs text-slate-400 whitespace-nowrap pl-2">
                  Tip: . - = ~ also accepted
                </span>
              </>
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {direction === 'en-to-amc' ? 'AMC Encoded Stream' : 'Decoded English'}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {totalPulses} pulses · {estimatedDurationSec}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              {playback.isPlaying ? (
                <button
                  type="button"
                  onClick={onStopPlayback}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Audio</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onPlayTokens(playableTokens)}
                  disabled={playableTokens.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-cyan-700 hover:bg-cyan-800 disabled:opacity-40 rounded transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play Signal</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopy(targetValue, 'target')}
                disabled={!targetValue}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copiedTarget ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className={`flex-1 p-4 min-h-[180px] overflow-y-auto break-words whitespace-pre-wrap leading-relaxed ${
              direction === 'en-to-amc'
                ? 'font-mono text-base tracking-wider text-slate-900 dark:text-slate-100'
                : 'text-[15px] text-slate-900 dark:text-slate-100'
            }`}
          >
            {targetValue ? (
              targetValue
            ) : (
              <span className="text-slate-400 font-sans text-sm">
                Translated output will appear here in real time.
              </span>
            )}
          </div>

          {/* Integrity / Diagnostic Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <span>
                Alphabet: <strong className="font-mono text-slate-800 dark:text-slate-200">· − ═ ~</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {options.cipherKey.trim()
                  ? `Rotor Active (Key: ${options.cipherKey.trim()})`
                  : 'Standard Unkeyed Mode'}
              </span>
            </div>

            {direction === 'amc-to-en' && (
              <div className="flex items-center gap-3 font-mono">
                {decodeResult.invalidTokens.length > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    ▲ {decodeResult.invalidTokens.length} Unrecognized Frame
                    {decodeResult.invalidTokens.length > 1 ? 's' : ''}
                  </span>
                )}
                {decodeResult.parityStatus === 'verified' && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    ● Parity Verified
                  </span>
                )}
                {decodeResult.parityStatus === 'mismatch' && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    ✖ Parity Mismatch (Expected {decodeResult.expectedParity})
                  </span>
                )}
                {decodeResult.parityStatus === 'missing' && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ▲ No Parity Frame Received
                  </span>
                )}
              </div>
            )}

            {direction === 'en-to-amc' && encodeResult.parityCode && (
              <div className="font-mono text-slate-600 dark:text-slate-300">
                CRC-4: <span className="text-cyan-700 dark:text-cyan-400 font-semibold">{encodeResult.parityCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Carrier Oscilloscope */}
      <Oscilloscope playback={playback} baseFreq={baseFreq} isDark={isDark} />

      {/* Interactive Frame-by-Frame Token Inspector */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Frame-by-Frame Signal Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any character frame to audition its 4-pulse acoustic signature.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>· 1u Dit</span>
            <span>− 3u Dah</span>
            <span>═ 5u Harmonic</span>
            <span>~ 2u FM Chirp</span>
          </div>
        </div>

        {activeTokens.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-md">
            Enter text or AMC pulses above to inspect individual signal frames.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeTokens.map((tok, idx) => {
              const isCurrent = playback.isPlaying && playback.activeTokenIndex === idx;
              const isInvalid = !tok.valid;
              const displayChar =
                tok.kind === 'space'
                  ? 'SPACE'
                  : tok.kind === 'newline'
                  ? 'NEWLINE'
                  : tok.kind === 'tab'
                  ? 'TAB'
                  : tok.kind === 'parity'
                  ? 'CRC-4'
                  : tok.char;

              return (
                <button
                  key={`${tok.index}-${idx}`}
                  type="button"
                  onClick={() => {
                    if (tok.pulses.length > 0) {
                      amcAudio.playToken(tok.pulses, wpm, baseFreq);
                    }
                  }}
                  disabled={tok.pulses.length === 0}
                  className={`group flex flex-col items-center px-2.5 py-1.5 rounded border text-left transition-colors ${
                    tok.pulses.length > 0 ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isCurrent
                      ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 ring-1 ring-cyan-500'
                      : isInvalid
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40'
                      : tok.kind === 'parity'
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-cyan-500/60'
                  }`}
                >
                  <span
                    className={`text-xs font-medium leading-tight ${
                      isInvalid
                        ? 'text-rose-700 dark:text-rose-300'
                        : tok.kind === 'space' || tok.kind === 'newline' || tok.kind === 'tab'
                        ? 'text-slate-400 font-mono text-[10px]'
                        : tok.kind === 'parity'
                        ? 'text-amber-700 dark:text-amber-400 font-mono text-[10px]'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {displayChar}
                  </span>
                  <span className="mt-1 font-mono text-xs tracking-wider text-cyan-800 dark:text-cyan-300 flex items-center gap-1">
                    {tok.rawAmc}
                    {tok.pulses.length > 0 && (
                      <Volume2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                    )}
                  </span>
                  {tok.kind === 'unicode-escape' && (
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                      UTF-4
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
