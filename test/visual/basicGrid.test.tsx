import { page } from 'vite-plus/test/browser';

import { DataGrid, RowHeaderColumn, type Column } from '../../src';

const grid = page.getGrid();

interface Row {
  id: number;
  name: string;
}

const columns: readonly Column<Row>[] = [
  RowHeaderColumn,
  {
    key: 'name',
    name: 'Name'
  }
];

const rows: readonly Row[] = [
  { id: 1, name: 'Row 1' },
  { id: 2, name: 'Row 2' },
  { id: 3, name: 'Row 3' }
];

function rowKeyGetter(row: Row) {
  return row.id;
}

test('basic grid', async () => {
  await page.render(
    <DataGrid rowKeyGetter={rowKeyGetter} columns={columns} rows={rows} style={{ height: 350 }} />
  );

  await expect.element(grid).toMatchScreenshot('basic-grid');
});
