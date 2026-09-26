/**
 * A direct implementation of the Rijndael cipher that AES is built on.
 *
 * Everything here works on a single 16-byte block and has no knowledge of
 * padding, base64 or text encoding, so it can be checked directly against the
 * known-answer vectors in FIPS-197 appendix C.
 *
 * The state is kept in the same column-major order the standard uses: the byte
 * at index i sits at row i % 4, column floor(i / 4).
 */

export const AES_BLOCK_SIZE = 16;

export const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);

/**
 * Built by inverting the S-Box rather than typed out by hand. A single wrong
 * digit in a hand-written inverse table would be a silent bug that only shows
 * up as a wrong answer much later.
 */
export const INV_SBOX = (() => {
  const inverse = new Uint8Array(256);
  for (let i = 0; i < 256; i++) inverse[SBOX[i]] = i;
  return inverse;
})();

const RCON = new Uint8Array([0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]);

/** Round count for each key size, per FIPS-197 section 5. */
export const ROUNDS_BY_KEY_SIZE: Record<number, number> = { 16: 10, 24: 12, 32: 14 };

/** The intermediate state of one round, kept so the UI can show real numbers. */
export interface RoundTrace {
  round: number;
  /** True for the final round, which has no MixColumns step. */
  isFinalRound: boolean;
  input: Uint8Array;
  roundKey: Uint8Array;
  subBytes: Uint8Array;
  shiftRows: Uint8Array;
  /** Null on the final round. */
  mixColumns: Uint8Array | null;
  output: Uint8Array;
}

export interface CipherResultBlock {
  ciphertext: Uint8Array;
  trace: RoundTrace[];
}

function assertByte(value: number): number {
  return value & 0xff;
}

/** Multiplication by x in GF(2^8) modulo the AES polynomial x^8 + x^4 + x^3 + x + 1. */
function xtime(value: number): number {
  const shifted = (value << 1) & 0xff;
  return value & 0x80 ? shifted ^ 0x1b : shifted;
}

/** Multiplication of two bytes in GF(2^8). */
export function gfMul(a: number, b: number): number {
  let product = 0;
  let x = a & 0xff;
  let y = b & 0xff;
  for (let i = 0; i < 8; i++) {
    if (y & 1) product ^= x;
    y >>= 1;
    x = xtime(x);
  }
  return product & 0xff;
}

function subBytes(state: Uint8Array): Uint8Array {
  const out = new Uint8Array(AES_BLOCK_SIZE);
  for (let i = 0; i < AES_BLOCK_SIZE; i++) out[i] = SBOX[state[i]];
  return out;
}

function invSubBytes(state: Uint8Array): Uint8Array {
  const out = new Uint8Array(AES_BLOCK_SIZE);
  for (let i = 0; i < AES_BLOCK_SIZE; i++) out[i] = INV_SBOX[state[i]];
  return out;
}

/** Row r is rotated left by r positions. */
function shiftRows(state: Uint8Array): Uint8Array {
  const out = new Uint8Array(AES_BLOCK_SIZE);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[row + 4 * col] = state[row + 4 * ((col + row) % 4)];
    }
  }
  return out;
}

/** Row r is rotated right by r positions. */
function invShiftRows(state: Uint8Array): Uint8Array {
  const out = new Uint8Array(AES_BLOCK_SIZE);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[row + 4 * col] = state[row + 4 * ((col - row + 4) % 4)];
    }
  }
  return out;
}

function mixColumns(state: Uint8Array): Uint8Array {
  const out = new Uint8Array(AES_BLOCK_SIZE);
  for (let col = 0; col < 4; col++) {
    const a = state[0 + 4 * col];
    const b = state[1 + 4 * col];
    const c = state[2 + 4 * col];
    const d = state[3 + 4 * col];
    out[0 + 4 * col] = assertByte(gfMul(a, 2) ^ gfMul(b, 3) ^ c ^ d);
    out[1 + 4 * col] = assertByte(a ^ gfMul(b, 2) ^ gfMul(c, 3) ^ d);
    out[2 + 4 * col] = assertByte(a ^ b ^ gfMul(c, 2) ^ gfMul(d, 3));
    out[3 + 4 * col] = assertByte(gfMul(a, 3) ^ b ^ c ^ gfMul(d, 2));
  }
  return out;
}

function invMixColumns(state: Uint8Array): Uint8Array {
  const out = new Uint8Array(AES_BLOCK_SIZE);
  for (let col = 0; col < 4; col++) {
    const a = state[0 + 4 * col];
    const b = state[1 + 4 * col];
    const c = state[2 + 4 * col];
    const d = state[3 + 4 * col];
    out[0 + 4 * col] = assertByte(gfMul(a, 14) ^ gfMul(b, 11) ^ gfMul(c, 13) ^ gfMul(d, 9));
    out[1 + 4 * col] = assertByte(gfMul(a, 9) ^ gfMul(b, 14) ^ gfMul(c, 11) ^ gfMul(d, 13));
    out[2 + 4 * col] = assertByte(gfMul(a, 13) ^ gfMul(b, 9) ^ gfMul(c, 14) ^ gfMul(d, 11));
    out[3 + 4 * col] = assertByte(gfMul(a, 11) ^ gfMul(b, 13) ^ gfMul(c, 9) ^ gfMul(d, 14));
  }
  return out;
}

function addRoundKey(state: Uint8Array, roundKey: Uint8Array): Uint8Array {
  const out = new Uint8Array(AES_BLOCK_SIZE);
  for (let i = 0; i < AES_BLOCK_SIZE; i++) out[i] = state[i] ^ roundKey[i];
  return out;
}

/**
 * FIPS-197 key expansion. Returns every round key concatenated, so the round key
 * for round r is bytes 16 * r .. 16 * r + 15.
 */
export function expandKey(key: Uint8Array): Uint8Array {
  const nk = key.length / 4;
  const rounds = ROUNDS_BY_KEY_SIZE[key.length];
  if (!rounds || !Number.isInteger(nk)) {
    throw new Error(`Unsupported AES key size: ${key.length} bytes`);
  }

  const totalWords = 4 * (rounds + 1);
  const expanded = new Uint8Array(totalWords * 4);
  expanded.set(key, 0);

  const temp = new Uint8Array(4);

  for (let word = nk; word < totalWords; word++) {
    temp.set(expanded.subarray((word - 1) * 4, word * 4));

    if (word % nk === 0) {
      // RotWord then SubWord, then XOR the round constant into the first byte.
      const first = temp[0];
      temp[0] = SBOX[temp[1]];
      temp[1] = SBOX[temp[2]];
      temp[2] = SBOX[temp[3]];
      temp[3] = SBOX[first];
      temp[0] ^= RCON[word / nk];
    } else if (nk > 6 && word % nk === 4) {
      // AES-256 applies SubWord an extra time every fourth word.
      for (let i = 0; i < 4; i++) temp[i] = SBOX[temp[i]];
    }

    for (let i = 0; i < 4; i++) {
      expanded[word * 4 + i] = expanded[(word - nk) * 4 + i] ^ temp[i];
    }
  }

  return expanded;
}

/** How many rounds a key of this size uses. */
export function roundsForKey(key: Uint8Array): number {
  const rounds = ROUNDS_BY_KEY_SIZE[key.length];
  if (!rounds) throw new Error(`Unsupported AES key size: ${key.length} bytes`);
  return rounds;
}

export function assertBlock(block: Uint8Array, label: string): void {
  if (block.length !== AES_BLOCK_SIZE) {
    throw new Error(`${label} must be ${AES_BLOCK_SIZE} bytes, got ${block.length}`);
  }
}

export function encryptBlock(
  block: Uint8Array,
  expandedKey: Uint8Array,
  rounds: number
): Uint8Array {
  assertBlock(block, 'Block');
  let state = addRoundKey(block, expandedKey.subarray(0, 16));

  for (let round = 1; round <= rounds; round++) {
    state = subBytes(state);
    state = shiftRows(state);
    if (round < rounds) state = mixColumns(state);
    state = addRoundKey(state, expandedKey.subarray(round * 16, round * 16 + 16));
  }

  return state;
}

export function decryptBlock(
  block: Uint8Array,
  expandedKey: Uint8Array,
  rounds: number
): Uint8Array {
  assertBlock(block, 'Block');
  let state = addRoundKey(block, expandedKey.subarray(rounds * 16, rounds * 16 + 16));

  for (let round = rounds - 1; round >= 0; round--) {
    state = invShiftRows(state);
    state = invSubBytes(state);
    state = addRoundKey(state, expandedKey.subarray(round * 16, round * 16 + 16));
    if (round > 0) state = invMixColumns(state);
  }

  return state;
}

/** Encrypts one block and records the state after every individual operation. */
export function encryptBlockWithTrace(
  block: Uint8Array,
  expandedKey: Uint8Array,
  rounds: number
): CipherResultBlock {
  assertBlock(block, 'Block');
  const trace: RoundTrace[] = [];
  let state = addRoundKey(block, expandedKey.subarray(0, 16));

  for (let round = 1; round <= rounds; round++) {
    const isFinalRound = round === rounds;
    const input = state;
    const roundKey = expandedKey.slice(round * 16, round * 16 + 16);

    const afterSubBytes = subBytes(state);
    const afterShiftRows = shiftRows(afterSubBytes);
    const afterMixColumns = isFinalRound ? null : mixColumns(afterShiftRows);
    const output = addRoundKey(
      isFinalRound ? afterShiftRows : (afterMixColumns as Uint8Array),
      roundKey
    );

    trace.push({
      round,
      isFinalRound,
      input,
      roundKey,
      subBytes: afterSubBytes,
      shiftRows: afterShiftRows,
      mixColumns: afterMixColumns,
      output,
    });

    state = output;
  }

  return { ciphertext: state, trace };
}

/** Decrypts one block and records the state after every individual operation. */
export function decryptBlockWithTrace(
  block: Uint8Array,
  expandedKey: Uint8Array,
  rounds: number
): CipherResultBlock {
  assertBlock(block, 'Block');
  const trace: RoundTrace[] = [];
  let state = addRoundKey(block, expandedKey.subarray(rounds * 16, rounds * 16 + 16));

  for (let round = rounds - 1; round >= 0; round--) {
    const isFinalRound = round === 0;
    const input = state;
    const roundKey = expandedKey.slice(round * 16, round * 16 + 16);

    const afterInvShiftRows = invShiftRows(state);
    const afterInvSubBytes = invSubBytes(afterInvShiftRows);
    const afterAddRoundKey = addRoundKey(afterInvSubBytes, roundKey);
    const afterInvMixColumns = isFinalRound ? null : invMixColumns(afterAddRoundKey);

    trace.push({
      round,
      isFinalRound,
      input,
      roundKey,
      subBytes: afterInvSubBytes,
      shiftRows: afterInvShiftRows,
      mixColumns: afterInvMixColumns,
      output: isFinalRound ? afterAddRoundKey : (afterInvMixColumns as Uint8Array),
    });

    state = isFinalRound ? afterAddRoundKey : (afterInvMixColumns as Uint8Array);
  }

  return { ciphertext: state, trace };
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('Expected an even number of hex digits');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Converts a 16-byte state into the row-major hex grid the UI renders. */
export function stateToMatrix(state: Uint8Array): string[][] {
  const matrix: string[][] = [[], [], [], []];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      matrix[row][col] = state[row + 4 * col].toString(16).padStart(2, '0').toUpperCase();
    }
  }
  return matrix;
}
