'use client';

import { useEffect } from 'react';
import { OctagonAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-3xl py-16">
      <Alert variant="destructive">
        <OctagonAlert aria-hidden="true" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <p>
            The page hit an unexpected error while rendering. The cipher utilities
            report their own validation problems inline, so reaching this screen
            means a bug rather than bad input.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs">Reference: {error.digest}</p>
          ) : null}
        </AlertDescription>
      </Alert>
      <div className="mt-6">
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </div>
  );
}
