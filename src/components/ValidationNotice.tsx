'use client';

import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { CipherErrorInfo } from '@/lib/cipherError';

interface ValidationNoticeProps {
  info: CipherErrorInfo | null;
  className?: string;
}

export function ValidationNotice({ info, className }: ValidationNoticeProps) {
  if (!info) return null;

  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{info.title}</AlertTitle>
      <AlertDescription>
        <p>{info.detail}</p>
        {info.hint ? (
          <p className="text-xs opacity-80">
            <span className="font-medium">Suggestion: </span>
            {info.hint}
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
