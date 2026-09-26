import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-3xl py-16 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground">
          That URL does not match any cipher in this app.
        </p>
      </div>
      <Button variant="outline" render={<Link href="/" />}>
        Back to the home page
      </Button>
    </div>
  );
}
