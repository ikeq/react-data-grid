import { Profiler } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid } from '../../src';
import type { Column } from '../../src';
import {
  getRowWithCell,
  safeTab,
  scrollGrid,
  setup,
  testCount,
  validateCellPosition
} from './utils';

const activeCell = page.getActiveCell();
const activeButton = activeCell.getByRole('button');

type Row = undefined;

const rows: readonly Row[] = Array.from({ length: 100 });

const columns: readonly Column<Row>[] = [
  { key: 'col1', name: 'col1' },
  { key: 'col2', name: 'col2' },
  { key: 'col3', name: 'col3' },
  { key: 'col4', name: 'col4' },
  { key: 'col5', name: 'col5' },
  { key: 'col6', name: 'col6' },
  { key: 'col7', name: 'col7' }
];

// a column with focusable content in its cells and header cell
const buttonColumn: Column<Row> = {
  key: 'button',
  name: 'button',
  renderHeaderCell({ tabIndex }) {
    return (
      <button type="button" tabIndex={tabIndex}>
        header
      </button>
    );
  },
  renderCell({ tabIndex }) {
    return (
      <button type="button" tabIndex={tabIndex}>
        cell
      </button>
    );
  }
};

test('keyboard navigation', async () => {
  await setup({ columns, rows });

  // no initial active position
  await expect.element(activeCell).not.toBeInTheDocument();

  // tab into the grid
  await safeTab();
  await validateCellPosition(0, 0);

  // tab to the next cell
  await safeTab();
  await validateCellPosition(1, 0);

  // tab back to the previous cell
  await safeTab(true);
  await validateCellPosition(0, 0);

  // arrow navigation
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(0, 1);
  await userEvent.keyboard('{arrowright}');
  await validateCellPosition(1, 1);
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(1, 2);
  await userEvent.keyboard('{arrowleft}');
  await validateCellPosition(0, 2);
  await userEvent.keyboard('{arrowup}');
  await validateCellPosition(0, 1);
  await userEvent.keyboard('{arrowup}');
  await validateCellPosition(0, 0);

  // page {up,down}
  await userEvent.keyboard('{PageDown}');
  await validateCellPosition(0, 34);
  await userEvent.keyboard('{PageDown}');
  await validateCellPosition(0, 68);
  await userEvent.keyboard('{PageUp}');
  await validateCellPosition(0, 34);

  // home/end navigation
  await userEvent.keyboard('{end}');
  await validateCellPosition(6, 34);
  await userEvent.keyboard('{home}');
  await validateCellPosition(0, 34);
  await userEvent.keyboard('{Control>}{end}{/Control}');
  await validateCellPosition(6, 100);
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(6, 100);
  await userEvent.keyboard('{arrowright}');
  await validateCellPosition(6, 100);
  await userEvent.keyboard('{end}');
  await validateCellPosition(6, 100);
  await userEvent.keyboard('{Control>}{end}{/Control}');
  await validateCellPosition(6, 100);
  await userEvent.keyboard('{PageDown}');
  await validateCellPosition(6, 100);
  await userEvent.keyboard('{Control>}{home}{/Control}');
  await validateCellPosition(0, 0);
  await userEvent.keyboard('{home}');
  await validateCellPosition(0, 0);
  await userEvent.keyboard('{Control>}{home}{/Control}');
  await validateCellPosition(0, 0);
  await userEvent.keyboard('{PageUp}');
  await validateCellPosition(0, 0);

  // tab at the end of a row focuses the first cell on the next row
  await userEvent.keyboard('{end}');
  await safeTab();
  await validateCellPosition(0, 1);

  // shift tab should focus the last cell of the previous row
  await safeTab(true);
  await validateCellPosition(6, 0);
});

test('should render the grid once when the active cell moves', async () => {
  const onRender = vi.fn();
  await page.render(
    <Profiler id="grid" onRender={onRender}>
      <DataGrid columns={columns} rows={rows} />
    </Profiler>
  );

  await safeTab();
  await userEvent.keyboard('{arrowdown}{arrowright}');
  await validateCellPosition(1, 1);

  onRender.mockClear();
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(1, 2);
  expect(onRender).toHaveBeenCalledOnce();
});

test('page up and page down without rows when rowHeight is a function', async () => {
  await setup({ columns, rows: Array.from<Row>({ length: 0 }), rowHeight: () => 35 });

  await safeTab();
  await validateCellPosition(0, 0);
  await userEvent.keyboard('{PageDown}');
  await validateCellPosition(0, 0);
  await userEvent.keyboard('{PageUp}');
  await validateCellPosition(0, 0);
});

test('arrow and tab navigation', async () => {
  await setup({ columns, rows });

  // pressing arrowleft on the leftmost cell does nothing
  await safeTab();
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(0, 1);
  await userEvent.keyboard('{arrowleft}');
  await validateCellPosition(0, 1);

  // pressing arrowright on the rightmost cell does nothing
  await userEvent.keyboard('{end}');
  await validateCellPosition(6, 1);
  await userEvent.keyboard('{arrowright}');
  await validateCellPosition(6, 1);

  // pressing tab on the rightmost cell navigates to the leftmost cell on the next row
  await safeTab();
  await validateCellPosition(0, 2);

  // pressing shift+tab on the leftmost cell navigates to the rightmost cell on the previous row
  await safeTab(true);
  await validateCellPosition(6, 1);
});

test('grid enter/exit', async () => {
  await page.render(
    <>
      <button type="button">Before</button>
      <DataGrid columns={[buttonColumn, ...columns]} rows={Array.from<Row>({ length: 5 })} />
      <button type="button">After</button>
    </>
  );

  const beforeButton = page.getByRole('button', { name: 'Before' });
  const afterButton = page.getByRole('button', { name: 'After' });

  // no initial active position
  await expect.element(activeCell).not.toBeInTheDocument();

  // tab into the grid
  await safeTab();
  await safeTab();
  await validateCellPosition(0, 0);
  await expect.element(activeButton).toHaveFocus();

  // shift+tab tabs out of the grid if we are at the first cell
  await safeTab(true);
  await expect.element(beforeButton).toHaveFocus();

  await safeTab();
  await validateCellPosition(0, 0);
  await expect.element(activeButton).toHaveFocus();

  await userEvent.keyboard('{arrowdown}{arrowdown}');
  await validateCellPosition(0, 2);
  await expect.element(activeButton).toHaveFocus();

  // tab should focus the last active cell
  // click outside the grid
  await userEvent.click(beforeButton);
  await safeTab();
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(0, 3);
  await expect.element(activeButton).toHaveFocus();

  // shift+tab should focus the last active cell
  // click outside the grid
  await userEvent.click(afterButton);
  await safeTab(true);
  await validateCellPosition(0, 3);
  await expect.element(activeButton).toHaveFocus();

  // tab tabs out of the grid if we are at the last cell
  await userEvent.keyboard('{Control>}{end}{/Control}');
  await safeTab();
  await expect.element(afterButton).toHaveFocus();
});

test('navigation with focusable cell content', async () => {
  await setup({ columns: [buttonColumn, ...columns], rows: Array.from<Row>({ length: 1 }) });
  await safeTab();
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(0, 1);

  // cell should not set tabIndex to 0 if it contains focusable content
  await expect.element(activeCell).toHaveAttribute('tabIndex', '-1');
  await expect.element(activeButton).toHaveFocus();
  await expect.element(activeButton).toHaveAttribute('tabIndex', '0');

  await safeTab();
  await validateCellPosition(1, 1);
  // cell should set tabIndex to 0 if it does not contain focusable content
  await expect.element(activeCell).toHaveAttribute('tabIndex', '0');
});

test('navigation when header cells have focusable elements', async () => {
  const columns: readonly Column<Row>[] = [
    {
      key: 'col2',
      name: 'col2',
      renderHeaderCell(p) {
        return <input data-testid="header-filter1" tabIndex={p.tabIndex} />;
      }
    },
    {
      key: 'col3',
      name: 'col3',
      renderHeaderCell(p) {
        return <input data-testid="header-filter2" tabIndex={p.tabIndex} />;
      }
    }
  ];

  await setup({ columns, rows: Array.from<Row>({ length: 2 }) });
  await safeTab();

  // should set focus on the header filter
  await expect.element(page.getByTestId('header-filter1')).toHaveFocus();

  await safeTab();
  await expect.element(page.getByTestId('header-filter2')).toHaveFocus();

  await safeTab();
  await validateCellPosition(0, 1);

  await safeTab(true);
  await expect.element(page.getByTestId('header-filter2')).toHaveFocus();

  await safeTab(true);
  await expect.element(page.getByTestId('header-filter1')).toHaveFocus();
});

test('navigation when the active cell is not in the viewport', async () => {
  const columns: Column<Row>[] = [];
  const activeRowCells = getRowWithCell(activeCell).getCell();
  for (let i = 0; i < 100; i++) {
    columns.push({ key: `col${i}`, name: `col${i}`, frozen: i < 5 });
  }
  await setup({ columns, rows });
  await safeTab();
  await validateCellPosition(0, 0);

  await userEvent.keyboard('{Control>}{end}{/Control}{arrowup}{arrowup}');
  await validateCellPosition(99, 98);
  await expect.element(activeRowCells).not.toHaveLength(1);
  scrollGrid({ top: 0 });
  await testCount(activeRowCells, 1);
  await userEvent.keyboard('{arrowup}');
  await validateCellPosition(99, 97);
  await expect.element(activeRowCells).not.toHaveLength(1);

  scrollGrid({ left: 0 });
  await userEvent.keyboard('{arrowdown}');
  await validateCellPosition(99, 98);

  await userEvent.keyboard(
    '{home}{arrowright}{arrowright}{arrowright}{arrowright}{arrowright}{arrowright}{arrowright}'
  );
  await validateCellPosition(7, 98);
  scrollGrid({ left: 2000 });
  await userEvent.keyboard('{arrowleft}');
  await validateCellPosition(6, 98);
});

test('reset active cell when column is removed', async () => {
  const columns: readonly Column<Row>[] = [
    { key: '1', name: '1' },
    { key: '2', name: '2' }
  ];
  const rows = [undefined, undefined];

  function Test({ columns }: { columns: readonly Column<Row>[] }) {
    return <DataGrid columns={columns} rows={rows} />;
  }

  const { rerender } = await page.render(<Test columns={columns} />);

  await safeTab();
  await userEvent.keyboard('{arrowdown}{arrowright}');
  await validateCellPosition(1, 1);

  await rerender(<Test columns={[columns[0]]} />);

  await expect.element(activeCell).not.toBeInTheDocument();
});

test('reset active cell when row is removed', async () => {
  const columns: readonly Column<Row>[] = [
    { key: '1', name: '1' },
    { key: '2', name: '2' }
  ];
  const rows = [undefined, undefined];

  function Test({ rows }: { rows: readonly undefined[] }) {
    return <DataGrid columns={columns} rows={rows} />;
  }

  const { rerender } = await page.render(<Test rows={rows} />);

  await safeTab();
  await userEvent.keyboard('{arrowdown}{arrowdown}{arrowright}');
  await validateCellPosition(1, 2);

  await rerender(<Test rows={[rows[0]]} />);

  await expect.element(activeCell).not.toBeInTheDocument();
});

test('the arrow keys keep their direction in a right-to-left page', async () => {
  await page.render(
    <div dir="rtl">
      <DataGrid columns={columns} rows={rows} />
    </div>
  );
  await safeTab();
  await validateCellPosition(0, 0);
  await userEvent.keyboard('{arrowright}');
  await validateCellPosition(1, 0);
  await userEvent.keyboard('{arrowleft}');
  await validateCellPosition(0, 0);
});
