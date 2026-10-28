import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid } from '../../src';
import type { ColumnOrColumnGroup } from '../../src';

interface Row {
  id: number;
}

const columns: readonly ColumnOrColumnGroup<Row>[] = [
  { key: 'id', name: 'ID' },
  {
    name: 'Group',
    children: [
      { key: 'a', name: 'A' },
      { key: 'b', name: 'B' }
    ]
  }
];

const rows: readonly Row[] = [{ id: 1 }, { id: 2 }];

test('frozen columns have a single line at their edge, and no shadow', async () => {
  const frozenColumns: readonly ColumnOrColumnGroup<Row>[] = [
    { key: 's1', name: 'S1', frozen: 'start' },
    { key: 's2', name: 'S2', frozen: 'start' },
    { key: 'c', name: 'C' },
    { key: 'e1', name: 'E1', frozen: 'end' },
    { key: 'e2', name: 'E2', frozen: 'end' }
  ];
  await page.render(<DataGrid columns={frozenColumns} rows={rows} />);

  function widths(name: string) {
    const style = getComputedStyle(page.getHeaderCell({ name }).element());
    return [style.borderInlineStartWidth, style.borderInlineEndWidth];
  }

  expect(widths('S1')).toStrictEqual(['0px', '0px']);
  expect(widths('S2')).toStrictEqual(['0px', '1px']);
  expect(widths('C')).toStrictEqual(['0px', '0px']);
  expect(widths('E1')).toStrictEqual(['1px', '0px']);
  expect(widths('E2')).toStrictEqual(['0px', '0px']);

  // the data cells have the same line
  const row = page.getRow().nth(1).element();
  const [s1, s2, , e1] = row.querySelectorAll('[role="gridcell"]');
  expect(getComputedStyle(s1).borderInlineEndWidth).toBe('0px');
  expect(getComputedStyle(s2).borderInlineEndWidth).toBe('1px');
  expect(getComputedStyle(e1).borderInlineStartWidth).toBe('1px');

  expect(page.getGrid().element().querySelector('.rdg-frozen-column-shadow')).toBeNull();
});

test('the active cell box is 1px wide', async () => {
  await page.render(<DataGrid columns={columns} rows={rows} />);
  const cell = page.getCell({ name: '1', exact: true });
  await userEvent.click(cell);
  await expect.element(cell).toHaveAttribute('aria-selected', 'true');
  expect(getComputedStyle(cell.element(), '::before').borderTopWidth).toBe('1px');
});

test('only the line between the header and the data area is drawn', async () => {
  await page.render(<DataGrid columns={columns} rows={rows} />);
  const grid = page.getGrid().element();
  const groupCell = page.getHeaderCell({ name: 'Group' }).element();
  const spanningCell = page.getHeaderCell({ name: 'ID' }).element();
  const columnCell = page.getHeaderCell({ name: 'A' }).element();
  const dataCell = page.getCell({ name: '1', exact: true }).element();

  for (const cell of [groupCell, spanningCell, columnCell]) {
    expect(getComputedStyle(cell).backgroundColor).toBe(getComputedStyle(grid).backgroundColor);
  }

  for (const cell of [groupCell, spanningCell, columnCell, dataCell]) {
    const style = getComputedStyle(cell);
    expect(style.borderInlineStartWidth).toBe('0px');
    expect(style.borderInlineEndWidth).toBe('0px');
    expect(style.borderBlockStartWidth).toBe('0px');
  }

  // the cells of the last header row, including the cells that span down to it, draw the line
  expect(getComputedStyle(spanningCell).borderBlockEndWidth).toBe('1px');
  expect(getComputedStyle(columnCell).borderBlockEndWidth).toBe('1px');
  expect(getComputedStyle(groupCell).borderBlockEndWidth).toBe('0px');
  expect(getComputedStyle(dataCell).borderBlockEndWidth).toBe('0px');
});
