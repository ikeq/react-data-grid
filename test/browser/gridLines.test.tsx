import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid, RowHeaderColumn } from '../../src';
import type { Column } from '../../src';
import { cellRangeEdgeClassname } from '../../src/style/cell';

interface Row {
  id: number;
}

const columns: readonly Column<Row>[] = [
  { key: 'id', name: 'ID' },
  { key: 'a', name: 'A' }
];

const rows: readonly Row[] = [{ id: 1 }, { id: 2 }];

test('the top-left cell has the header line and the frozen column line', async () => {
  await page.render(
    <DataGrid columns={[RowHeaderColumn, { key: 'id', name: 'ID' }]} rows={rows} />
  );
  const [corner, idHeaderCell] = page.getHeaderRow().getByRole('columnheader').elements();
  const cornerStyle = getComputedStyle(corner);
  expect(cornerStyle.borderBlockEndWidth).toBe('1px');
  expect(cornerStyle.borderInlineEndWidth).toBe('1px');
  // the lines meet at the end bottom corner of the top-left cell
  expect(getComputedStyle(corner, '::after').content).toBe('none');
  const cornerRect = corner.getBoundingClientRect();
  const lineRect = idHeaderCell.getBoundingClientRect();
  expect(cornerRect.right).toBe(lineRect.left);
  expect(cornerRect.bottom).toBe(lineRect.bottom);
  expect(getComputedStyle(idHeaderCell).borderBlockEndWidth).toBe('1px');
  const rowHeaderCell = page.getRow().nth(1).getByRole('gridcell').first().element();
  expect(getComputedStyle(rowHeaderCell).borderInlineEndWidth).toBe('1px');
});

test('the grid has no border', async () => {
  await page.render(<DataGrid columns={columns} rows={rows} />);
  const style = getComputedStyle(page.getGrid().element());
  expect(style.borderTopWidth).toBe('0px');
  expect(style.borderRightWidth).toBe('0px');
  expect(style.borderBottomWidth).toBe('0px');
  expect(style.borderLeftWidth).toBe('0px');
});

test('rows are striped, starting with the first row', async () => {
  const stripedRows: readonly Row[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
  await page.render(<DataGrid columns={columns} rows={stripedRows} />);
  const grid = page.getGrid().element();
  const background = getComputedStyle(grid).backgroundColor;
  const [row1, row2, row3] = page.getRow().elements();

  const stripe = getComputedStyle(row1).backgroundColor;
  expect(stripe).not.toBe(background);
  expect(getComputedStyle(row2).backgroundColor).toBe(background);
  expect(getComputedStyle(row3).backgroundColor).toBe(stripe);
});

test('every frozen cell has a line on its side facing the scrolling columns', async () => {
  const frozenColumns: readonly Column<Row>[] = [
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

  expect(widths('S1')).toStrictEqual(['0px', '1px']);
  expect(widths('S2')).toStrictEqual(['0px', '1px']);
  expect(widths('C')).toStrictEqual(['0px', '0px']);
  expect(widths('E1')).toStrictEqual(['1px', '0px']);
  expect(widths('E2')).toStrictEqual(['1px', '0px']);

  // the data cells have the same line
  const row = page.getRow().nth(1).element();
  const [s1, s2, , e1, e2] = row.querySelectorAll('[role="gridcell"]');
  expect(getComputedStyle(s1).borderInlineEndWidth).toBe('1px');
  expect(getComputedStyle(s2).borderInlineEndWidth).toBe('1px');
  expect(getComputedStyle(e1).borderInlineStartWidth).toBe('1px');
  expect(getComputedStyle(e2).borderInlineStartWidth).toBe('1px');
  // the grid's outer edges have no line
  expect(getComputedStyle(e2).borderInlineEndWidth).toBe('0px');
});

test('the selection border is 1px wide', async () => {
  await page.render(<DataGrid columns={columns} rows={rows} />);
  const cell = page.getCell({ name: '1', exact: true });
  await userEvent.click(cell);
  await expect.element(cell).toHaveClass(cellRangeEdgeClassname);
  expect(getComputedStyle(cell.element(), '::after').borderTopWidth).toBe('1px');
});

test('only the line between the header and the data area is drawn', async () => {
  await page.render(<DataGrid columns={columns} rows={rows} />);
  const grid = page.getGrid().element();
  const headerCell = page.getHeaderCell({ name: 'ID' }).element();
  const dataCell = page.getCell({ name: '1', exact: true }).element();

  expect(getComputedStyle(headerCell).backgroundColor).toBe(getComputedStyle(grid).backgroundColor);

  for (const cell of [headerCell, dataCell]) {
    const style = getComputedStyle(cell);
    expect(style.borderInlineStartWidth).toBe('0px');
    expect(style.borderInlineEndWidth).toBe('0px');
    expect(style.borderBlockStartWidth).toBe('0px');
  }

  expect(getComputedStyle(headerCell).borderBlockEndWidth).toBe('1px');
  expect(getComputedStyle(dataCell).borderBlockEndWidth).toBe('0px');
});

test('the hovered data cell has the border of the selected ranges, and keeps its background', async () => {
  const style: React.CSSProperties & Record<`--${string}`, string> = {
    '--rdg-cell-selection-border-color': 'rgb(9, 9, 9)',
    '--rdg-cell-selection-background-color': 'rgb(3, 3, 3)'
  };
  await page.render(<DataGrid columns={[RowHeaderColumn, ...columns]} rows={rows} style={style} />);
  const row = page.getRow().nth(1).element();
  const [rowHeaderCell, idCell, aCell] = row.querySelectorAll('[role="gridcell"]');
  const rowBackground = getComputedStyle(row).backgroundColor;
  const rowHeaderBackground = getComputedStyle(rowHeaderCell).backgroundColor;

  function getBorderWidths(cell: Element) {
    const style = getComputedStyle(cell, '::after');
    if (style.content === 'none') return null;
    return [
      style.borderBlockStartWidth,
      style.borderBlockEndWidth,
      style.borderInlineStartWidth,
      style.borderInlineEndWidth
    ];
  }

  await userEvent.hover(page.elementLocator(idCell));
  await expect.poll(() => getBorderWidths(idCell)).toStrictEqual(['1px', '1px', '1px', '1px']);
  expect(getComputedStyle(idCell, '::after').borderBlockStartColor).toBe('rgb(9, 9, 9)');
  expect(getComputedStyle(idCell).backgroundColor).toBe(rowBackground);
  expect(getBorderWidths(aCell)).toBeNull();

  // the row numbers are not outlined
  await userEvent.hover(page.elementLocator(rowHeaderCell));
  await expect.poll(() => getBorderWidths(idCell)).toBeNull();
  expect(getBorderWidths(rowHeaderCell)).toBeNull();
  expect(getComputedStyle(rowHeaderCell).backgroundColor).toBe(rowHeaderBackground);

  // the selected cells are not outlined, so the hovered cell's border isn't drawn inside the range's
  const firstIdCell = page.getRow().nth(0).element().querySelectorAll('[role="gridcell"]')[1];
  await userEvent.dragAndDrop(page.elementLocator(firstIdCell), page.elementLocator(aCell));
  await userEvent.hover(page.elementLocator(idCell));
  // only the edges of the range: the bottom and the start of the range's bottom start cell
  await expect.poll(() => getBorderWidths(idCell)).toStrictEqual(['0px', '1px', '1px', '0px']);
  expect(getComputedStyle(idCell).backgroundColor).toBe('rgb(3, 3, 3)');
});
