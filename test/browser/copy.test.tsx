import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid, getSelectedCellsText, RowHeaderColumn } from '../../src';
import type { Column, SelectedCells } from '../../src';
import { getCellsAtRowIndex } from './utils';

interface Row {
  a: string;
  b: string | null;
}

const columns: readonly Column<Row>[] = [
  RowHeaderColumn,
  { key: 'a', name: 'A' },
  { key: 'b', name: 'B' }
];

const rows: readonly Row[] = [
  { a: 'a1', b: 'b1' },
  { a: 'a2', b: null },
  { a: 'a3', b: 'b3' }
];

function spyOnCopiedText() {
  const setData = vi.spyOn(DataTransfer.prototype, 'setData');
  onTestFinished(() => {
    setData.mockRestore();
  });
  return () => setData.mock.calls.findLast(([format]) => format === 'text/plain')?.[1];
}

test('Ctrl/Cmd + C copies the selected cells as tab-separated text', async () => {
  const getCopiedText = spyOnCopiedText();
  await page.render(<DataGrid columns={columns} rows={rows} />);

  await userEvent.click(getCellsAtRowIndex(0).nth(1));
  await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowRight}{/Shift}');
  await userEvent.copy();
  // empty values copy as empty cells
  expect(getCopiedText()).toBe('a1\tb1\na2\t');
});

test('copying selected rows leaves out the row header column', async () => {
  const getCopiedText = spyOnCopiedText();
  await page.render(<DataGrid columns={columns} rows={rows} />);

  await userEvent.click(getCellsAtRowIndex(2).nth(0));
  await userEvent.copy();
  expect(getCopiedText()).toBe('a3\tb3');
});

test('nothing is copied without a selection', async () => {
  const getCopiedText = spyOnCopiedText();
  // the selection is controlled and stays empty, while the clicked cell becomes active
  await page.render(<DataGrid columns={columns} rows={rows} cellSelection={[]} />);

  await userEvent.click(getCellsAtRowIndex(0).nth(1));
  await userEvent.copy();
  expect(getCopiedText()).toBeUndefined();
});

test('controls in header cells copy their own text', async () => {
  const getCopiedText = spyOnCopiedText();
  const filterColumns: readonly Column<Row>[] = [
    {
      key: 'a',
      name: 'A',
      renderHeaderCell: ({ tabIndex }) => (
        <input aria-label="filter" tabIndex={tabIndex} defaultValue="filter text" />
      )
    }
  ];
  await page.render(<DataGrid columns={filterColumns} rows={rows} />);

  // select a cell, then copy from the input
  await userEvent.click(getCellsAtRowIndex(0).nth(0));
  await userEvent.tripleClick(page.getByRole('textbox', { name: 'filter' }));
  await userEvent.copy();
  expect(getCopiedText()).not.toBe('a1');
});

test('getSelectedCellsText', () => {
  const calculatedColumns = [
    { key: 'a', name: 'A' },
    { key: 'b', name: 'B' }
  ] as unknown as SelectedCells<Row>['columns'];
  const range = { startIdx: 0, endIdx: 1, startRowIdx: 0, endRowIdx: 1 };
  const selectedCells: SelectedCells<Row>[] = [
    {
      range,
      columns: calculatedColumns,
      rows: [
        { a: 'tab\there', b: 'line\nbreak' },
        { a: 'say "hi"', b: 'plain' }
      ]
    },
    { range, columns: calculatedColumns.slice(1), rows: [{ a: '', b: 'second' }] }
  ];

  // values with tabs, line breaks, or quotes are quoted, ranges are separated by an empty line
  expect(getSelectedCellsText(selectedCells)).toBe(
    '"tab\there"\t"line\nbreak"\n"say ""hi"""\tplain\n\nsecond'
  );
  expect(getSelectedCellsText(selectedCells.slice(1), { includeHeader: true })).toBe('B\nsecond');
});
