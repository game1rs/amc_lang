import React from 'react';
import { Volume2 } from 'lucide-react';
import { PULSE_META, Pulse } from '../lib/amcCodec';
import { amcAudio } from '../lib/amcAudio';

interface SpecViewProps {
  wpm: number;
  baseFreq: number;
}

export const SpecView: React.FC<SpecViewProps> = ({ wpm, baseFreq }) => {
  const primitives: Pulse[] = ['·', '−', '═', '~'];

  return (
    <div className="space-y-5">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Quaternary 4-Pulse Signal Architecture
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Unlike standard International Morse Code, which relies on a binary 2-state alphabet (dot and dash) with limited punctuation and no case sensitivity, Advanced Morse Code (AMC) encodes characters into a 4-state quaternary pulse system combining duration, harmonic superposition, and frequency-modulated chirps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {primitives.map((p) => {
            const meta = PULSE_META[p];
            return (
              <div
                key={p}
                className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {p}
                    </span>
                    <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                      {meta.units} unit{meta.units > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {meta.name}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {meta.description}. ASCII shorthand:{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {meta.ascii}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => amcAudio.playSinglePulse(p, wpm, baseFreq)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline w-fit cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Audition Tone</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Structural Framing & Lossless Symbols
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <li>
              <strong className="text-slate-900 dark:text-slate-200">Word & Line Delimiters:</strong>{' '}
              Single spaces encode as <span className="font-mono text-slate-900 dark:text-slate-100">/</span>, tabs as{' '}
              <span className="font-mono text-slate-900 dark:text-slate-100">//</span>, and line breaks as{' '}
              <span className="font-mono text-slate-900 dark:text-slate-100">///</span>. Individual character frames are separated by a single space.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-slate-200">Case Preservation:</strong>{' '}
              Lowercase letters <span className="font-mono">a–z</span> use compact 2–3 pulse glyphs distinct from International Morse. Uppercase <span className="font-mono">A–Z</span> prepend the reserved harmonic shift prefix{' '}
              <span className="font-mono text-cyan-700 dark:text-cyan-400">═~</span> when Preserve Case is active.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-slate-200">Universal Unicode Escape:</strong>{' '}
              Beyond the 100+ built-in punctuation, math, logic, and currency symbols, any arbitrary Unicode character is encoded as{' '}
              <span className="font-mono text-cyan-700 dark:text-cyan-400">~═~</span> followed by its base-4 quaternary code point, ensuring 100% lossless round-trip translation.
            </li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Rotor Encryption & CRC-4 Integrity
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <li>
              <strong className="text-slate-900 dark:text-slate-200">Positional Rotor Key:</strong>{' '}
              Entering a numeric or text Rotor Key dynamically rotates every pulse across the 4-state ring{' '}
              <span className="font-mono">({'· → − → ═ → ~'})</span> based on key hash, frame index, and intra-character pulse offset. Both sender and receiver must share the same Rotor Key to decode.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-slate-200">CRC-4 Parity Frame:</strong>{' '}
              When enabled, a 4-pulse checksum (<span className="font-mono">:: ·~−═</span>) is appended to the stream. During AMC-to-English decoding, Signalbench validates the checksum and alerts immediately if any pulse was altered or dropped.
            </li>
            <li>
              <strong className="text-slate-900 dark:text-slate-200">Keyboard Shorthand:</strong>{' '}
              When typing or pasting into AMC-to-English mode, standard ASCII characters{' '}
              <span className="font-mono">.</span>, <span className="font-mono">-</span>,{' '}
              <span className="font-mono">=</span>, and <span className="font-mono">~</span> automatically normalize to canonical AMC pulses.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
