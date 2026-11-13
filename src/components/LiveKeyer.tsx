import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Delete, RotateCcw, Space, Volume2 } from 'lucide-react';
import {
  AmcOptions,
  decodeAmcToEnglish,
  FULL_CODEX,
  PULSE_META,
  Pulse,
} from '../lib/amcCodec';
import { amcAudio } from '../lib/amcAudio';

interface LiveKeyerProps {
  options: AmcOptions;
  wpm: number;
  baseFreq: number;
  onSendToTranslator: (amcStream: string) => void;
}

const KEY_SHORTCUTS: Record<string, Pulse> = {
  '1': '·',
  '.': '·',
  '2': '−',
  '-': '−',
  '3': '═',
  '=': '═',
  '4': '~',
  '~': '~',
};

export const LiveKeyer: React.FC<LiveKeyerProps> = ({
  options,
  wpm,
  baseFreq,
  onSendToTranslator,
}) => {
  const [buffer, setBuffer] = useState<string>('');
  const [keyboardEnabled, setKeyboardEnabled] = useState<boolean>(true);
  const [activeKey, setActiveKey] = useState<Pulse | null>(null);

  const decoded = useMemo(
    () => decodeAmcToEnglish(buffer, options),
    [buffer, options]
  );

  // Extract the current trailing token being keyed so we can show live candidate matches
  const currentFragment = useMemo(() => {
    if (!buffer || buffer.endsWith(' ')) return '';
    const parts = buffer.split(/\s+/);
    return parts[parts.length - 1] ?? '';
  }, [buffer]);

  const matchingCandidates = useMemo(() => {
    if (!currentFragment || options.cipherKey.trim()) return [];
    return FULL_CODEX.filter((entry) =>
      entry.amc.startsWith(currentFragment)
    ).slice(0, 8);
  }, [currentFragment, options.cipherKey]);

  const triggerPulse = (pulse: Pulse) => {
    setActiveKey(pulse);
    setTimeout(() => setActiveKey(null), 130);
    amcAudio.playSinglePulse(pulse, wpm, baseFreq);
    setBuffer((prev) => prev + pulse);
  };

  const handleSpace = () => {
    setBuffer((prev) => {
      if (!prev || prev.endsWith(' ')) return prev;
      return prev + ' ';
    });
  };

  const handleWordBreak = () => {
    setBuffer((prev) => {
      if (!prev) return '/';
      if (prev.endsWith(' / ')) return prev;
      return prev.trimEnd() + ' / ';
    });
  };

  const handleNewline = () => {
    setBuffer((prev) => {
      if (!prev) return '/// ';
      return prev.trimEnd() + ' /// ';
    });
  };

  const handleBackspace = () => {
    setBuffer((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    if (!keyboardEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (KEY_SHORTCUTS[e.key]) {
        e.preventDefault();
        triggerPulse(KEY_SHORTCUTS[e.key]);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleSpace();
      } else if (e.key === '/') {
        e.preventDefault();
        handleWordBreak();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleNewline();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const pulses: Array<{ pulse: Pulse; shortcut: string }> = [
    { pulse: '·', shortcut: '1 or .' },
    { pulse: '−', shortcut: '2 or -' },
    { pulse: '═', shortcut: '3 or =' },
    { pulse: '~', shortcut: '4 or ~' },
  ];

  return (
    <div className="space-y-5">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              4-Pulse Telegraph Keyer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tap the quaternary keys below or use your keyboard to compose AMC pulses with live audio and decoding.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keyboardEnabled}
              onChange={(e) => setKeyboardEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
            />
            <span>Keyboard Shortcuts Active</span>
          </label>
        </div>

        {/* 4 Primary Quaternary Key Pads */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {pulses.map(({ pulse, shortcut }) => {
            const meta = PULSE_META[pulse];
            const isPressed = activeKey === pulse;
            return (
              <button
                key={pulse}
                type="button"
                onClick={() => triggerPulse(pulse)}
                className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all cursor-pointer select-none ${
                  isPressed
                    ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 scale-[0.98]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-cyan-500/70 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <div className="w-full flex items-baseline justify-between mb-2">
                  <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {pulse}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    Key {shortcut}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {meta.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {meta.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Structural Break & Edit Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSpace}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <Space className="w-3.5 h-3.5" />
            <span>Next Character (Space)</span>
          </button>
          <button
            type="button"
            onClick={handleWordBreak}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <span className="font-mono font-bold">/</span>
            <span>Word Break ( / )</span>
          </button>
          <button
            type="button"
            onClick={handleNewline}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <span className="font-mono font-bold">///</span>
            <span>New Line (Enter)</span>
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={!buffer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
          >
            <Delete className="w-3.5 h-3.5" />
            <span>Backspace</span>
          </button>
          <button
            type="button"
            onClick={() => setBuffer('')}
            disabled={!buffer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </section>

      {/* Live Candidate Predictor & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Keyed AMC Stream
            </span>
            <button
              type="button"
              onClick={() => {
                if (decoded.tokens.length > 0) {
                  amcAudio.playSequence(decoded.tokens, {
                    wpm,
                    baseFreq,
                    onState: () => {},
                    onComplete: () => {},
                  });
                }
              }}
              disabled={!buffer.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline disabled:opacity-40 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audition Stream</span>
            </button>
          </div>
          <div className="flex-1 min-h-[110px] p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-base tracking-wider text-slate-900 dark:text-slate-100 break-words whitespace-pre-wrap">
            {buffer || (
              <span className="text-slate-400 text-xs font-sans">
                Waiting for pulse input...
              </span>
            )}
          </div>

          {/* Candidate Matches for Current Fragment */}
          {currentFragment && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Matching glyphs for <span className="font-mono text-slate-800 dark:text-slate-200">{currentFragment}</span>:
              </div>
              {matchingCandidates.length === 0 ? (
                <div className="text-xs text-slate-400">
                  No direct dictionary match (press Space if complete, or continue keying).
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {matchingCandidates.map((cand) => (
                    <button
                      key={cand.char}
                      type="button"
                      onClick={() => {
                        const parts = buffer.split(/\s+/);
                        parts[parts.length - 1] = cand.amc;
                        setBuffer(parts.join(' ') + ' ');
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-cyan-500 text-xs cursor-pointer"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {cand.char}
                      </span>
                      <span className="font-mono text-cyan-700 dark:text-cyan-400">
                        {cand.amc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Live Decoded English
            </span>
            <button
              type="button"
              onClick={() => onSendToTranslator(buffer)}
              disabled={!buffer.trim()}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline disabled:opacity-40 cursor-pointer"
            >
              <span>Open in Translator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 min-h-[110px] p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[15px] text-slate-900 dark:text-slate-100 break-words whitespace-pre-wrap">
            {decoded.text || (
              <span className="text-slate-400 text-xs">
                Decoded characters appear here as you commit spaces.
              </span>
            )}
          </div>
          {decoded.invalidTokens.length > 0 && (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-mono">
              ▲ {decoded.invalidTokens.length} incomplete or unrecognized frame(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
