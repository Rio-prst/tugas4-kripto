import { CipherError } from '@/lib/cipherError';
import {
  AES_BLOCK_SIZE,
  decryptBlockWithTrace,
  encryptBlockWithTrace,
  expandKey,
  fromHex,
  roundsForKey,
  stateToMatrix,
  toHex,
  type RoundTrace,
} from '@/utils/rijndael';

export interface AesVisualStep {
  id: number;
  title: string;
  description: string;
  matrixBefore?: string[][];
  matrixKey?: string[][];
  matrixAfter?: string[][];
  extraInfo?: string;
}

/** One row per 16-byte block, so long inputs stay inspectable. */
export interface AesBlockSummary {
  index: number;
  inputHex: string;
  outputHex: string;
  /** True only for the block that carries the full round-by-round trace. */
  detailed: boolean;
}

export interface AesResult {
  resultText: string;
  steps: AesVisualStep[];
  blocks: AesBlockSummary[];
  mode: 'encrypt' | 'decrypt';
  keyBytes: number;
  rounds: number;
  blockCount: number;
  paddingBytes: number;
  /** Always 0 for now. ECB processes every block independently. */
  modeOfOperation: 'ECB';
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/** PKCS#7: always add between 1 and 16 bytes, even when the input divides evenly. */
function padPkcs7(data: Uint8Array): Uint8Array {
  const count = AES_BLOCK_SIZE - (data.length % AES_BLOCK_SIZE);
  const out = new Uint8Array(data.length + count);
  out.set(data);
  out.fill(count, data.length);
  return out;
}

function unpadPkcs7(data: Uint8Array): Uint8Array {
  if (data.length === 0 || data.length % AES_BLOCK_SIZE !== 0) {
    throw new CipherError('AES_DECRYPT_FAILED', 'The ciphertext length is not a whole number of blocks.');
  }
  const count = data[data.length - 1];
  if (count < 1 || count > AES_BLOCK_SIZE || count > data.length) {
    throw new CipherError('AES_DECRYPT_FAILED', `The padding byte is ${count}, which is not a valid PKCS#7 length.`);
  }
  for (let i = data.length - count; i < data.length; i++) {
    if (data[i] !== count) {
      throw new CipherError('AES_DECRYPT_FAILED', 'The padding bytes are inconsistent, so this is not the ciphertext for this key.');
    }
  }
  return data.subarray(0, data.length - count);
}

function parseKeyBytes(key: string): Uint8Array {
  const bytes = textEncoder.encode(key);
  if (bytes.length !== 16 && bytes.length !== 24 && bytes.length !== 32) {
    throw new CipherError(
      'AES_KEY_LENGTH',
      `The key is ${bytes.length} byte(s) long.`
    );
  }
  return bytes;
}

/** Splits a byte array into 16-byte blocks. */
function toBlocks(data: Uint8Array): Uint8Array[] {
  const blocks: Uint8Array[] = [];
  for (let offset = 0; offset < data.length; offset += AES_BLOCK_SIZE) {
    blocks.push(data.subarray(offset, offset + AES_BLOCK_SIZE));
  }
  return blocks;
}

function describeSize(keyBytes: number): string {
  return `AES-${keyBytes * 8} (${keyBytes} byte key, ${roundsForKey(new Uint8Array(keyBytes))} rounds)`;
}

function buildEncryptSteps(
  plaintextBlock: Uint8Array,
  expandedKey: Uint8Array,
  trace: RoundTrace[],
  keyBytes: number
): AesVisualStep[] {
  const steps: AesVisualStep[] = [];
  let id = 0;

  steps.push({
    id: id++,
    title: '1. Plaintext block to State Matrix',
    description:
      'AES never works on the whole message. The text is split into 16-byte blocks, and each block is written into a 4x4 matrix column by column, so byte i sits at row i mod 4.',
    matrixBefore: stateToMatrix(plaintextBlock),
    extraInfo: `Block plaintext: ${toHex(plaintextBlock).toUpperCase()}`,
  });

  steps.push({
    id: id++,
    title: '2. Key expansion',
    description:
      'The key schedule expands the key into one round key per round using RotWord, SubWord and the round constants. Every round below XORs in a different 16-byte round key.',
    extraInfo: `${describeSize(keyBytes)}, expanded to ${expandedKey.length} bytes of round keys. Round 1 uses ${toHex(expandedKey.subarray(16, 32)).toUpperCase()}.`,
  });

  for (const round of trace) {
    const stage = round.isFinalRound ? 'Final round' : `Round ${round.round}`;

    steps.push({
      id: id++,
      title: `${id}. ${stage}: SubBytes`,
      description:
        'Each byte is replaced independently by its value in the AES S-Box, which already contains the inverse of the multiplicative inverse in GF(2^8), so the substitution is its own kind of non-linear step.',
      matrixBefore: stateToMatrix(round.input),
      matrixAfter: stateToMatrix(round.subBytes),
    });

    steps.push({
      id: id++,
      title: `${id}. ${stage}: ShiftRows`,
      description:
        'Row r is rotated left by r positions. No bytes are added or changed, only moved, which is what breaks up the column structure.',
      matrixBefore: stateToMatrix(round.subBytes),
      matrixAfter: stateToMatrix(round.shiftRows),
    });

    if (round.mixColumns) {
      steps.push({
        id: id++,
        title: `${id}. ${stage}: MixColumns`,
        description:
          'Each column is multiplied by the fixed polynomial matrix over GF(2^8). This is the step that spreads a single input byte across all four bytes of its column.',
        matrixBefore: stateToMatrix(round.shiftRows),
        matrixAfter: stateToMatrix(round.mixColumns),
      });
    }

    steps.push({
      id: id++,
      title: `${id}. ${stage}: AddRoundKey`,
      description: round.isFinalRound
        ? 'The last round key is XORed in. The final round has no MixColumns, so this is the last operation before the ciphertext block is read out.'
        : `The round key for ${stage.toLowerCase()} is XORed into the state byte by byte.`,
      matrixBefore: stateToMatrix(round.mixColumns ?? round.shiftRows),
      matrixKey: stateToMatrix(round.roundKey),
      matrixAfter: stateToMatrix(round.output),
    });
  }

  steps.push({
    id: id++,
    title: 'Ciphertext block',
    description:
      'After the final AddRoundKey the state is the ciphertext block, read back out column by column.',
    matrixBefore: stateToMatrix(trace[trace.length - 1].output),
    extraInfo: `Block ciphertext: ${toHex(trace[trace.length - 1].output).toUpperCase()}`,
  });

  return steps;
}

function buildDecryptSteps(
  ciphertextBlock: Uint8Array,
  expandedKey: Uint8Array,
  trace: RoundTrace[],
  keyBytes: number
): AesVisualStep[] {
  const steps: AesVisualStep[] = [];
  let id = 0;

  steps.push({
    id: id++,
    title: '1. Ciphertext block to State Matrix',
    description:
      'Decryption starts from the ciphertext block. The same key schedule is rebuilt from the same key.',
    matrixBefore: stateToMatrix(ciphertextBlock),
    extraInfo: `Block ciphertext: ${toHex(ciphertextBlock).toUpperCase()}`,
  });

  steps.push({
    id: id++,
    title: '2. Key expansion',
    description:
      'The identical key schedule is used. Decryption walks the rounds backwards, so it starts from the last round key.',
    extraInfo: `${describeSize(keyBytes)}, expanded to ${expandedKey.length} bytes of round keys.`,
  });

  for (const round of trace) {
    const stage = `Round ${round.round}`;
    const isFinal = round.isFinalRound;

    steps.push({
      id: id++,
      title: `${id}. ${stage}: InvShiftRows`,
      description: 'The inverse of ShiftRows: row r is rotated right by r positions.',
      matrixBefore: stateToMatrix(round.input),
      matrixAfter: stateToMatrix(round.shiftRows),
    });

    steps.push({
      id: id++,
      title: `${id}. ${stage}: InvSubBytes`,
      description: 'Each byte is replaced by the inverse S-Box, which undoes SubBytes exactly.',
      matrixBefore: stateToMatrix(round.shiftRows),
      matrixAfter: stateToMatrix(round.subBytes),
    });

    steps.push({
      id: id++,
      title: `${id}. ${stage}: AddRoundKey`,
      description: `The round key for ${stage.toLowerCase()} is XORed back in. XOR undoes itself.`,
      matrixBefore: stateToMatrix(round.subBytes),
      matrixKey: stateToMatrix(round.roundKey),
      matrixAfter: stateToMatrix(isFinal ? round.output : (round.mixColumns as Uint8Array)),
    });

    if (round.mixColumns) {
      steps.push({
        id: id++,
        title: `${id}. ${stage}: InvMixColumns`,
        description:
          'The inverse MixColumns multiplies by 0e, 0b, 0d and 09 instead of 02 and 03, which reverses MixColumns.',
        matrixBefore: stateToMatrix(round.subBytes),
        matrixAfter: stateToMatrix(round.mixColumns),
      });
    }
  }

  steps.push({
    id: id++,
    title: 'Recovered plaintext block',
    description: 'The state is read back column by column to give the plaintext block, still padded.',
    matrixBefore: stateToMatrix(trace[trace.length - 1].output),
    extraInfo: `Block plaintext, padding included: ${toHex(trace[trace.length - 1].output).toUpperCase()}`,
  });

  return steps;
}

export function processAES(text: string, key: string, mode: 'encrypt' | 'decrypt'): AesResult {
  if (!text) {
    throw new CipherError('EMPTY_INPUT');
  }

  const keyBytes = parseKeyBytes(key);
  const rounds = roundsForKey(keyBytes);
  const expandedKey = expandKey(keyBytes);

  if (mode === 'encrypt') {
    const padded = padPkcs7(textEncoder.encode(text));
    const paddingBytes = padded.length - textEncoder.encode(text).length;
    const blocks = toBlocks(padded);
    const outputs: Uint8Array[] = [];
    const summaries: AesBlockSummary[] = [];
    let steps: AesVisualStep[] = [];

    blocks.forEach((block, index) => {
      const { ciphertext, trace } = encryptBlockWithTrace(block, expandedKey, rounds);
      outputs.push(ciphertext);
      summaries.push({
        index,
        inputHex: toHex(block).toUpperCase(),
        outputHex: toHex(ciphertext).toUpperCase(),
        detailed: index === 0,
      });
      if (index === 0) {
        steps = buildEncryptSteps(block, expandedKey, trace, keyBytes.length);
      }
    });

    return {
      resultText: outputs.map((block) => toHex(block).toUpperCase()).join(''),
      steps,
      blocks: summaries,
      mode,
      keyBytes: keyBytes.length,
      rounds,
      blockCount: blocks.length,
      paddingBytes,
      modeOfOperation: 'ECB',
    };
  }

  let ciphertext: Uint8Array;
  try {
    ciphertext = fromHex(text);
  } catch {
    throw new CipherError(
      'AES_CIPHERTEXT_FORMAT',
      'Encryption on this page produces one long hexadecimal string, with no spaces and no 0x prefix.'
    );
  }
  if (ciphertext.length === 0 || ciphertext.length % AES_BLOCK_SIZE !== 0) {
    throw new CipherError(
      'AES_CIPHERTEXT_FORMAT',
      `The ciphertext is ${ciphertext.length} bytes, which is not a whole number of 16-byte blocks.`
    );
  }

  const blocks = toBlocks(ciphertext);
  const outputs: Uint8Array[] = [];
  const summaries: AesBlockSummary[] = [];
  let steps: AesVisualStep[] = [];

  blocks.forEach((block, index) => {
    const { ciphertext: plain, trace } = decryptBlockWithTrace(block, expandedKey, rounds);
    outputs.push(plain);
    summaries.push({
      index,
      inputHex: toHex(block).toUpperCase(),
      outputHex: toHex(plain).toUpperCase(),
      detailed: index === 0,
    });
    if (index === 0) {
      steps = buildDecryptSteps(block, expandedKey, trace, keyBytes.length);
    }
  });

  const paddedPlaintext = new Uint8Array(outputs.length * AES_BLOCK_SIZE);
  outputs.forEach((block, index) => {
    paddedPlaintext.set(block, index * AES_BLOCK_SIZE);
  });

  const unpadded = unpadPkcs7(paddedPlaintext);

  let plaintext: string;
  try {
    plaintext = textDecoder.decode(unpadded);
  } catch {
    throw new CipherError(
      'AES_DECRYPT_FAILED',
      'The decrypted bytes are not valid UTF-8 text, so the key is probably wrong.'
    );
  }

  return {
    resultText: plaintext,
    steps,
    blocks: summaries,
    mode,
    keyBytes: keyBytes.length,
    rounds,
    blockCount: blocks.length,
    paddingBytes: paddedPlaintext.length - unpadded.length,
    modeOfOperation: 'ECB',
  };
}
