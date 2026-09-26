'use client';

import type { CipherErrorInfo } from '@/lib/cipherError';

interface ResultStatusProps {
  hasResult: boolean;
  error: CipherErrorInfo | null;
  /** Which direction was run, so the announcement can name it. */
  mode: 'encrypt' | 'decrypt';
  noun?: string;
}

/**
 * Announces the outcome of a run without putting the whole result text into a
 * live region.
 *
 * Dumping the result itself into aria-live would make a screen reader read out
 * every character of a ciphertext, which is slow and useless. Naming the
 * outcome instead gives the same feedback in a fraction of the time.
 */
export function ResultStatus({ hasResult, error, mode, noun = 'result' }: ResultStatusProps) {
  let message = '';

  if (error) {
    message = `Error: ${error.title}. ${error.detail}`;
  } else if (hasResult) {
    const direction = mode === 'encrypt' ? 'encrypted' : 'decrypted';
    message = `Finished. The ${noun} is ready below, ${direction}.`;
  }

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}
