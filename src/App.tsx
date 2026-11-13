import { useEffect, useMemo, useState } from 'react';
import { Moon, Play, Square, Sun } from 'lucide-react';
import {
  AmcOptions,
  DecodedToken,
  decodeAmcToEnglish,
  encodeEnglishToAmc,
} from './lib/amcCodec';
import { amcAudio, PlaybackState } from './lib/amcAudio';
import {
  TranslationDirection,
  TranslatorWorkspace,
} from './components/TranslatorWorkspace';
import { LiveKeyer } from './components/LiveKeyer';
import { CodexTable } from './components/CodexTable';
import { SpecView } from './components/SpecView';

type ActiveTab = 'translator' | 'keyer' | 'codex' | 'spec';

const IDLE_PLAYBACK: PlaybackState = {
  isPlaying: false,
  activeTokenIndex: null,
  activePulseIndex: null,
  activePulse: null,
  activeFreqHz: 0,
  harmonicFreqHz: 0,
  amplitude: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('translator');
  const [direction, setDirection] = useState<TranslationDirection>('en-to-amc');
  const [englishText, setEnglishText] = useState<string>(
    'Signal Check: 2026! Ready @ 99.4%?'
  );
  const [amcText, setAmcText] = useState<string>('');
  const [options, setOptions] = useState<AmcOptions>({
    caseSensitive: true,
    cipherKey: '',
    includeParity: true,
  });
  const [wpm, setWpm] = useState<number>(18);
  const [baseFreq, setBaseFreq] = useState<number>(680);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [playback, setPlayback] = useState<PlaybackState>(IDLE_PLAYBACK);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    return () => {
      amcAudio.stop();
    };
  }, []);

  const currentTokens = useMemo(() => {
    if (direction === 'en-to-amc') {
      return encodeEnglishToAmc(englishText, options).tokens;
    }
    return decodeAmcToEnglish(amcText, options).tokens;
  }, [direction, englishText, amcText, options]);

  const handlePlayTokens = (tokens: DecodedToken[]) => {
    const playable = tokens.filter(
      (t) =>
        t.kind !== 'unknown' &&
        (t.pulses.length > 0 ||
          t.kind === 'space' ||
          t.kind === 'newline' ||
          t.kind === 'tab')
    );
    if (playable.length === 0) return;

    amcAudio.playSequence(tokens, {
      wpm,
      baseFreq,
      onState: setPlayback,
      onComplete: () => setPlayback(IDLE_PLAYBACK),
    });
  };

  const handleStopPlayback = () => {
    amcAudio.stop();
    setPlayback(IDLE_PLAYBACK);
  };

  const handleInsertFromCodex = (char: string) => {
    setDirection('en-to-amc');
    setEnglishText((prev) => prev + char);
    setActiveTab('translator');
  };

  const handleSendKeyedToTranslator = (amcStream: string) => {
    setAmcText(amcStream);
    setDirection('amc-to-en');
    setActiveTab('translator');
  };

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'translator', label: 'Translator' },
    { id: 'keyer', label: 'Live Keyer' },
    { id: 'codex', label: 'AMC Codex' },
    { id: 'spec', label: 'Specification' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('translator')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Signalbench
          </button>

          {/* Zone 2: 4 concise single-line text nav links */}
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    active
                      ? 'text-slate-900 dark:text-white border-cyan-600'
                      : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            {playback.isPlaying ? (
              <button
                type="button"
                onClick={handleStopPlayback}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Signal</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePlayTokens(currentTokens)}
                disabled={currentTokens.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-cyan-700 hover:bg-slate-800 dark:hover:bg-cyan-600 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Signal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Focused Workspace Title & Unboxed Telemetry Metadata */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              Advanced Morse Code Translator
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Quaternary 4-Pulse Encoding</span>
              <span aria-hidden="true">·</span>
              <span>Full Punctuation & Math Symbols</span>
              <span aria-hidden="true">·</span>
              <span>Bidirectional Lossless Codec</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Surface</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Dark Surface</span>
              </>
            )}
          </button>
        </div>

        {activeTab === 'translator' && (
          <TranslatorWorkspace
            direction={direction}
            onDirectionChange={setDirection}
            englishText={englishText}
            onEnglishChange={setEnglishText}
            amcText={amcText}
            onAmcChange={setAmcText}
            options={options}
            onOptionsChange={setOptions}
            wpm={wpm}
            onWpmChange={setWpm}
            baseFreq={baseFreq}
            onBaseFreqChange={setBaseFreq}
            playback={playback}
            onPlayTokens={handlePlayTokens}
            onStopPlayback={handleStopPlayback}
            isDark={isDark}
          />
        )}

        {activeTab === 'keyer' && (
          <LiveKeyer
            options={options}
            wpm={wpm}
            baseFreq={baseFreq}
            onSendToTranslator={handleSendKeyedToTranslator}
          />
        )}

        {activeTab === 'codex' && (
          <CodexTable
            wpm={wpm}
            baseFreq={baseFreq}
            onInsertChar={handleInsertFromCodex}
          />
        )}

        {activeTab === 'spec' && <SpecView wpm={wpm} baseFreq={baseFreq} />}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Signalbench — Quaternary AMC Encoding & Acoustic Bench</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('codex')}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            >
              Browse Codex
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('spec')}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            >
              Protocol Specification
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
