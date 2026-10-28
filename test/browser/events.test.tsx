import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid } from '../../src';
import type { Column } from '../../src';
import { safeTab } from './utils';

interface Row {
  col1: number;
  col2: string;
}

const columns: readonly Column<Row>[] = [
  {
    key: 'col1',
    name: 'Col1'
  },
  {
    key: 'col2',
    name: 'Col2'
  }
];

const rows: readonly Row[] = [
  {
    col1: 1,
    col2: 'a1'
  },
  {
    col1: 2,
    col2: 'a2'
  }
];

describe('Events', () => {
  it('should call onCellClick and onCellDoubleClick', async () => {
    const onCellClick = vi.fn();
    const onCellDoubleClick = vi.fn();
    await page.render(
      <DataGrid
        columns={columns}
        rows={rows}
        onCellClick={onCellClick}
        onCellDoubleClick={onCellDoubleClick}
      />
    );

    await userEvent.click(page.getCell({ name: 'a1' }));
    expect(onCellClick).toHaveBeenCalledExactlyOnceWith(
      { column: expect.objectContaining(columns[1]), row: rows[0], rowIdx: 0 },
      expect.objectContaining({ type: 'click' })
    );

    await userEvent.dblClick(page.getCell({ name: '2' }));
    expect(onCellDoubleClick).toHaveBeenCalledExactlyOnceWith(
      { column: expect.objectContaining(columns[0]), row: rows[1], rowIdx: 1 },
      expect.objectContaining({ type: 'dblclick' })
    );
  });

  it('should call onActivePositionChange when the active position changes', async () => {
    const onActivePositionChange = vi.fn();

    await page.render(
      <DataGrid columns={columns} rows={rows} onActivePositionChange={onActivePositionChange} />
    );

    expect(onActivePositionChange).not.toHaveBeenCalled();

    // Activated by click
    await userEvent.click(page.getCell({ name: 'a1' }));
    expect(onActivePositionChange).toHaveBeenLastCalledWith({
      column: expect.objectContaining(columns[1]),
      row: rows[0],
      rowIdx: 0
    });
    expect(onActivePositionChange).toHaveBeenCalledOnce();

    // Activated by double-click
    await userEvent.dblClick(page.getCell({ name: '1' }));
    expect(onActivePositionChange).toHaveBeenLastCalledWith({
      column: expect.objectContaining(columns[0]),
      row: rows[0],
      rowIdx: 0
    });
    expect(onActivePositionChange).toHaveBeenCalledTimes(2);

    // Activated by right-click
    await userEvent.click(page.getCell({ name: '2' }), { button: 'right' });
    expect(onActivePositionChange).toHaveBeenLastCalledWith({
      column: expect.objectContaining(columns[0]),
      row: rows[1],
      rowIdx: 1
    });
    expect(onActivePositionChange).toHaveBeenCalledTimes(3);

    // Activated by ←↑→↓ keys
    await userEvent.keyboard('{ArrowUp}');
    expect(onActivePositionChange).toHaveBeenLastCalledWith({
      column: expect.objectContaining(columns[0]),
      row: rows[0],
      rowIdx: 0
    });
    expect(onActivePositionChange).toHaveBeenCalledTimes(4);

    // Activated by Tab key
    await safeTab();
    expect(onActivePositionChange).toHaveBeenLastCalledWith({
      column: expect.objectContaining(columns[1]),
      row: rows[0],
      rowIdx: 0
    });
    expect(onActivePositionChange).toHaveBeenCalledTimes(5);

    // go to the header row
    await userEvent.keyboard('{ArrowUp}');
    expect(onActivePositionChange).toHaveBeenLastCalledWith({
      column: expect.objectContaining(columns[1]),
      row: undefined,
      rowIdx: -1
    });
    expect(onActivePositionChange).toHaveBeenCalledTimes(6);
  });

  it('should not call parent handlers if a cell event handler stops propagation', async () => {
    const onParentClick = vi.fn();
    const onParentKeyDown = vi.fn();

    await page.render(
      <div onClick={onParentClick} onKeyDown={onParentKeyDown}>
        <DataGrid
          columns={columns}
          rows={rows}
          onCellClick={(args, event) => {
            if (args.column.key === 'col1') {
              event.stopPropagation();
            }
          }}
          onCellKeyDown={(args, event) => {
            if (args.column.key === 'col1') {
              event.stopPropagation();
            }
          }}
        />
      </div>
    );

    await userEvent.click(page.getCell({ name: '1' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(onParentClick).not.toHaveBeenCalled();
    expect(onParentKeyDown).not.toHaveBeenCalled();

    await userEvent.click(page.getCell({ name: 'a1' }));
    await userEvent.keyboard('{ArrowLeft}');
    expect(onParentClick).toHaveBeenCalledOnce();
    expect(onParentKeyDown).toHaveBeenCalledOnce();
  });

  it('should not navigate if onCellKeyDown prevents the grid default', async () => {
    await page.render(
      <DataGrid
        columns={columns}
        rows={rows}
        onCellKeyDown={(args, event) => {
          if (args.column.key === 'col1') {
            event.preventGridDefault();
          }
        }}
      />
    );

    await userEvent.click(page.getCell({ name: '1' }));
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(page.getActiveCell()).toHaveTextContent('1');
    await userEvent.click(page.getCell({ name: 'a1' }));
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getActiveCell()).toHaveTextContent('a2');
  });
});
