import { describe, expect, it } from 'vitest';
import { processLFSR } from '@/utils/lfsrCipher';
import { expectCipherError } from '@/test-utils';

describe('processLFSR keystream', () => {
  it('reproduces the worked cycle table in docs/LFSR.md exactly', () => {
    // The guide writes the state as b4 b3 b2 b1, takes the keystream bit from
    // b1, and feeds back b1 XOR b4. Its eight worked cycles are transcribed
    // here as [state before, feedback, state after].
    const { steps } = processLFSR('e', '1111', 'encrypt');
    expect(
      steps[0].shiftDetails.map((s) => [s.stateBefore, s.newBit, s.stateAfter])
    ).toEqual([
      ['1111', '0', '0111'],
      ['0111', '1', '1011'],
      ['1011', '0', '0101'],
      ['0101', '1', '1010'],
      ['1010', '1', '1101'],
      ['1101', '0', '0110'],
      ['0110', '0', '0011'],
      ['0011', '1', '1001'],
    ]);
  });

  it('derives the guide keystream 11110101 and the ciphertext 10010000', () => {
    // The eight output bits of the table above concatenate to 11110101, and
    // 'e' is 0b01100101, so 0b01100101 XOR 0b11110101 = 0b10010000.
    const { steps } = processLFSR('e', '1111', 'encrypt');
    expect(steps[0].keystreamBinary).toBe('11110101');
    expect(steps[0].xorResultBinary).toBe('10010000');
    expect(steps[0].resultByteHex).toBe('90');
  });

  it('regenerates the identical keystream for the same seed, which is what makes it reversible', () => {
    // No rewinding is involved. processLFSR always starts from the seed, so a
    // second call with the same seed replays the same keystream. Asserted
    // separately because that is the actual premise of the round trip below:
    // if the keystream ever stopped being reproducible, the round trip would
    // fail for a reason that has nothing to do with XOR.
    const first = processLFSR('Attack at dawn', '1001', 'encrypt');
    const second = processLFSR('Attack at dawn', '1001', 'encrypt');

    expect(first.steps.map((step) => step.keystreamBinary)).toEqual(
      second.steps.map((step) => step.keystreamBinary)
    );
  });

  it('is reversible across an encrypt then decrypt cycle', () => {
    // XOR with the same keystream twice cancels, so the decrypted bytes come
    // back. The mode exists only because hex now sits between the two passes.
    const encrypted = processLFSR('Attack at dawn', '1001', 'encrypt');
    const decrypted = processLFSR(encrypted.resultText, '1001', 'decrypt');

    expect(decrypted.resultText).toBe('Attack at dawn');
  });

  it('round trips text whose bytes span the full 0-255 range', () => {
    // Guards the 8-bit assumption in the keystream loop: a result byte above
    // 127 must still survive the hex round trip unchanged.
    const allBytes = Array.from({ length: 256 }, (_, code) =>
      String.fromCharCode(code),
    ).join('');

    const once = processLFSR(allBytes, '101101', 'encrypt');
    const twice = processLFSR(once.resultText, '101101', 'decrypt');

    expect(once.resultText).toHaveLength(512);
    expect(twice.resultText).toBe(allBytes);
  });

  it('is deterministic for the same text and seed', () => {
    const first = processLFSR('Hello', '1001', 'encrypt');
    const second = processLFSR('Hello', '1001', 'encrypt');
    expect(first.resultText).toBe(second.resultText);
    expect(first.steps.length).toBe(second.steps.length);
  });

  it('produces a different result for a different seed', () => {
    expect(processLFSR('Hello', '1001', 'encrypt').resultText).not.toBe(
      processLFSR('Hello', '1010', 'encrypt').resultText
    );
  });
});

describe('processLFSR hex encoding', () => {
  it('emits two lowercase hex digits per byte and nothing else', () => {
    const { resultText } = processLFSR('AB', '1001', 'encrypt');
    expect(resultText).toMatch(/^[0-9a-f]+$/);
    expect(resultText).toHaveLength(4);
  });

  it('accepts uppercase hex and embedded whitespace when decrypting', () => {
    const encrypted = processLFSR('Attack at dawn', '1001', 'encrypt');
    const upper = encrypted.resultText.toUpperCase();
    const spaced = upper.replace(/(.{2})/g, '$1 ').trim();

    expect(processLFSR(spaced, '1001', 'decrypt').resultText).toBe('Attack at dawn');
  });

  it('rejects a ciphertext that is not hex', () => {
    expectCipherError(() => processLFSR('not hex at all', '1001', 'decrypt'), 'CIPHERTEXT_NOT_HEX');
    expectCipherError(() => processLFSR('90g0', '1001', 'decrypt'), 'CIPHERTEXT_NOT_HEX');
  });

  it('rejects a half byte rather than rounding it away', () => {
    // 0x90 plus a stray digit cannot be a whole number of bytes, and silently
    // dropping the odd digit would hide a truncated paste.
    const error = expectCipherError(
      () => processLFSR('90a', '1001', 'decrypt'),
      'CIPHERTEXT_NOT_HEX'
    );
    expect(error.message).toContain('3 hex digits');
  });

  it('rejects an empty ciphertext', () => {
    expectCipherError(() => processLFSR('   ', '1001', 'decrypt'), 'CIPHERTEXT_NOT_HEX');
  });
});

describe('processLFSR period reporting', () => {
  it('reaches the maximal period of 15 for the classic 4-bit seed', () => {
    const result = processLFSR('ABCDEFGH', '1001', 'encrypt');
    expect(result.maxPeriod).toBe(15);
    expect(result.observedStates).toBe(15);
    expect(result.cycleLength).toBe(15);
    expect(result.returnedToSeedAt).toBe(15);
  });

  it('still returns to the guide seed after 15 shifts with the b1 / b_n taps', () => {
    // Maximal length belongs to the feedback polynomial, and moving the second
    // tap from b2 to b_n changes that polynomial. Asserted separately so the tap
    // change cannot quietly shorten the cycle the period panel advertises.
    const result = processLFSR('ABCDEFGHIJ', '1111', 'encrypt');
    expect(result.maxPeriod).toBe(15);
    expect(result.observedStates).toBe(15);
    expect(result.cycleLength).toBe(15);
    expect(result.returnedToSeedAt).toBe(15);
  });

  it('reports maxPeriod as 2^L - 1 for wider registers', () => {
    expect(processLFSR('A', '10000001', 'encrypt').maxPeriod).toBe(255);
    expect(processLFSR('A', '100101', 'encrypt').maxPeriod).toBe(63);
  });

  it('exposes the trimmed seed as the starting state', () => {
    expect(processLFSR('A', '  1001  ', 'encrypt').seed).toBe('1001');
  });

  it('reports the observed state count below the maximum for a short input', () => {
    // One character is only 8 shifts, so a 4-bit register cannot have closed
    // its cycle yet. cycleLength stays null and returnedToSeedAt stays null.
    const result = processLFSR('A', '1001', 'encrypt');
    expect(result.cycleLength).toBeNull();
    expect(result.returnedToSeedAt).toBeNull();
    expect(result.observedStates).toBeLessThanOrEqual(9);
  });
});

describe('processLFSR validation', () => {
  it('rejects a seed containing anything other than 0 and 1', () => {
    expectCipherError(() => processLFSR('A', '102', 'encrypt'), 'SEED_NOT_BINARY');
    expectCipherError(() => processLFSR('A', 'abcd', 'encrypt'), 'SEED_NOT_BINARY');
  });

  it('rejects a seed shorter than 2 bits', () => {
    expectCipherError(() => processLFSR('A', '1', 'encrypt'), 'SEED_TOO_SHORT');
    expectCipherError(() => processLFSR('A', '', 'encrypt'), 'SEED_TOO_SHORT');
  });

  it('rejects the all-zero seed, which is an absorbing state', () => {
    const error = expectCipherError(() => processLFSR('A', '0000', 'encrypt'), 'SEED_ALL_ZERO');
    expect(error.message).toContain('absorbing');
  });

  it('accepts a minimal 2-bit seed', () => {
    // At length 2 the two taps are the whole register, and they are still
    // distinct positions, so a maximal cycle of 3 remains reachable.
    expect(processLFSR('A', '10', 'encrypt').maxPeriod).toBe(3);
  });
});
