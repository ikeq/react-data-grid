import { page } from 'vite-plus/test/browser';

import type { Column } from '../../../src';
import { cellClassname } from '../../../src/style/cell';
import { setup } from '../utils';

const headerCells = page.getHeaderCell();

test('headerCellClass is either nullish or a string', async () => {
  const columns: readonly Column<never>[] = [
    {
      key: 'id',
      name: 'ID'
    },
    {
      key: 'name',
      name: 'Name',
      headerCellClass: 'my-header'
    }
  ];

  await setup({ columns, rows: [] });
  await expect.element(headerCells.nth(0)).toHaveClass(cellClassname, { exact: true });
  await expect.element(headerCells.nth(1)).toHaveClass(cellClassname, 'my-header', { exact: true });
});
