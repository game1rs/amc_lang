export type Pulse = '·' | '−' | '═' | '~';

export type CodexCategory =
  | 'Letters'
  | 'Numbers'
  | 'Punctuation'
  | 'Math & Logic'
  | 'Symbols & Currency';

export interface CodexEntry {
  char: string;
  label: string;
  amc: string;
  category: CodexCategory;
}

export interface AmcOptions {
  caseSensitive: boolean;
  cipherKey: string;
  includeParity: boolean;
}

export interface DecodedToken {
  index: number;
  rawAmc: string;
  baseAmc: string;
  char: string;
  pulses: Pulse[];
  kind: 'char' | 'space' | 'newline' | 'tab' | 'unicode-escape' | 'parity' | 'unknown';
  valid: boolean;
}

export interface EncodeResult {
  amc: string;
  tokens: DecodedToken[];
  pulseCount: number;
  unitCount: number;
  parityCode: string | null;
}

export interface DecodeResult {
  text: string;
  tokens: DecodedToken[];
  invalidTokens: number[];
  parityStatus: 'none' | 'verified' | 'mismatch' | 'missing';
  expectedParity: string | null;
  receivedParity: string | null;
}

export const PULSE_RING: readonly Pulse[] = ['·', '−', '═', '~'] as const;

export const PULSE_UNITS: Record<Pulse, number> = {
  '·': 1,
  '−': 3,
  '═': 5,
  '~': 2,
};

export const PULSE_META: Record<
  Pulse,
  { name: string; ascii: string; units: number; description: string }
> = {
  '·': {
    name: 'Short Dit',
    ascii: '.',
    units: 1,
    description: '1u crisp carrier pulse',
  },
  '−': {
    name: 'Standard Dah',
    ascii: '-',
    units: 3,
    description: '3u sustained carrier pulse',
  },
  '═': {
    name: 'Harmonic Long',
    ascii: '=',
    units: 5,
    description: '5u dual-tone fifth harmonic',
  },
  '~': {
    name: 'FM Chirp',
    ascii: '~',
    units: 2,
    description: '2u rising frequency sweep',
  },
};

/**
 * Primary AMC Dictionary (strictly distinct from International Morse).
 * Rules guaranteeing 100% bijective zero-collision decoding:
 * - No entry starts with '═~' (reserved for Uppercase Shift: ═~ + lowercase)
 * - No entry starts with '~═~' (reserved for Unicode Base-4 Escape: ~═~ + base4)
 */
const BASE_ENTRIES: CodexEntry[] = [
  // Lowercase Letters (a-z): 2-3 pulse quaternary glyphs, none starting with ═~ or ~═~
  { char: 'a', label: 'Lowercase a', amc: '−~', category: 'Letters' },
  { char: 'b', label: 'Lowercase b', amc: '═·−', category: 'Letters' },
  { char: 'c', label: 'Lowercase c', amc: '~−·', category: 'Letters' },
  { char: 'd', label: 'Lowercase d', amc: '−═·', category: 'Letters' },
  { char: 'e', label: 'Lowercase e', amc: '~·', category: 'Letters' },
  { char: 'f', label: 'Lowercase f', amc: '·~═', category: 'Letters' },
  { char: 'g', label: 'Lowercase g', amc: '══·', category: 'Letters' },
  { char: 'h', label: 'Lowercase h', amc: '·−~', category: 'Letters' },
  { char: 'i', label: 'Lowercase i', amc: '·═', category: 'Letters' },
  { char: 'j', label: 'Lowercase j', amc: '~~═', category: 'Letters' },
  { char: 'k', label: 'Lowercase k', amc: '═−~', category: 'Letters' },
  { char: 'l', label: 'Lowercase l', amc: '·═~', category: 'Letters' },
  { char: 'm', label: 'Lowercase m', amc: '−═−', category: 'Letters' },
  { char: 'n', label: 'Lowercase n', amc: '~−', category: 'Letters' },
  { char: 'o', label: 'Lowercase o', amc: '═·', category: 'Letters' },
  { char: 'p', label: 'Lowercase p', amc: '·~~', category: 'Letters' },
  { char: 'q', label: 'Lowercase q', amc: '══~', category: 'Letters' },
  { char: 'r', label: 'Lowercase r', amc: '−~·', category: 'Letters' },
  { char: 's', label: 'Lowercase s', amc: '~~·', category: 'Letters' },
  { char: 't', label: 'Lowercase t', amc: '═−', category: 'Letters' },
  { char: 'u', label: 'Lowercase u', amc: '·═−', category: 'Letters' },
  { char: 'v', label: 'Lowercase v', amc: '~═·', category: 'Letters' },
  { char: 'w', label: 'Lowercase w', amc: '−~═', category: 'Letters' },
  { char: 'x', label: 'Lowercase x', amc: '═·═', category: 'Letters' },
  { char: 'y', label: 'Lowercase y', amc: '~~−', category: 'Letters' },
  { char: 'z', label: 'Lowercase z', amc: '═−═', category: 'Letters' },

  // Numbers (0-9): 4-pulse sequences starting with ·· or ·−
  { char: '0', label: 'Digit 0', amc: '··══', category: 'Numbers' },
  { char: '1', label: 'Digit 1', amc: '···~', category: 'Numbers' },
  { char: '2', label: 'Digit 2', amc: '··~·', category: 'Numbers' },
  { char: '3', label: 'Digit 3', amc: '··−~', category: 'Numbers' },
  { char: '4', label: 'Digit 4', amc: '··═−', category: 'Numbers' },
  { char: '5', label: 'Digit 5', amc: '·−·═', category: 'Numbers' },
  { char: '6', label: 'Digit 6', amc: '·−~·', category: 'Numbers' },
  { char: '7', label: 'Digit 7', amc: '·−═~', category: 'Numbers' },
  { char: '8', label: 'Digit 8', amc: '·−══', category: 'Numbers' },
  { char: '9', label: 'Digit 9', amc: '·−~~', category: 'Numbers' },

  // Punctuation (4-pulse sequences)
  { char: '.', label: 'Period', amc: '−··═', category: 'Punctuation' },
  { char: ',', label: 'Comma', amc: '−·~·', category: 'Punctuation' },
  { char: '?', label: 'Question Mark', amc: '·~·═', category: 'Punctuation' },
  { char: '!', label: 'Exclamation', amc: '═··~', category: 'Punctuation' },
  { char: ':', label: 'Colon', amc: '−−═·', category: 'Punctuation' },
  { char: ';', label: 'Semicolon', amc: '−−~·', category: 'Punctuation' },
  { char: "'", label: 'Apostrophe', amc: '·~−·', category: 'Punctuation' },
  { char: '"', label: 'Double Quote', amc: '·~−═', category: 'Punctuation' },
  { char: '-', label: 'Hyphen / Minus', amc: '−−·~', category: 'Punctuation' },
  { char: '_', label: 'Underscore', amc: '−−═~', category: 'Punctuation' },
  { char: '/', label: 'Forward Slash', amc: '−~·═', category: 'Punctuation' },
  { char: '\\', label: 'Backslash', amc: '−~═·', category: 'Punctuation' },
  { char: '(', label: 'Left Paren', amc: '·═·~', category: 'Punctuation' },
  { char: ')', label: 'Right Paren', amc: '·═~·', category: 'Punctuation' },
  { char: '[', label: 'Left Bracket', amc: '·═−~', category: 'Punctuation' },
  { char: ']', label: 'Right Bracket', amc: '·═~−', category: 'Punctuation' },
  { char: '{', label: 'Left Brace', amc: '═·−~', category: 'Punctuation' },
  { char: '}', label: 'Right Brace', amc: '═·~−', category: 'Punctuation' },
  { char: '…', label: 'Ellipsis', amc: '−···═', category: 'Punctuation' },
  { char: '—', label: 'Em Dash', amc: '−−−~', category: 'Punctuation' },
  { char: '–', label: 'En Dash', amc: '−−·═', category: 'Punctuation' },

  // Math & Logic Symbols (4-5 pulse sequences)
  { char: '+', label: 'Plus', amc: '−═·~', category: 'Math & Logic' },
  { char: '=', label: 'Equals', amc: '═−·═', category: 'Math & Logic' },
  { char: '*', label: 'Asterisk / Multiply', amc: '~·═−', category: 'Math & Logic' },
  { char: '<', label: 'Less Than', amc: '~−·═', category: 'Math & Logic' },
  { char: '>', label: 'Greater Than', amc: '~−═·', category: 'Math & Logic' },
  { char: '%', label: 'Percent', amc: '·~═~', category: 'Math & Logic' },
  { char: '^', label: 'Caret / Power', amc: '~·~═', category: 'Math & Logic' },
  { char: '|', label: 'Pipe / Vertical Bar', amc: '═−═~', category: 'Math & Logic' },
  { char: '~', label: 'Tilde', amc: '~~·~', category: 'Math & Logic' },
  { char: '±', label: 'Plus-Minus', amc: '−═~═', category: 'Math & Logic' },
  { char: '×', label: 'Multiplication Sign', amc: '~··═−', category: 'Math & Logic' },
  { char: '÷', label: 'Division Sign', amc: '~·−═·', category: 'Math & Logic' },
  { char: '≠', label: 'Not Equal', amc: '═−~═', category: 'Math & Logic' },
  { char: '≈', label: 'Approximately Equal', amc: '═~~═', category: 'Math & Logic' },
  { char: '≤', label: 'Less or Equal', amc: '~−·═−', category: 'Math & Logic' },
  { char: '≥', label: 'Greater or Equal', amc: '~−═−·', category: 'Math & Logic' },
  { char: '∞', label: 'Infinity', amc: '══~══', category: 'Math & Logic' },
  { char: '√', label: 'Square Root', amc: '·~══·', category: 'Math & Logic' },
  { char: '°', label: 'Degree', amc: '·═··~', category: 'Math & Logic' },

  // Symbols & Currency
  { char: '@', label: 'At Sign', amc: '═·~═', category: 'Symbols & Currency' },
  { char: '#', label: 'Hash / Octothorpe', amc: '══·−', category: 'Symbols & Currency' },
  { char: '$', label: 'Dollar Sign', amc: '══−~', category: 'Symbols & Currency' },
  { char: '&', label: 'Ampersand', amc: '−═−~', category: 'Symbols & Currency' },
  { char: '`', label: 'Backtick', amc: '·~~·', category: 'Symbols & Currency' },
  { char: '€', label: 'Euro Sign', amc: '══−·~', category: 'Symbols & Currency' },
  { char: '£', label: 'Pound Sterling', amc: '══·−~', category: 'Symbols & Currency' },
  { char: '¥', label: 'Yen / Yuan', amc: '══~·−', category: 'Symbols & Currency' },
  { char: '§', label: 'Section Sign', amc: '−~══·', category: 'Symbols & Currency' },
  { char: '¶', label: 'Pilcrow', amc: '−~═−·', category: 'Symbols & Currency' },
  { char: '•', label: 'Bullet', amc: '·~··═', category: 'Symbols & Currency' },
  { char: '©', label: 'Copyright', amc: '═·═~·', category: 'Symbols & Currency' },
  { char: '®', label: 'Registered', amc: '═·═−~', category: 'Symbols & Currency' },
  { char: '™', label: 'Trademark', amc: '═−·~═', category: 'Symbols & Currency' },
];

// Build Uppercase A-Z as Harmonic Shift (═~) + lowercase glyph
const UPPERCASE_ENTRIES: CodexEntry[] = BASE_ENTRIES.filter(
  (e) => e.category === 'Letters'
).map((e) => ({
  char: e.char.toUpperCase(),
  label: `Uppercase ${e.char.toUpperCase()}`,
  amc: `═~${e.amc}`,
  category: 'Letters' as CodexCategory,
}));

export const FULL_CODEX: CodexEntry[] = [
  ...BASE_ENTRIES.filter((e) => e.category === 'Letters'),
  ...UPPERCASE_ENTRIES,
  ...BASE_ENTRIES.filter((e) => e.category !== 'Letters'),
];

const CHAR_TO_AMC = new Map<string, string>();
const AMC_TO_CHAR = new Map<string, string>();

for (const entry of FULL_CODEX) {
  if (CHAR_TO_AMC.has(entry.char)) {
    throw new Error(`Duplicate character in AMC codex: ${entry.char}`);
  }
  if (AMC_TO_CHAR.has(entry.amc)) {
    throw new Error(
      `Collision in AMC codex: ${entry.amc} mapped to both ${AMC_TO_CHAR.get(entry.amc)} and ${entry.char}`
    );
  }
  CHAR_TO_AMC.set(entry.char, entry.amc);
  AMC_TO_CHAR.set(entry.amc, entry.char);
}

/**
 * Normalizes keyboard-friendly ASCII aliases (., -, =, ~) into canonical AMC glyphs (·, −, ═, ~).
 */
export function normalizeAmcInput(raw: string): string {
  return raw
    .replace(/[.*•]/g, '·')
    .replace(/[-_–—]/g, '−')
    .replace(/[=]/g, '═')
    .replace(/[~^]/g, '~');
}

export function isPulse(ch: string): ch is Pulse {
  return ch === '·' || ch === '−' || ch === '═' || ch === '~';
}

export function splitPulses(amcToken: string): Pulse[] {
  const out: Pulse[] = [];
  for (const ch of amcToken) {
    if (isPulse(ch)) out.push(ch);
  }
  return out;
}

function hashKey(key: string): number {
  const trimmed = key.trim();
  if (!trimmed) return 0;
  // If purely numeric, use value directly (so key "1" gives deterministic offset 1)
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) || 0;
  }
  let hash = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function rotateToken(
  token: string,
  tokenIndex: number,
  keyHash: number,
  direction: 1 | -1
): string {
  if (keyHash === 0) return token;
  let out = '';
  let pPos = 0;
  for (const ch of token) {
    if (isPulse(ch)) {
      const idx = PULSE_RING.indexOf(ch);
      const shift = (keyHash + tokenIndex * 3 + pPos) % 4;
      const nextIdx = (idx + direction * shift + 400) % 4;
      out += PULSE_RING[nextIdx];
      pPos++;
    } else {
      out += ch;
    }
  }
  return out;
}

function encodeUnicodeEscape(char: string): string {
  const cp = char.codePointAt(0) ?? 0;
  const base4 = cp.toString(4);
  let pulses = '~═~';
  for (const digit of base4) {
    pulses += PULSE_RING[parseInt(digit, 10)];
  }
  return pulses;
}

function decodeUnicodeEscape(amc: string): string | null {
  if (!amc.startsWith('~═~') || amc.length <= 3) return null;
  const body = amc.slice(3);
  let base4 = '';
  for (const ch of body) {
    if (!isPulse(ch)) return null;
    base4 += PULSE_RING.indexOf(ch).toString();
  }
  const cp = parseInt(base4, 4);
  if (Number.isNaN(cp) || cp < 0 || cp > 0x10ffff) return null;
  try {
    return String.fromCodePoint(cp);
  } catch {
    return null;
  }
}

/**
 * Computes a deterministic 4-pulse CRC checksum over base AMC tokens.
 */
function computeParity(baseTokens: string[]): string {
  let acc = 0x5a;
  for (let i = 0; i < baseTokens.length; i++) {
    const tok = baseTokens[i];
    for (let j = 0; j < tok.length; j++) {
      acc = (acc * 31 + tok.charCodeAt(j) + i * 7 + j) & 0xff;
    }
  }
  let out = '';
  for (let k = 0; k < 4; k++) {
    const nibble = (acc >> (k * 2)) & 0x03;
    out += PULSE_RING[nibble];
  }
  return out;
}

export function encodeEnglishToAmc(input: string, options: AmcOptions): EncodeResult {
  if (!input) {
    return {
      amc: '',
      tokens: [],
      pulseCount: 0,
      unitCount: 0,
      parityCode: null,
    };
  }

  const keyHash = hashKey(options.cipherKey);
  const chars = Array.from(input);
  const tokens: DecodedToken[] = [];
  const basePulseTokensForParity: string[] = [];
  const formattedParts: string[] = [];

  let pulseCount = 0;
  let unitCount = 0;

  chars.forEach((rawChar, index) => {
    if (rawChar === ' ') {
      tokens.push({
        index,
        rawAmc: '/',
        baseAmc: '/',
        char: ' ',
        pulses: [],
        kind: 'space',
        valid: true,
      });
      formattedParts.push('/');
      unitCount += 7; // standard word gap
      return;
    }
    if (rawChar === '\n') {
      tokens.push({
        index,
        rawAmc: '///',
        baseAmc: '///',
        char: '\n',
        pulses: [],
        kind: 'newline',
        valid: true,
      });
      formattedParts.push('///');
      unitCount += 10;
      return;
    }
    if (rawChar === '\t') {
      tokens.push({
        index,
        rawAmc: '//',
        baseAmc: '//',
        char: '\t',
        pulses: [],
        kind: 'tab',
        valid: true,
      });
      formattedParts.push('//');
      unitCount += 8;
      return;
    }

    const lookupChar = options.caseSensitive ? rawChar : rawChar.toLowerCase();
    let baseAmc = CHAR_TO_AMC.get(lookupChar);
    let isEscape = false;

    if (!baseAmc) {
      baseAmc = encodeUnicodeEscape(lookupChar);
      isEscape = true;
    }

    basePulseTokensForParity.push(baseAmc);
    const transformed = rotateToken(baseAmc, index, keyHash, 1);
    const pulses = splitPulses(transformed);

    pulseCount += pulses.length;
    unitCount +=
      pulses.reduce((sum, p) => sum + PULSE_UNITS[p], 0) +
      Math.max(0, pulses.length - 1) + // 1u intra-char spacing
      3; // 3u inter-char spacing

    tokens.push({
      index,
      rawAmc: transformed,
      baseAmc,
      char: lookupChar,
      pulses,
      kind: isEscape ? 'unicode-escape' : 'char',
      valid: true,
    });
    formattedParts.push(transformed);
  });

  let parityCode: string | null = null;
  if (options.includeParity && basePulseTokensForParity.length > 0) {
    parityCode = computeParity(basePulseTokensForParity);
    formattedParts.push(`:: ${parityCode}`);
    tokens.push({
      index: chars.length,
      rawAmc: parityCode,
      baseAmc: parityCode,
      char: '',
      pulses: splitPulses(parityCode),
      kind: 'parity',
      valid: true,
    });
  }

  return {
    amc: formattedParts.join(' '),
    tokens,
    pulseCount,
    unitCount,
    parityCode,
  };
}

export function decodeAmcToEnglish(rawInput: string, options: AmcOptions): DecodeResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      text: '',
      tokens: [],
      invalidTokens: [],
      parityStatus: 'none',
      expectedParity: null,
      receivedParity: null,
    };
  }

  // Extract optional parity suffix `:: <pulses>`
  let bodyStr = trimmed;
  let receivedParity: string | null = null;
  const parityIdx = trimmed.lastIndexOf('::');
  if (parityIdx !== -1) {
    bodyStr = trimmed.slice(0, parityIdx).trim();
    receivedParity = normalizeAmcInput(trimmed.slice(parityIdx + 2).trim());
  }

  const normalized = normalizeAmcInput(bodyStr);
  const rawParts = normalized.split(/\s+/).filter(Boolean);
  const keyHash = hashKey(options.cipherKey);

  const tokens: DecodedToken[] = [];
  const invalidTokens: number[] = [];
  const basePulseTokensForParity: string[] = [];
  let textOut = '';

  rawParts.forEach((rawToken, index) => {
    if (rawToken === '/') {
      tokens.push({
        index,
        rawAmc: '/',
        baseAmc: '/',
        char: ' ',
        pulses: [],
        kind: 'space',
        valid: true,
      });
      textOut += ' ';
      return;
    }
    if (rawToken === '//') {
      tokens.push({
        index,
        rawAmc: '//',
        baseAmc: '//',
        char: '\t',
        pulses: [],
        kind: 'tab',
        valid: true,
      });
      textOut += '\t';
      return;
    }
    if (rawToken === '///') {
      tokens.push({
        index,
        rawAmc: '///',
        baseAmc: '///',
        char: '\n',
        pulses: [],
        kind: 'newline',
        valid: true,
      });
      textOut += '\n';
      return;
    }

    // Check all characters in token are valid pulses
    const allValidPulses = Array.from(rawToken).every((ch) => isPulse(ch));
    if (!allValidPulses) {
      invalidTokens.push(index);
      tokens.push({
        index,
        rawAmc: rawToken,
        baseAmc: rawToken,
        char: '\uFFFD',
        pulses: splitPulses(rawToken),
        kind: 'unknown',
        valid: false,
      });
      textOut += '\uFFFD';
      return;
    }

    const baseAmc = rotateToken(rawToken, index, keyHash, -1);
    basePulseTokensForParity.push(baseAmc);

    let decodedChar = AMC_TO_CHAR.get(baseAmc);
    let kind: DecodedToken['kind'] = 'char';

    if (!decodedChar && baseAmc.startsWith('~═~')) {
      const escaped = decodeUnicodeEscape(baseAmc);
      if (escaped !== null) {
        decodedChar = escaped;
        kind = 'unicode-escape';
      }
    }

    if (!decodedChar) {
      invalidTokens.push(index);
      tokens.push({
        index,
        rawAmc: rawToken,
        baseAmc,
        char: '\uFFFD',
        pulses: splitPulses(rawToken),
        kind: 'unknown',
        valid: false,
      });
      textOut += '\uFFFD';
      return;
    }

    if (!options.caseSensitive && /^[A-Z]$/.test(decodedChar)) {
      decodedChar = decodedChar.toLowerCase();
    }

    tokens.push({
      index,
      rawAmc: rawToken,
      baseAmc,
      char: decodedChar,
      pulses: splitPulses(rawToken),
      kind,
      valid: true,
    });
    textOut += decodedChar;
  });

  let parityStatus: DecodeResult['parityStatus'] = 'none';
  let expectedParity: string | null = null;

  if (basePulseTokensForParity.length > 0) {
    expectedParity = computeParity(basePulseTokensForParity);
    if (receivedParity !== null) {
      parityStatus = receivedParity === expectedParity ? 'verified' : 'mismatch';
    } else if (options.includeParity) {
      parityStatus = 'missing';
    }
  }

  return {
    text: textOut,
    tokens,
    invalidTokens,
    parityStatus,
    expectedParity,
    receivedParity,
  };
}
