'use client';

import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { CipherErrorInfo } from '@/lib/cipherError';

interface ValidationNoticeProps {
  info: CipherErrorInfo | null;
  className?: string;
  /**
   * Set this when a field points at the notice through aria-describedby, so the
   * message is announced as part of the field's description and not only as a
   * live region. The field cannot point at the component, only at an id.
   */
  id?: string;
}

export function ValidationNotice({ info, className, id }: ValidationNoticeProps) {
  if (!info) return null;

  return (
    <Alert variant="destructive" className={className} role="alert" id={id}>
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
