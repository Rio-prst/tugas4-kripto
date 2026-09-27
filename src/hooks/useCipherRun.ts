'use client';

import { useCallback, useState } from 'react';
import {
  isCipherError,
  type CipherErrorCode,
  type CipherErrorInfo,
} from '@/lib/cipherError';

function toInfo(value: unknown): CipherErrorInfo {
  if (isCipherError(value)) return value.info;
  return {
    title: 'Unexpected error',
    detail: value instanceof Error ? value.message : String(value),
  };
}

function toCode(value: unknown): CipherErrorCode | null {
  return isCipherError(value) ? value.code : null;
}

export function useCipherRun<T>() {
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<CipherErrorInfo | null>(null);
  const [errorCode, setErrorCode] = useState<CipherErrorCode | null>(null);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  const run = useCallback((action: () => T) => {
    try {
      const next = action();
      setResult(next);
      setError(null);
      setErrorCode(null);
    } catch (caught) {
      setResult(null);
      setError(toInfo(caught));
      // Kept alongside the message because the message alone cannot say which
      // field is at fault, and there is one notice shared by several inputs.
      setErrorCode(toCode(caught));
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setErrorCode(null);
  }, []);

  return { result, setResult, error, errorCode, run, reset, mode, setMode };
}
