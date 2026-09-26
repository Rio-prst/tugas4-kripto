'use client';

import { useCallback, useState } from 'react';
import { isCipherError, type CipherErrorInfo } from '@/lib/cipherError';

function toInfo(value: unknown): CipherErrorInfo {
  if (isCipherError(value)) return value.info;
  return {
    title: 'Unexpected error',
    detail: value instanceof Error ? value.message : String(value),
  };
}

export function useCipherRun<T>() {
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<CipherErrorInfo | null>(null);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  const run = useCallback((action: () => T) => {
    try {
      const next = action();
      setResult(next);
      setError(null);
    } catch (caught) {
      setResult(null);
      setError(toInfo(caught));
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, setResult, error, run, reset, mode, setMode };
}
