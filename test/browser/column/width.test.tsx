import { page } from 'vite-plus/test/browser';

import { DataGrid, RowHeaderColumn } from '../../../src';
import type { Column } from '../../../src';

type Row = Record<string, string>;

const rows: readonly Row[] = Array.from({ length: 5 }, (_, rowIdx) =>
  Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [`col${i}`, `${rowIdx}-${'x'.repeat(30 + i)}`])
  )
);

const columns: readonly Column<Row>[] = [
  RowHeaderColumn,
  { key: 'col0', name: 'col0', frozen: true },
  ...Array.from({ length: 7 }, (_, i): Column<Row> => ({ key: `col${i + 1}`, name: `col${i + 1}` }))
];

function getGrid() {
  return page.getGrid().element() as HTMLDivElement;
}

test('columns are as wide as their content by default, so the grid scrolls horizontally', async () => {
  await page.render(<DataGrid columns={columns} rows={rows} style={{ width: 600 }} />);

  await expect.poll(() => getGrid().scrollWidth).toBeGreaterThan(getGrid().clientWidth);
  const tracks = getComputedStyle(getGrid()).gridTemplateColumns.split(' ').map(parseFloat);
  // each data column is wider than an even share of the grid's width
  for (const width of tracks.slice(1)) {
    expect(width).toBeGreaterThan(600 / columns.length);
  }
});

test('frozen columns are offset by the rendered width of the frozen columns before them', async () => {
  await page.render(<DataGrid columns={columns} rows={rows} style={{ width: 600 }} />);
  const grid = getGrid();
  const [rowHeaderCell, frozenCell] = page.getRow().nth(1).element().children;
  const rowHeaderWidth = rowHeaderCell.getBoundingClientRect().width;
  const gridLeft = grid.getBoundingClientRect().left;

  grid.scrollLeft = 500;
  await expect.poll(() => grid.scrollLeft).toBe(500);
  await expect
    .poll(() => frozenCell.getBoundingClientRect().left - gridLeft)
    .toBeCloseTo(rowHeaderWidth, 0);
  expect(rowHeaderCell.getBoundingClientRect().left - gridLeft).toBe(0);
});
