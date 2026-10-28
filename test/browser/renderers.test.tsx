import { page } from 'vite-plus/test/browser';

import type { Column } from '../../src';
import { setup, testRowCount } from './utils';

interface Row {
  id: number;
}

const columns: readonly Column<Row>[] = [{ key: 'id', name: 'ID' }];
const noRows: readonly Row[] = [];

function NoRowsFallback() {
  return <div>No rows fallback</div>;
}

test('noRowsFallback is rendered when there are no rows', async () => {
  await setup({ columns, rows: noRows, renderers: { noRowsFallback: <NoRowsFallback /> } });

  await testRowCount(0);
  await expect.element(page.getByText('No rows fallback')).toBeInTheDocument();
});

test('noRowsFallback is not rendered when there are rows', async () => {
  await setup({ columns, rows: [{ id: 1 }], renderers: { noRowsFallback: <NoRowsFallback /> } });

  await testRowCount(1);
  await expect.element(page.getByText('No rows fallback')).not.toBeInTheDocument();
});
