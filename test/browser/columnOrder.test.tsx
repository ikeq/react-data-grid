import { page } from 'vite-plus/test/browser';

import { DataGrid } from '../../src';
import type { Column } from '../../src';
import { testCount } from './utils';

const headerCells = page.getHeaderCell();

const frozen1: Column<unknown> = {
  key: 'f1',
  name: 'frz1',
  frozen: true
};

const frozen2: Column<unknown> = {
  key: 'f2',
  name: 'frz2',
  frozen: true
};

const standard1: Column<unknown> = {
  key: 's1',
  name: 'std1'
};

const standard2: Column<unknown> = {
  key: 's2',
  name: 'std2'
};

test('column order', async () => {
  const rows: readonly unknown[] = [];

  async function run(columns: readonly Column<unknown>[]) {
    const { unmount } = await page.render(<DataGrid columns={columns} rows={rows} />);

    await testCount(headerCells, expected.length);
    for (const [n, text] of expected.entries()) {
      await expect.element(headerCells.nth(n)).toHaveTextContent(text);
    }
    await unmount();
  }

  // frozen columns come first, in their definition order
  const expected: readonly string[] = ['frz1', 'frz2', 'std1', 'std2'];

  await run([frozen1, frozen2, standard1, standard2]);
  await run([standard1, standard2, frozen1, frozen2]);
  await run([standard1, frozen1, standard2, frozen2]);
});
