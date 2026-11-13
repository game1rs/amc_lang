import React, { useMemo, useState } from 'react';
import { Search, Volume2 } from 'lucide-react';
import {
  CodexCategory,
  FULL_CODEX,
  PULSE_UNITS,
  splitPulses,
} from '../lib/amcCodec';
import { amcAudio } from '../lib/amcAudio';

interface CodexTableProps {
  wpm: number;
  baseFreq: number;
  onInsertChar: (char: string) => void;
}

const CATEGORIES: Array<'All' | CodexCategory> = [
  'All',
  'Letters',
  'Numbers',
  'Punctuation',
  'Math & Logic',
  'Symbols & Currency',
];

export const CodexTable: React.FC<CodexTableProps> = ({
  wpm,
  baseFreq,
  onInsertChar,
}) => {
  const [category, setCategory] = useState<'All' | CodexCategory>('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FULL_CODEX.filter((entry) => {
      if (category !== 'All' && entry.category !== category) return false;
      if (!q) return true;
      return (
        entry.char.toLowerCase().includes(q) ||
        entry.label.toLowerCase().includes(q) ||
        entry.amc.includes(q)
      );
    });
  }, [category, query]);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Advanced Morse Code (AMC) Codex
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {FULL_CODEX.length} calibrated characters and symbols. Click any entry to hear its pulse frame, or insert it into your message.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter character, name, or pulse..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 w-fit">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              category === cat
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Codex Grid */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-md">
          No glyphs match "{query}". Note that any unlisted Unicode symbol is still supported via automatic Base-4 framing (~═~).
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filtered.map((entry) => {
            const pulses = splitPulses(entry.amc);
            const units = pulses.reduce((s, p) => s + PULSE_UNITS[p], 0);
            return (
              <div
                key={entry.char}
                className="flex flex-col justify-between p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-cyan-500/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
                    {entry.char}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400">
                    {units}u
                  </span>
                </div>

                <div className="mt-2 font-mono text-sm tracking-wider text-cyan-700 dark:text-cyan-300 font-medium break-all">
                  {entry.amc}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => amcAudio.playToken(pulses, wpm, baseFreq)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 cursor-pointer"
                    title={`Play ${entry.label}`}
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Play</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onInsertChar(entry.char)}
                    className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Insert
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
