import { page, userEvent } from 'vite-plus/test/browser';

import type { Column } from '../../../src';
import {
  cellClassname,
  cellFrozenStartClassname,
  cellFrozenEndClassname
} from '../../../src/style/cell';
import { safeTab, setup } from '../utils';

const headerCells = page.getHeaderCell();

test('end-frozen columns have a specific class and are stable-sorted at the tail', async () => {
  const columns: readonly Column<never>[] = [
    {
      key: 'col1',
      name: 'col1',
      frozen: 'start'
    },
    {
      key: 'col2',
      name: 'col2'
    },
    {
      key: 'col3',
      name: 'col3',
      frozen: 'end'
    },
    {
      key: 'col4',
      name: 'col4'
    },
    {
      key: 'col5',
      name: 'col5',
      frozen: 'end'
    }
  ];

  await setup({ columns, rows: [] });

  // Expected DOM order: col1 (start), col2, col4 (unfrozen), col3 (end), col5 (end)
  const [cell1, cell2, cell3, cell4, cell5] = headerCells.all();

  await expect.element(cell1).toHaveTextContent('col1');
  await expect.element(cell2).toHaveTextContent('col2');
  await expect.element(cell3).toHaveTextContent('col4');
  await expect.element(cell4).toHaveTextContent('col3');
  await expect.element(cell5).toHaveTextContent('col5');

  await expect.element(cell1).toHaveClass(cellClassname, cellFrozenStartClassname, { exact: true });
  await expect.element(cell2).toHaveClass(cellClassname, { exact: true });
  await expect.element(cell3).toHaveClass(cellClassname, { exact: true });
  await expect.element(cell4).toHaveClass(cellClassname, cellFrozenEndClassname, { exact: true });
  await expect.element(cell5).toHaveClass(cellClassname, cellFrozenEndClassname, { exact: true });
});

test('frozen: true is normalized to start-frozen (backward compat)', async () => {
  const columns: readonly Column<never>[] = [
    {
      key: 'col1',
      name: 'col1',
      frozen: true
    },
    {
      key: 'col2',
      name: 'col2'
    },
    {
      key: 'col3',
      name: 'col3',
      frozen: 'end'
    }
  ];

  await setup({ columns, rows: [] });

  const [cell1, cell2, cell3] = headerCells.all();

  await expect.element(cell1).toHaveTextContent('col1');
  await expect.element(cell2).toHaveTextContent('col2');
  await expect.element(cell3).toHaveTextContent('col3');

  await expect.element(cell1).toHaveClass(cellClassname, cellFrozenStartClassname, { exact: true });
  await expect.element(cell2).toHaveClass(cellClassname, { exact: true });
  await expect.element(cell3).toHaveClass(cellClassname, cellFrozenEndClassname, { exact: true });
});

test('end-frozen columns stay pinned to the inline-end edge when scrolling', async () => {
  const columns: readonly Column<never>[] = [
    {
      key: 'col1',
      name: 'col1',
      width: 2000
    },
    {
      key: 'col2',
      name: 'col2',
      frozen: 'end',
      width: 80
    },
    {
      key: 'col3',
      name: 'col3',
      frozen: 'end',
      width: 60
    }
  ];

  await setup({ columns, rows: [] });

  const grid = page.getGrid().element();

  function assertPinnedToEndEdge() {
    const gridRect = grid.getBoundingClientRect();
    const gridBorderWidth = Number.parseFloat(getComputedStyle(grid).borderInlineEndWidth);
    // resolve the cells fresh each call — scrolling re-renders the row and
    // detaches any previously cached element references
    const rect2 = headerCells.nth(1).element().getBoundingClientRect();
    const rect3 = headerCells.nth(2).element().getBoundingClientRect();

    // last end-frozen column is flush with the grid's inline-end edge
    expect(rect3.right).toBeCloseTo(gridRect.right - gridBorderWidth, 0);
    // end-frozen columns stack: col2 sits directly before col3
    expect(rect2.right).toBeCloseTo(rect3.left, 0);
  }

  assertPinnedToEndEdge();

  // end-frozen columns must not move when the grid is scrolled horizontally
  grid.scrollLeft = 500;
  await new Promise(requestAnimationFrame);
  assertPinnedToEndEdge();
});

test('reordering input columns past end-frozen preserves band integrity', async () => {
  // User provides columns in an arbitrary order (e.g., end-frozen in the middle);
  // the grid must still sort end-frozen columns to the tail.
  const columns: readonly Column<never>[] = [
    { key: 'end1', name: 'end1', frozen: 'end' },
    { key: 'mid', name: 'mid' },
    { key: 'start1', name: 'start1', frozen: 'start' }
  ];

  await setup({ columns, rows: [] });

  const [cell1, cell2, cell3] = headerCells.all();
  await expect.element(cell1).toHaveTextContent('start1');
  await expect.element(cell2).toHaveTextContent('mid');
  await expect.element(cell3).toHaveTextContent('end1');
});

test('keyboard navigation reaches end-frozen columns', async () => {
  const columns: readonly Column<unknown>[] = [
    { key: 's', name: 's', frozen: 'start' },
    { key: 'u', name: 'u' },
    { key: 'e', name: 'e', frozen: 'end' }
  ];
  const rows: readonly unknown[] = Array.from({ length: 1 });

  await setup({ columns, rows });

  await safeTab();
  // Ctrl+End jumps to the last cell; the end-frozen column sits at aria-colindex=3
  await userEvent.keyboard('{Control>}{End}{/Control}');
  await expect.element(page.getActiveCell()).toHaveAttribute('aria-colindex', '3');
});

test('no unfrozen columns — one start + one end', async () => {
  const columns: readonly Column<never>[] = [
    {
      key: 'a',
      name: 'a',
      frozen: 'start'
    },
    {
      key: 'b',
      name: 'b',
      frozen: 'end'
    }
  ];

  await setup({ columns, rows: [] });

  const [cellA, cellB] = headerCells.all();

  await expect.element(cellA).toHaveTextContent('a');
  await expect.element(cellB).toHaveTextContent('b');
  await expect.element(cellA).toHaveClass(cellClassname, cellFrozenStartClassname, { exact: true });
  await expect.element(cellB).toHaveClass(cellClassname, cellFrozenEndClassname, { exact: true });
});
