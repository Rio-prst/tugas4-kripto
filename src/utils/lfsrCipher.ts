import { CipherError } from '@/lib/cipherError';

export interface LfsrStep {
  id: number;
  char: string;
  charBinary: string;
  keystreamBinary: string;
  xorResultBinary: string;
  resultChar: string;
  shiftDetails: {
    stateBefore: string;
    tapMath: string;
    newBit: string;
    stateAfter: string;
  }[];
}

export interface LfsrResult {
  resultText: string;
  steps: LfsrStep[];
  /** The seed after trimming, which is the state the register starts from. */
  seed: string;
  /** 2^L - 1, the longest period an L-bit LFSR of this kind can achieve. */
  maxPeriod: number;
  /** How many distinct register states were observed while generating the keystream. */
  observedStates: number;
  /**
   * Shifts taken before a state repeated, or null if no repeat happened during
   * this run. A maximal-length LFSR should reach maxPeriod.
   */
  cycleLength: number | null;
  /** Shift index at which the register first returned to the initial seed. */
  returnedToSeedAt: number | null;
}

export function processLFSR(text: string, seed: string): LfsrResult {
  const steps: LfsrStep[] = [];
  let resultText = '';

  const trimmed = seed.trim();
  if (/[^01]/.test(trimmed)) {
    throw new CipherError(
      'SEED_NOT_BINARY',
      `"${seed}" contains characters other than 0 and 1.`
    );
  }
  if (trimmed.length < 2) {
    throw new CipherError(
      'SEED_TOO_SHORT',
      `The seed has ${trimmed.length} bit(s), but at least 2 are needed for two distinct XOR taps.`
    );
  }
  if (!/1/.test(trimmed)) {
    throw new CipherError('SEED_ALL_ZERO', `The seed "${trimmed}" contains no 1.`);
  }

  const initialSeed = trimmed;
  let currentSeed = initialSeed;

  // We will use the two rightmost bits for the XOR tap (simplest visual LFSR)
  const tap1 = currentSeed.length - 1;
  const tap2 = currentSeed.length - 2;

  const maxPeriod = Math.pow(2, initialSeed.length) - 1;
  const visited = new Map<string, number>();
  visited.set(initialSeed, 0);

  let shiftCount = 0;
  let cycleLength: number | null = null;
  let returnedToSeedAt: number | null = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charBinary = char.charCodeAt(0).toString(2).padStart(8, '0');

    let keystreamBinary = '';
    const shiftDetails: LfsrStep['shiftDetails'] = [];

    // Generate 8 bits of keystream for this character
    for (let b = 0; b < 8; b++) {
      const stateBefore = currentSeed;
      const bit1 = parseInt(currentSeed[tap1]);
      const bit2 = parseInt(currentSeed[tap2]);
      const newBit = (bit1 ^ bit2).toString();

      const outBit = currentSeed[currentSeed.length - 1];
      keystreamBinary += outBit;

      // Shift right and insert new bit at the left
      currentSeed = newBit + currentSeed.substring(0, currentSeed.length - 1);

      shiftCount += 1;
      if (currentSeed === initialSeed && returnedToSeedAt === null) {
        returnedToSeedAt = shiftCount;
      }
      if (!visited.has(currentSeed) && cycleLength === null) {
        visited.set(currentSeed, shiftCount);
      } else if (visited.has(currentSeed) && cycleLength === null) {
        cycleLength = shiftCount - (visited.get(currentSeed) as number);
      }

      shiftDetails.push({
        stateBefore,
        tapMath: `${bit1} ⊕ ${bit2} = ${newBit}`,
        newBit,
        stateAfter: currentSeed,
      });
    }

    // Vernam Cipher (XOR Plaintext with Keystream)
    let xorResultBinary = '';
    for (let bit = 0; bit < 8; bit++) {
      xorResultBinary += (
        parseInt(charBinary[bit]) ^ parseInt(keystreamBinary[bit])
      ).toString();
    }

    const resultChar = String.fromCharCode(parseInt(xorResultBinary, 2));
    resultText += resultChar;

    steps.push({
      id: i,
      char,
      charBinary,
      keystreamBinary,
      xorResultBinary,
      resultChar,
      shiftDetails,
    });
  }

  return {
    resultText,
    steps,
    seed: initialSeed,
    maxPeriod,
    observedStates: visited.size,
    cycleLength,
    returnedToSeedAt,
  };
}
