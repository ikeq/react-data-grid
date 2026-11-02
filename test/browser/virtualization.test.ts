import { page, type Locator } from 'vite-plus/test/browser';

import type { Column } from '../../src';
import { getCellsAtRowIndex, scrollGrid, setup } from './utils';

const headerCells = page.getHeaderCell();
const rows = page.getRow();
const cells = page.getCell();

// the header row has the same height as the rows, so the expected row indexes are easy to compute
const rowHeight = 35;

function setupGrid(
  enableVirtualization: boolean,
  columnCount: number,
  rowCount: number,
  frozenColumnCount = 0,
  endFrozenColumnCount = 0
) {
  const columns: Column<unknown>[] = [];
  const rows = Array.from({ length: rowCount });

  for (let i = 0; i < columnCount; i++) {
    const key = String(i);
    columns.push({
      key,
      name: key,
      width: 100 + ((i * 10) % 50),
      frozen: i < frozenColumnCount ? true : i >= columnCount - endFrozenColumnCount ? 'end' : false
    });
  }

  return setup({
    columns,
    rows,
    rowHeight,
    headerRowHeight: rowHeight,
    enableVirtualization
  });
}

async function assertElements(
  locator: Locator,
  attribute: string,
  count: number,
  startIdx: number,
  endIdx: number
) {
  await expect.element(locator).toHaveLength(count);
  await expect.element(locator.first()).toHaveAttribute(attribute, String(startIdx));
  await expect.element(locator.last()).toHaveAttribute(attribute, String(endIdx));
}

async function assertIndexes(
  locator: Locator,
  indexes: number[],
  attribute: string,
  indexOffset: number
) {
  await expect.element(locator).toHaveLength(indexes.length);

  for (const [n, index] of indexes.entries()) {
    await expect.element(locator.nth(n)).toHaveAttribute(attribute, String(index + indexOffset));
  }
}

async function assertHeaderCells(count: number, startIdx: number, endIdx: number) {
  await assertElements(headerCells, 'aria-colindex', count, startIdx + 1, endIdx + 1);
}

async function assertHeaderCellIndexes(indexes: number[]) {
  await assertIndexes(headerCells, indexes, 'aria-colindex', 1);
}

async function assertRows(count: number, startIdx: number, endIdx: number) {
  await assertElements(rows, 'aria-rowindex', count, startIdx + 2, endIdx + 2);
}

async function assertCells(rowIdx: number, count: number, startIdx: number, endIdx: number) {
  await assertElements(
    getCellsAtRowIndex(rowIdx),
    'aria-colindex',
    count,
    startIdx + 1,
    endIdx + 1
  );
}

async function assertCellIndexes(rowIdx: number, indexes: number[]) {
  await assertIndexes(getCellsAtRowIndex(rowIdx), indexes, 'aria-colindex', 1);
}

test('virtualization is enabled', async () => {
  await setupGrid(true, 30, 100);

  // the rows are virtualized, the columns are all rendered
  await assertHeaderCells(30, 0, 29);
  await assertRows(34, 0, 33);
  await assertCells(0, 30, 0, 29);
  scrollGrid({ top: 244 });
  await assertRows(39, 2, 40);

  scrollGrid({ top: 245 });
  await assertRows(38, 3, 40);

  scrollGrid({ top: 419 });
  await assertRows(39, 7, 45);

  scrollGrid({ top: 420 });
  await assertRows(38, 8, 45);

  scrollGrid({ top: 524 });
  await assertRows(39, 10, 48);

  scrollGrid({ top: 525 });
  await assertRows(38, 11, 48);

  scrollGrid({ top: 1000 });
  await assertRows(39, 24, 62);

  // scroll height = header height + row height * row count
  // max top = scroll height - grid height
  scrollGrid({ top: rowHeight + rowHeight * 100 - 1080 });
  await assertRows(34, 66, 99);

  // scrolling horizontally doesn't change the rendered columns
  // max left = row width - grid width
  scrollGrid({ left: 3600 - 1920 });
  await assertHeaderCells(30, 0, 29);
  await assertCells(66, 30, 0, 29);
});

test('columns are not virtualized with start and end frozen columns', async () => {
  await setupGrid(true, 30, 30, 3, 2);

  const indexes = Array.from({ length: 30 }, (_, i) => i);
  await assertHeaderCellIndexes(indexes);
  await assertCellIndexes(0, indexes);

  // max left = row width - grid width
  scrollGrid({ left: 3600 - 1920 });
  await assertHeaderCellIndexes(indexes);
  await assertCellIndexes(0, indexes);
});

test('zero columns', async () => {
  await setupGrid(true, 0, 100);

  await expect.element(headerCells).toHaveLength(0);
  await expect.element(cells).toHaveLength(0);
  await expect.element(rows).toHaveLength(34);
});

test('zero rows', async () => {
  await setupGrid(true, 20, 0);

  await expect.element(headerCells).toHaveLength(20);
  await expect.element(cells).toHaveLength(0);
  await expect.element(rows).toHaveLength(0);
});

test('virtualization is enabled with not enough columns or rows to virtualize', async () => {
  await setupGrid(true, 5, 5);

  await assertHeaderCells(5, 0, 4);
  await assertRows(5, 0, 4);
  await expect.element(cells).toHaveLength(5 * 5);
});

test('virtualization is disabled with no frozen columns', async () => {
  await setupGrid(false, 40, 100);

  await assertHeaderCells(40, 0, 39);
  await assertRows(100, 0, 99);
  await expect.element(cells).toHaveLength(40 * 100);
});

test('virtualization is disabled with some frozen columns', async () => {
  await setupGrid(false, 40, 100, 3);

  await assertHeaderCells(40, 0, 39);
  await assertRows(100, 0, 99);
  await expect.element(cells).toHaveLength(40 * 100);
});

test('virtualization is disabled with start and end frozen columns', async () => {
  await setupGrid(false, 40, 100, 3, 2);

  await assertHeaderCells(40, 0, 39);
  await assertRows(100, 0, 99);
  await expect.element(cells).toHaveLength(40 * 100);
});
