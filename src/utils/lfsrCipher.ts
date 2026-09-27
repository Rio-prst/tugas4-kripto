import { CipherError } from '@/lib/cipherError';

export interface LfsrStep {
  id: number;
  /** The input character when encrypting, the decoded byte when decrypting. */
  char: string;
  /** The input byte in 8-bit binary, which is what the keystream is XORed with. */
  charBinary: string;
  keystreamBinary: string;
  xorResultBinary: string;
  /** The XORed byte as two lowercase hex digits. Always populated. */
  resultByteHex: string;
  /**
   * The XORed byte decoded back to a character. Not printable when the byte
   * lands outside the visible range, which is why hex is the primary output.
   */
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

export function processLFSR(
  text: string,
  seed: string,
  mode: 'encrypt' | 'decrypt'
): LfsrResult {
  const steps: LfsrStep[] = [];

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

  // Per the guide in docs/LFSR.md: the state is written b_n ... b1, the
  // keystream bit is b1 (the rightmost bit), and the feedback is b1 XOR b_n,
  // so the second tap is the leftmost bit rather than the next one over.
  const outputTap = currentSeed.length - 1; // b1, rightmost
  const feedbackTap = 0; // b_n, leftmost

  const maxPeriod = Math.pow(2, initialSeed.length) - 1;
  const visited = new Map<string, number>();
  visited.set(initialSeed, 0);

  let shiftCount = 0;
  let cycleLength: number | null = null;
  let returnedToSeedAt: number | null = null;

  // The XOR runs on bytes either way. Only the way bytes enter the cipher
  // differs, which is why the mode exists: the app hands the ciphertext to the
  // browser as hex, so decrypting has to read that hex back into bytes first.
  const isDecrypt = mode === 'decrypt';
  const inputBytes: number[] = [];

  if (isDecrypt) {
    const compact = text.replace(/\s+/g, '');
    if (compact.length === 0 || !/^[0-9a-fA-F]+$/.test(compact)) {
      throw new CipherError('CIPHERTEXT_NOT_HEX');
    }
    if (compact.length % 2 !== 0) {
      throw new CipherError(
        'CIPHERTEXT_NOT_HEX',
        `The ciphertext has ${compact.length} hex digits, which is not a whole number of bytes.`
      );
    }
    for (let i = 0; i < compact.length; i += 2) {
      inputBytes.push(parseInt(compact.slice(i, i + 2), 16));
    }
  } else {
    for (let i = 0; i < text.length; i++) {
      inputBytes.push(text.charCodeAt(i));
    }
  }

  let resultText = '';

  for (let i = 0; i < inputBytes.length; i++) {
    const byte = inputBytes[i];
    const charBinary = byte.toString(2).padStart(8, '0');

    let keystreamBinary = '';
    const shiftDetails: LfsrStep['shiftDetails'] = [];

    // Generate 8 bits of keystream for this byte
    for (let b = 0; b < 8; b++) {
      const stateBefore = currentSeed;
      const bit1 = parseInt(currentSeed[outputTap]);
      const bit2 = parseInt(currentSeed[feedbackTap]);
      const newBit = (bit1 ^ bit2).toString();

      const outBit = currentSeed[outputTap];
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

    // Vernam Cipher (XOR the input byte with the keystream)
    let xorResultBinary = '';
    for (let bit = 0; bit < 8; bit++) {
      xorResultBinary += (
        parseInt(charBinary[bit]) ^ parseInt(keystreamBinary[bit])
      ).toString();
    }

    const xoredByte = parseInt(xorResultBinary, 2);
    const resultByteHex = xoredByte.toString(16).padStart(2, '0');

    if (isDecrypt) {
      // The recovered byte is readable, so hand back the character.
      resultText += String.fromCharCode(xoredByte);
    } else {
      // Hex is the representation layer, so the output stays safe to copy.
      resultText += resultByteHex;
    }

    steps.push({
      id: i,
      char: String.fromCharCode(byte),
      charBinary,
      keystreamBinary,
      xorResultBinary,
      resultByteHex,
      resultChar: String.fromCharCode(xoredByte),
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
