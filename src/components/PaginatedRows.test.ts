import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaginatedRows } from './PaginatedRows';

describe('calculation table rendering', () => {
  it('renders only one page of a long trace without losing the total count', () => {
    let rendered = 0;
    const items = Array.from({ length: 10000 }, (_, index) => index);
    const html = renderToStaticMarkup(createElement('table', null,
      // Render callbacks must be supplied through the component props.
      // eslint-disable-next-line react/no-children-prop
      createElement(PaginatedRows<number>, {
        items,
        children: (item) => {
          rendered++;
          return createElement('tr', null, createElement('td', null, `block-${item}`));
        },
      }),
    ));
    expect(rendered).toBe(25);
    expect(html).toContain('block-24');
    expect(html).not.toContain('block-25');
    expect(html).toContain('10000');
    expect(html).toContain('Next');
  });
});
