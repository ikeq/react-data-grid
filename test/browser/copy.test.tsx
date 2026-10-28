import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid } from '../../src';
import type { Column } from '../../src';
import { getCellsAtRowIndex, safeTab } from './utils';

interface Row {
  col: string;
}

const columns: readonly Column<Row>[] = [
  {
    key: 'col',
    name: 'Col'
  }
];

const rows: readonly Row[] = [
  {
    col: 'a1'
  },
  {
    col: 'a2'
  }
];

const onCellCopySpy = vi.fn();

function setup() {
  onCellCopySpy.mockClear();
  return page.render(<DataGrid columns={columns} rows={rows} onCellCopy={onCellCopySpy} />);
}

test('should call onCellCopy on cell copy', async () => {
  await setup();
  await userEvent.click(getCellsAtRowIndex(1).nth(0));
  await userEvent.copy();
  expect(onCellCopySpy).toHaveBeenCalledExactlyOnceWith(
    {
      row: rows[1],
      column: expect.objectContaining(columns[0])
    },
    expect.anything()
  );
});

test('should not call onCellCopy on header cells', async () => {
  await setup();
  await safeTab();
  await userEvent.copy();
  expect(onCellCopySpy).not.toHaveBeenCalled();
});
