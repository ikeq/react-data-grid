import { useState } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid, RowHeaderColumn } from '../../src';
import type {
  CellSelection,
  CellSelectionContextMenuArgs,
  Column,
  DataGridProps,
  SortColumn
} from '../../src';

interface Row {
  readonly id: number;
  readonly a: string;
  readonly b: string;
  readonly c: string;
}

const columns: readonly Column<Row>[] = [
  RowHeaderColumn,
  { key: 'a', name: 'A', sortable: true },
  { key: 'b', name: 'B' },
  { key: 'c', name: 'C' }
];

const initialRows: readonly Row[] = Array.from({ length: 10 }, (_, id) => ({
  id,
  a: `a${id}`,
  b: `b${id}`,
  c: `c${id}`
}));

const selectedCells = page.getBySelector('.rdg-cell-range-selected');
const selectedHeaderCells = page.getBySelector('.rdg-header-cell-range-selected');
const isMac = navigator.platform.startsWith('Mac');
const ctrlKey = isMac ? 'Meta' : 'Control';

function getCell(name: string) {
  return page.getCell({ name, exact: true });
}

function getRowHeaderCell(rowIdx: number) {
  return getCell(String(rowIdx + 1));
}

async function testSelectedCells(names: readonly string[]) {
  await expect.element(selectedCells).toHaveLength(names.length);
  for (const name of names) {
    await expect.element(getCell(name)).toHaveClass('rdg-cell-range-selected');
  }
}

async function clickWith(key: string, element: ReturnType<typeof getCell>) {
  await userEvent.keyboard(`{${key}>}`);
  await userEvent.click(element);
  await userEvent.keyboard(`{/${key}}`);
}

async function setup(props: Partial<DataGridProps<Row>> = {}) {
  const onCellSelectionChange = vi.fn<(selection: CellSelection) => void>();
  const onSortColumnsChange = vi.fn<(sortColumns: SortColumn[]) => void>();
  await page.render(
    <DataGrid
      columns={columns}
      rows={initialRows}
      enableCellSelection
      onCellSelectionChange={onCellSelectionChange}
      onSortColumnsChange={onSortColumnsChange}
      {...props}
    />
  );
  return { onCellSelectionChange, onSortColumnsChange };
}

test('cell selection is disabled by default', async () => {
  await page.render(<DataGrid columns={columns} rows={initialRows} />);
  await userEvent.click(getCell('a1'));
  await clickWith('Shift', getCell('c3'));
  await expect.element(selectedCells).toHaveLength(0);
  await expect.element(page.getGrid()).not.toHaveAttribute('aria-multiselectable');
});

test('dragging selects a range of cells', async () => {
  const { onCellSelectionChange } = await setup();
  await userEvent.dragAndDrop(getCell('a1'), getCell('b3'));
  await testSelectedCells(['a1', 'b1', 'a2', 'b2', 'a3', 'b3']);
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([
    { startIdx: 1, endIdx: 2, startRowIdx: 1, endRowIdx: 3 }
  ]);
  // the active cell stays where the selection started
  await expect.element(page.getActiveCell()).toHaveTextContent('a1');
  // the header cells of the selected columns and the row header cells of the selected rows are highlighted
  await expect.element(selectedHeaderCells).toHaveLength(5);
});

test('a single cell is not highlighted', async () => {
  const { onCellSelectionChange } = await setup();
  await userEvent.click(getCell('b2'));
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([
    { startIdx: 2, endIdx: 2, startRowIdx: 2, endRowIdx: 2 }
  ]);
  await expect.element(selectedCells).toHaveLength(0);
  await expect.element(selectedHeaderCells).toHaveLength(0);
});

test('Shift + click extends the selection, and Ctrl/Cmd + click adds a range', async () => {
  await setup();
  await userEvent.click(getCell('a1'));
  await clickWith('Shift', getCell('b2'));
  await testSelectedCells(['a1', 'b1', 'a2', 'b2']);
  await expect.element(page.getActiveCell()).toHaveTextContent('a1');

  await clickWith(ctrlKey, getCell('c5'));
  await testSelectedCells(['a1', 'b1', 'a2', 'b2', 'c5']);

  // a click without modifiers starts a new selection
  await userEvent.click(getCell('c7'));
  await expect.element(selectedCells).toHaveLength(0);
});

test('Shift + arrow keys extend the selection, and arrow keys collapse it', async () => {
  await setup();
  await userEvent.click(getCell('a1'));
  await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowRight}{/Shift}');
  await testSelectedCells(['a1', 'b1', 'a2', 'b2']);
  await expect.element(page.getActiveCell()).toHaveTextContent('a1');

  await userEvent.keyboard('{ArrowDown}');
  await expect.element(selectedCells).toHaveLength(0);
  await expect.element(page.getActiveCell()).toHaveTextContent('a2');
});

test('row header cells select whole rows', async () => {
  const { onCellSelectionChange } = await setup();
  await userEvent.click(getRowHeaderCell(2));
  await testSelectedCells(['a2', 'b2', 'c2']);
  await expect.element(getRowHeaderCell(2)).toHaveClass('rdg-header-cell-range-selected');

  await userEvent.dragAndDrop(getRowHeaderCell(4), getRowHeaderCell(5));
  await testSelectedCells(['a4', 'b4', 'c4', 'a5', 'b5', 'c5']);
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([
    { startIdx: 0, endIdx: 3, startRowIdx: 4, endRowIdx: 5 }
  ]);
});

test('header cells select whole columns instead of sorting', async () => {
  const { onCellSelectionChange, onSortColumnsChange } = await setup();
  const headerCell = page.getHeaderCell({ name: 'A' });
  await userEvent.click(headerCell);
  expect(onSortColumnsChange).not.toHaveBeenCalled();
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([
    { startIdx: 1, endIdx: 1, startRowIdx: 0, endRowIdx: 9 }
  ]);
  await expect.element(headerCell).toHaveClass('rdg-header-cell-range-selected');
  await expect.element(getCell('a0')).toHaveClass('rdg-cell-range-selected');

  await clickWith('Shift', page.getHeaderCell({ name: 'C' }));
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([
    { startIdx: 1, endIdx: 3, startRowIdx: 0, endRowIdx: 9 }
  ]);

  // the column can still be sorted with the keyboard
  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{Enter}');
  expect(onSortColumnsChange).toHaveBeenCalledWith([{ columnKey: 'a', direction: 'ASC' }]);
});

test('the row header column header cell and Ctrl/Cmd + A select all the cells', async () => {
  const { onCellSelectionChange } = await setup();
  const allRange = { startIdx: 0, endIdx: 3, startRowIdx: 0, endRowIdx: 9 };
  await userEvent.click(page.getHeaderCell().first());
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([allRange]);

  await userEvent.click(getCell('b1'));
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([
    { startIdx: 2, endIdx: 2, startRowIdx: 1, endRowIdx: 1 }
  ]);
  await userEvent.keyboard(`{${ctrlKey}>}a{/${ctrlKey}}`);
  expect(onCellSelectionChange).toHaveBeenLastCalledWith([allRange]);
});

test('right-clicking opens the context menu with the selected cells', async () => {
  const onCellSelectionContextMenu =
    vi.fn<
      (args: CellSelectionContextMenuArgs<Row>, event: React.MouseEvent<HTMLDivElement>) => void
    >();
  await setup({ onCellSelectionContextMenu });

  await userEvent.dragAndDrop(getCell('a1'), getCell('b2'));
  // right-clicking in the selection keeps it
  await userEvent.click(getCell('b1'), { button: 'right' });
  let [args] = onCellSelectionContextMenu.mock.lastCall!;
  expect(args.target).toBe('CELL');
  expect(args.column?.key).toBe('b');
  let [cells] = args.getSelectedCells();
  expect(cells.columns.map((column) => column.key)).toStrictEqual(['a', 'b']);
  expect(cells.rows).toStrictEqual(initialRows.slice(1, 3));
  await testSelectedCells(['a1', 'b1', 'a2', 'b2']);
  // the active cell stays where the selection started
  await expect.element(page.getActiveCell()).toHaveTextContent('a1');

  // right-clicking outside of the selection selects the cell
  await userEvent.click(getCell('c5'), { button: 'right' });
  [args] = onCellSelectionContextMenu.mock.lastCall!;
  expect(args.selection).toStrictEqual([{ startIdx: 3, endIdx: 3, startRowIdx: 5, endRowIdx: 5 }]);

  // right-clicking a row header cell selects the row, without the row header column
  await userEvent.click(getRowHeaderCell(7), { button: 'right' });
  [args] = onCellSelectionContextMenu.mock.lastCall!;
  expect(args.target).toBe('ROW_HEADER');
  expect(args.column).toBeUndefined();
  [cells] = args.getSelectedCells();
  expect(cells.columns.map((column) => column.key)).toStrictEqual(['a', 'b', 'c']);
  expect(cells.rows).toStrictEqual([initialRows[7]]);

  // right-clicking a header cell selects the column
  await userEvent.click(page.getHeaderCell({ name: 'B' }), { button: 'right' });
  [args] = onCellSelectionContextMenu.mock.lastCall!;
  expect(args.target).toBe('COLUMN_HEADER');
  [cells] = args.getSelectedCells();
  expect(cells.columns.map((column) => column.key)).toStrictEqual(['b']);
  expect(cells.rows).toStrictEqual(initialRows);
});

test('controlled cell selection', async () => {
  function Test() {
    const [cellSelection, setCellSelection] = useState<CellSelection>([
      { startIdx: 1, endIdx: 1, startRowIdx: 0, endRowIdx: 1 }
    ]);
    const [rows, setRows] = useState(initialRows);

    return (
      <>
        <button type="button" onClick={() => setRows(rows.slice(0, 3))}>
          Remove rows
        </button>
        <DataGrid
          columns={columns}
          rows={rows}
          enableCellSelection
          cellSelection={cellSelection}
          onCellSelectionChange={setCellSelection}
        />
      </>
    );
  }

  await page.render(<Test />);
  await testSelectedCells(['a0', 'a1']);
  await userEvent.dragAndDrop(getCell('b4'), getCell('c5'));
  await testSelectedCells(['b4', 'c4', 'b5', 'c5']);

  // ranges out of the rows are dropped
  await userEvent.click(page.getByRole('button', { name: 'Remove rows' }));
  await expect.element(selectedCells).toHaveLength(0);
});
