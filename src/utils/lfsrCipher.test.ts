import { describe, expect, it } from 'vitest';
import { processLFSR } from '@/utils/lfsrCipher';
import { expectCipherError } from '@/test-utils';

describe('processLFSR keystream', () => {
  it('produces a hand-derived first 8 keystream bits for seed 1001', () => {
    // Walking the register by hand from 1001 with taps on the two rightmost
    // bits gives the output sequence 1,0,0,1,1,0,1,0.
    const { steps } = processLFSR('A', '1001');
    expect(steps[0].keystreamBinary).toBe('10011010');

    // 'A' is 0b01000001, XOR 0b10011010 = 0b11011011 = 219.
    expect(steps[0].resultChar.charCodeAt(0)).toBe(219);
  });

  it('regenerates the identical keystream for the same seed, which is what makes it reversible', () => {
    // No rewinding is involved. processLFSR always starts from the seed, so a
    // second call with the same seed replays the same keystream. Asserted
    // separately because that is the actual premise of the round trip below:
    // if the keystream ever stopped being reproducible, the round trip would
    // fail for a reason that has nothing to do with XOR.
    const first = processLFSR('Attack at dawn', '1001');
    const second = processLFSR('Attack at dawn', '1001');

    expect(first.steps.map((step) => step.keystreamBinary)).toEqual(
      second.steps.map((step) => step.keystreamBinary),
    );
  });

  it('is reversible, because XOR with the same keystream twice cancels', () => {
    const encrypted = processLFSR('Attack at dawn', '1001');
    const decrypted = processLFSR(encrypted.resultText, '1001');

    // Encrypt and decrypt are the same operation here, so decrypting means
    // running the identical keystream over the ciphertext a second time.
    // Every byte comes back, including the ones that landed above 127.
    expect(decrypted.resultText).toBe('Attack at dawn');
  });

  it('round trips text whose bytes span the full 0-255 range', () => {
    // Guards the 8-bit assumption in the keystream loop: a result byte above
    // 127 must still survive a second pass unchanged.
    const allBytes = Array.from({ length: 256 }, (_, code) =>
      String.fromCharCode(code),
    ).join('');

    const once = processLFSR(allBytes, '101101');
    const twice = processLFSR(once.resultText, '101101');

    expect(twice.resultText).toBe(allBytes);
  });

  it('is deterministic for the same text and seed', () => {
    const first = processLFSR('Hello', '1001');
    const second = processLFSR('Hello', '1001');
    expect(first.resultText).toBe(second.resultText);
    expect(first.steps.length).toBe(second.steps.length);
  });

  it('produces a different result for a different seed', () => {
    expect(processLFSR('Hello', '1001').resultText).not.toBe(processLFSR('Hello', '1010').resultText);
  });
});

describe('processLFSR period reporting', () => {
  it('reaches the maximal period of 15 for the classic 4-bit seed', () => {
    const result = processLFSR('ABCDEFGH', '1001');
    expect(result.maxPeriod).toBe(15);
    expect(result.observedStates).toBe(15);
    expect(result.cycleLength).toBe(15);
    expect(result.returnedToSeedAt).toBe(15);
  });

  it('reports maxPeriod as 2^L - 1 for wider registers', () => {
    expect(processLFSR('A', '10000001').maxPeriod).toBe(255);
    expect(processLFSR('A', '100101').maxPeriod).toBe(63);
  });

  it('exposes the trimmed seed as the starting state', () => {
    expect(processLFSR('A', '  1001  ').seed).toBe('1001');
  });

  it('reports the observed state count below the maximum for a short input', () => {
    // One character is only 8 shifts, so a 4-bit register cannot have closed
    // its cycle yet. cycleLength stays null and returnedToSeedAt stays null.
    const result = processLFSR('A', '1001');
    expect(result.cycleLength).toBeNull();
    expect(result.returnedToSeedAt).toBeNull();
    expect(result.observedStates).toBeLessThanOrEqual(9);
  });
});

describe('processLFSR validation', () => {
  it('rejects a seed containing anything other than 0 and 1', () => {
    expectCipherError(() => processLFSR('A', '102'), 'SEED_NOT_BINARY');
    expectCipherError(() => processLFSR('A', 'abcd'), 'SEED_NOT_BINARY');
  });

  it('rejects a seed shorter than 2 bits', () => {
    expectCipherError(() => processLFSR('A', '1'), 'SEED_TOO_SHORT');
    expectCipherError(() => processLFSR('A', ''), 'SEED_TOO_SHORT');
  });

  it('rejects the all-zero seed, which is an absorbing state', () => {
    const error = expectCipherError(() => processLFSR('A', '0000'), 'SEED_ALL_ZERO');
    expect(error.message).toContain('absorbing');
  });

  it('accepts a minimal 2-bit seed', () => {
    expect(processLFSR('A', '10').maxPeriod).toBe(3);
  });
});
