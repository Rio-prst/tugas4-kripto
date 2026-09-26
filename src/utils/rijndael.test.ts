import { describe, expect, it } from 'vitest';
import {
  INV_SBOX,
  SBOX,
  decryptBlock,
  decryptBlockWithTrace,
  encryptBlock,
  encryptBlockWithTrace,
  expandKey,
  fromHex,
  gfMul,
  ROUNDS_BY_KEY_SIZE,
  roundsForKey,
  stateToMatrix,
  toHex,
} from '@/utils/rijndael';

const PLAINTEXT = '00112233445566778899aabbccddeeff';

const KEYS = {
  128: '000102030405060708090a0b0c0d0e0f',
  192: '000102030405060708090a0b0c0d0e0f1011121314151617',
  256: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
};

describe('S-Box', () => {
  it('has 256 distinct values, so it is a permutation', () => {
    expect(SBOX.length).toBe(256);
    expect(new Set(SBOX).size).toBe(256);
  });

  it('has a genuine inverse', () => {
    for (let i = 0; i < 256; i++) {
      expect(INV_SBOX[SBOX[i]], `SBOX and INV_SBOX disagree at ${i}`).toBe(i);
    }
  });

  it('matches the FIPS-197 known values', () => {
    expect(SBOX[0x00]).toBe(0x63);
    expect(SBOX[0x01]).toBe(0x7c);
    expect(SBOX[0x53]).toBe(0xed);
    expect(SBOX[0xff]).toBe(0x16);
  });
});

describe('GF(2^8) multiplication', () => {
  it('matches the worked examples in FIPS-197 appendix B', () => {
    expect(gfMul(0x57, 0x83)).toBe(0xc1);
    expect(gfMul(0x57, 0x13)).toBe(0xfe);
    expect(gfMul(0x57, 0x02)).toBe(0xae);
  });

  it('has the expected identities', () => {
    expect(gfMul(0x00, 0xff)).toBe(0x00);
    expect(gfMul(0x01, 0xff)).toBe(0xff);
  });
});

describe('key expansion', () => {
  it('produces one round key per round plus the initial one', () => {
    for (const size of [16, 24, 32]) {
      const expanded = expandKey(new Uint8Array(size));
      expect(expanded.length, `${size}-byte key`).toBe(16 * (ROUNDS_BY_KEY_SIZE[size] + 1));
    }
  });

  it('starts with the original key as the first round key', () => {
    const key = fromHex(KEYS[128]);
    expect(toHex(expandKey(key).subarray(0, 16))).toBe(KEYS[128]);
  });

  it('reproduces the whole key schedule published in FIPS-197 appendix A.1', () => {
    const expected = [
      '00010203', '04050607', '08090a0b', '0c0d0e0f',
      'd6aa74fd', 'd2af72fa', 'daa678f1', 'd6ab76fe',
      'b692cf0b', '643dbdf1', 'be9bc500', '6830b3fe',
      'b6ff744e', 'd2c2c9bf', '6c590cbf', '0469bf41',
      '47f7f7bc', '95353e03', 'f96c32bc', 'fd058dfd',
      '3caaa3e8', 'a99f9deb', '50f3af57', 'adf622aa',
      '5e390f7d', 'f7a69296', 'a7553dc1', '0aa31f6b',
      '14f9701a', 'e35fe28c', '440adf4d', '4ea9c026',
      '47438735', 'a41c65b9', 'e016baf4', 'aebf7ad2',
      '549932d1', 'f0855768', '1093ed9c', 'be2c974e',
      '13111d7f', 'e3944a17', 'f307a78b', '4d2b30c5',
    ];
    const expanded = expandKey(fromHex(KEYS[128]));

    for (let word = 0; word < expected.length; word++) {
      const actual = toHex(expanded.subarray(word * 4, word * 4 + 4));
      expect(actual, `word ${word}`).toBe(expected[word]);
    }
  });

  it('rejects a key that is not 16, 24 or 32 bytes', () => {
    expect(() => expandKey(new Uint8Array(20))).toThrow(/Unsupported AES key size/);
    expect(() => roundsForKey(new Uint8Array(8))).toThrow(/Unsupported AES key size/);
  });
});

describe('FIPS-197 appendix C known-answer vectors', () => {
  it('encrypts the single-block vector with AES-128', () => {
    const key = fromHex(KEYS[128]);
    const out = encryptBlock(fromHex(PLAINTEXT), expandKey(key), roundsForKey(key));
    expect(toHex(out)).toBe('69c4e0d86a7b0430d8cdb78070b4c55a');
  });

  it('encrypts the single-block vector with AES-192', () => {
    const key = fromHex(KEYS[192]);
    const out = encryptBlock(fromHex(PLAINTEXT), expandKey(key), roundsForKey(key));
    expect(toHex(out)).toBe('dda97ca4864cdfe06eaf70a0ec0d7191');
  });

  it('encrypts the single-block vector with AES-256', () => {
    const key = fromHex(KEYS[256]);
    const out = encryptBlock(fromHex(PLAINTEXT), expandKey(key), roundsForKey(key));
    expect(toHex(out)).toBe('8ea2b7ca516745bfeafc49904b496089');
  });

  it('decrypts each vector back to the original plaintext', () => {
    const vectors: Array<[string, string]> = [
      [KEYS[128], '69c4e0d86a7b0430d8cdb78070b4c55a'],
      [KEYS[192], 'dda97ca4864cdfe06eaf70a0ec0d7191'],
      [KEYS[256], '8ea2b7ca516745bfeafc49904b496089'],
    ];
    for (const [keyHex, cipherHex] of vectors) {
      const key = fromHex(keyHex);
      const out = decryptBlock(fromHex(cipherHex), expandKey(key), roundsForKey(key));
      expect(toHex(out), `${key.length * 8}-bit key`).toBe(PLAINTEXT);
    }
  });
});

describe('round-one intermediate states', () => {
  // The full trace published in FIPS-197 appendix A.1 for the AES-128 example.
  it('reproduces every step of round 1', () => {
    const key = fromHex(KEYS[128]);
    const { trace } = encryptBlockWithTrace(fromHex(PLAINTEXT), expandKey(key), 10);
    const round1 = trace[0];

    expect(round1.round).toBe(1);
    // Round 1 starts from the state after the initial AddRoundKey, which is the
    // plaintext XORed with the first round key. For this plaintext and key that
    // is 00102030405060708090a0b0c0d0e0f0, not the raw plaintext.
    expect(toHex(round1.input)).toBe('00102030405060708090a0b0c0d0e0f0');
    expect(toHex(round1.subBytes)).toBe('63cab7040953d051cd60e0e7ba70e18c');
    expect(toHex(round1.shiftRows)).toBe('6353e08c0960e104cd70b751bacad0e7');
    expect(toHex(round1.mixColumns as Uint8Array)).toBe('5f72641557f5bc92f7be3b291db9f91a');
    expect(toHex(round1.output)).toBe('89d810e8855ace682d1843d8cb128fe4');
  });

  it('uses the right number of rounds per key size', () => {
    for (const [keyHex, expected] of [
      [KEYS[128], 10],
      [KEYS[192], 12],
      [KEYS[256], 14],
    ] as const) {
      const key = fromHex(keyHex);
      const { trace } = encryptBlockWithTrace(fromHex(PLAINTEXT), expandKey(key), roundsForKey(key));
      expect(trace).toHaveLength(expected);
      expect(trace[trace.length - 1].isFinalRound).toBe(true);
    }
  });

  it('omits MixColumns on the final round only', () => {
    const key = fromHex(KEYS[128]);
    const { trace } = encryptBlockWithTrace(fromHex(PLAINTEXT), expandKey(key), 10);
    for (const round of trace) {
      expect(round.mixColumns === null).toBe(round.isFinalRound);
    }
  });

  it('traces decryption back through the same states', () => {
    const key = fromHex(KEYS[128]);
    const expanded = expandKey(key);
    const { trace } = decryptBlockWithTrace(fromHex('69c4e0d86a7b0430d8cdb78070b4c55a'), expanded, 10);
    expect(toHex(trace[trace.length - 1].output)).toBe(PLAINTEXT);
  });
});

describe('round trip', () => {
  it('recovers the plaintext for every key size and several inputs', () => {
    const plaintexts = [
      '00000000000000000000000000000000',
      'ffffffffffffffffffffffffffffffff',
      '0123456789abcdeffedcba9876543210',
    ];
    for (const size of [16, 24, 32]) {
      const key = new Uint8Array(size);
      for (let i = 0; i < size; i++) key[i] = (i * 7 + 3) & 0xff;
      const expanded = expandKey(key);
      const rounds = roundsForKey(key);
      for (const hex of plaintexts) {
        const encrypted = encryptBlock(fromHex(hex), expanded, rounds);
        expect(toHex(decryptBlock(encrypted, expanded, rounds)), `${size}-byte key, ${hex}`).toBe(hex);
      }
    }
  });
});

describe('stateToMatrix', () => {
  it('lays the state out in rows the way AES numbers its columns', () => {
    // Byte index i is row i % 4, column floor(i / 4).
    const state = fromHex('00112233445566778899aabbccddeeff');
    expect(stateToMatrix(state)).toEqual([
      ['00', '44', '88', 'CC'],
      ['11', '55', '99', 'DD'],
      ['22', '66', 'AA', 'EE'],
      ['33', '77', 'BB', 'FF'],
    ]);
  });
});

describe('hex helpers', () => {
  it('round-trips bytes through hex', () => {
    expect(toHex(fromHex('deadBEEF'))).toBe('deadbeef');
    expect(toHex(fromHex(''))).toBe('');
  });

  it('rejects malformed hex', () => {
    expect(() => fromHex('abc')).toThrow(/even number/);
    expect(() => fromHex('zz')).toThrow(/hex digits/);
  });
});
