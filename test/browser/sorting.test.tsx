import { useState } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid, renderHeaderCell, type Column, type SortColumn } from '../../src';

const columns: readonly Column<never>[] = [
  { key: 'colA', name: 'colA' },
  { key: 'colB', name: 'colB', sortDescendingFirst: true },
  { key: 'colC', name: 'colC' },
  { key: 'colD', name: 'colD', sortable: false }
];

function TestGrid() {
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  return (
    <>
      <DataGrid
        columns={columns}
        rows={[]}
        defaultColumnOptions={{
          sortable: true,
          // clicking the header cell selects the column, so the columns are sorted with a button
          renderHeaderCell(props) {
            return (
              <>
                {renderHeaderCell(props)}
                <button type="button" onClick={props.onSort}>
                  Sort {props.column.key}
                </button>
              </>
            );
          }
        }}
        sortColumns={sortColumns}
        onSortColumnsChange={setSortColumns}
      />
      <div data-testid="sortColumnsValue">{JSON.stringify(sortColumns)}</div>
    </>
  );
}

function setup() {
  return page.render(<TestGrid />);
}

// Ctrl + click opens the context menu on macOS, so multi-sort uses Cmd there
const multiSortKey = navigator.platform.startsWith('Mac') ? 'Meta' : 'Control';

function getSortButton(name: string) {
  return page.getByRole('button', { name: `Sort ${name}` });
}

function testSortColumns(expectedValue: readonly SortColumn[]) {
  return expect
    .element(page.getByTestId('sortColumnsValue'))
    .toHaveTextContent(JSON.stringify(expectedValue));
}

test('should not sort if sortable is false', async () => {
  await setup();
  const headerCell = page.getHeaderCell({ name: 'colD', exact: false });
  const sortButton = getSortButton('colD');
  await userEvent.click(sortButton);
  await expect.element(headerCell).not.toHaveAttribute('aria-sort');
  await testSortColumns([]);
});

test('single column sort', async () => {
  await setup();
  const headerCell = page.getHeaderCell({ name: 'colA', exact: false });
  const sortButton = getSortButton('colA');
  await userEvent.click(sortButton);
  await expect.element(headerCell).toHaveAttribute('aria-sort', 'ascending');
  // priority is not shown for single sort
  await expect.element(headerCell).not.toHaveTextContent('1');
  await testSortColumns([{ columnKey: 'colA', direction: 'ASC' }]);
  await userEvent.click(sortButton);
  await expect.element(headerCell).toHaveAttribute('aria-sort', 'descending');
  await testSortColumns([{ columnKey: 'colA', direction: 'DESC' }]);
  await userEvent.click(sortButton);
  await expect.element(headerCell).not.toHaveAttribute('aria-sort');
  await testSortColumns([]);
});

test('multi-column sort', async () => {
  await setup();
  const headerCell1 = page.getHeaderCell({ name: 'colA', exact: false });
  const headerCell2 = page.getHeaderCell({ name: 'colB', exact: false });
  const headerCell3 = page.getHeaderCell({ name: 'colC', exact: false });
  const sortButton1 = getSortButton('colA');
  const sortButton2 = getSortButton('colB');
  const sortButton3 = getSortButton('colC');
  const priority1 = headerCell1.getBySelector('span:has(> .rdg-sort-arrow)');
  const priority2 = headerCell2.getBySelector('span:has(> .rdg-sort-arrow)');
  const priority3 = headerCell3.getBySelector('span:has(> .rdg-sort-arrow)');
  await userEvent.click(sortButton1);
  await userEvent.keyboard(`{${multiSortKey}>}`);
  await userEvent.click(sortButton2);
  await userEvent.click(sortButton3);

  // aria-sort is only added for single sort
  await expect.element(headerCell1).not.toHaveAttribute('aria-sort');
  await expect.element(priority1).toHaveTextContent('1');
  await expect.element(headerCell2).not.toHaveAttribute('aria-sort');
  await expect.element(priority2).toHaveTextContent('2');
  await expect.element(headerCell3).not.toHaveAttribute('aria-sort');
  await expect.element(priority3).toHaveTextContent('3');
  await testSortColumns([
    { columnKey: 'colA', direction: 'ASC' },
    { columnKey: 'colB', direction: 'DESC' },
    { columnKey: 'colC', direction: 'ASC' }
  ]);

  await userEvent.click(sortButton2);
  await testSortColumns([
    { columnKey: 'colA', direction: 'ASC' },
    { columnKey: 'colB', direction: 'ASC' },
    { columnKey: 'colC', direction: 'ASC' }
  ]);
  await userEvent.click(sortButton2);
  await testSortColumns([
    { columnKey: 'colA', direction: 'ASC' },
    { columnKey: 'colC', direction: 'ASC' }
  ]);
  await expect.element(priority3).toHaveTextContent('2');

  // clicking on a column without ctrlKey should remove multisort
  await userEvent.keyboard(`{/${multiSortKey}}`);
  await userEvent.click(sortButton2);
  await testSortColumns([{ columnKey: 'colB', direction: 'DESC' }]);
  await expect.element(headerCell2).toHaveAttribute('aria-sort');
  await expect.element(priority2).toHaveTextContent('');
});

test('multi-column sort with metakey', async () => {
  await setup();
  await userEvent.click(getSortButton('colA'));
  await userEvent.keyboard('{Meta>}');
  await userEvent.click(getSortButton('colB'));
  await testSortColumns([
    { columnKey: 'colA', direction: 'ASC' },
    { columnKey: 'colB', direction: 'DESC' }
  ]);
});

test('sort with keyboard', async () => {
  await setup();
  // the sort button is a regular button, sorting with Enter and Space
  getSortButton('colA').element().focus();
  await userEvent.keyboard('{enter}');
  await testSortColumns([{ columnKey: 'colA', direction: 'ASC' }]);
  await userEvent.keyboard(' ');
  await testSortColumns([{ columnKey: 'colA', direction: 'DESC' }]);
});

test('clicking a header cell does not sort', async () => {
  await setup();
  await userEvent.click(page.getHeaderCell({ name: 'colA', exact: false }), {
    position: { x: 2, y: 2 }
  });
  await testSortColumns([]);
});
