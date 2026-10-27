'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { TableBody, TableCell, TableFooter, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 25;

/** Keep the DOM bounded, including tables with multiple rows per item. */
export function PaginatedRows<T>({ items, children }: {
  items: readonly T[];
  children: (item: T, index: number) => ReactNode;
}) {
  const [selection, setSelection] = useState({ items, page: 0 });
  // A new result always starts at the first page, even with the same length.
  const page = selection.items === items ? selection.page : 0;
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const go = (next: number) => setSelection({ items, page: next });

  return (
    <>
      <TableBody>
        {items.slice(start, start + PAGE_SIZE).map((item, index) => (
          <Fragment key={start + index}>{children(item, start + index)}</Fragment>
        ))}
      </TableBody>
      {pages > 1 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={20}>
              <nav aria-label="Calculation pages" className="sticky left-0 flex w-[calc(100vw-6rem)] max-w-full flex-wrap items-center gap-2 whitespace-normal sm:w-auto">
                <span role="status" className="text-xs text-muted-foreground">
                  {start + 1}–{Math.min(start + PAGE_SIZE, items.length)} of {items.length} · Page {page + 1}/{pages}
                </span>
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => go(0)} aria-label="First page">First</Button>
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => go(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page + 1 === pages} onClick={() => go(page + 1)}>Next</Button>
                <Button variant="outline" size="sm" disabled={page + 1 === pages} onClick={() => go(pages - 1)} aria-label="Last page">Last</Button>
              </nav>
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </>
  );
}
