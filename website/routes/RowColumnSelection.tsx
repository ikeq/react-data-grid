import { useCallback, useState } from 'react';
import { faker } from '@faker-js/faker';
import { createFileRoute } from '@tanstack/react-router';
import { css } from 'ecij';

import { DataGrid, RowHeaderColumn } from '../../src';
import type { CellSelectionContextMenuArgs, Column, SelectedCells, SortColumn } from '../../src';
import { ContextMenu, type ContextMenuItem } from '../components';
import { compare, copySelectedCellsToClipboard, exportSelectedCellsToCsv } from '../utils';
import { useDirection } from '../directionContext';

export const Route = createFileRoute('/RowColumnSelection')({
  component: RowColumnSelection
});

const toolbarClassname = css`
  margin-block-end: 8px;
`;

interface Row {
  id: number;
  task: string;
  assignee: string;
  priority: string;
  status: string;
  progress: number;
  dueDate: string;
}

function createRows(): readonly Row[] {
  return Array.from({ length: 500 }, (_, id) => ({
    id,
    task: `Task #${id + 1}`,
    assignee: faker.person.fullName(),
    priority: faker.helpers.arrayElement(['Critical', 'High', 'Medium', 'Low']),
    status: faker.helpers.arrayElement(['To Do', 'In Progress', 'Review', 'Done']),
    progress: faker.number.int({ min: 0, max: 100 }),
    dueDate: faker.date.future().toISOString().slice(0, 10)
  }));
}

const columns: readonly Column<Row>[] = [
  // row numbers: click or drag to select rows, click its header cell to select all
  RowHeaderColumn,
  { key: 'task', name: 'Task', width: 120, sortable: true },
  { key: 'assignee', name: 'Assignee', sortable: true },
  { key: 'priority', name: 'Priority', width: 110, sortable: true },
  { key: 'status', name: 'Status', width: 120, sortable: true },
  { key: 'progress', name: 'Progress', width: 100, sortable: true },
  { key: 'dueDate', name: 'Due Date', width: 120, sortable: true }
];

function rowKeyGetter(row: Row) {
  return row.id;
}

function sortRows(rows: readonly Row[], sortColumns: readonly SortColumn[]) {
  if (sortColumns.length === 0) return rows;
  return rows.toSorted((a, b) => {
    for (const { columnKey, direction } of sortColumns) {
      const key = columnKey as keyof Row;
      const result =
        typeof a[key] === 'number'
          ? a[key] - (b[key] as number)
          : compare(a[key], b[key] as string);
      if (result !== 0) return direction === 'ASC' ? result : -result;
    }
    return 0;
  });
}

interface MenuState {
  top: number;
  left: number;
  args: CellSelectionContextMenuArgs<Row>;
  selectedCells: SelectedCells<Row>[];
}

function RowColumnSelection() {
  const direction = useDirection();
  const [rows] = useState(createRows);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const sortedRows = sortRows(rows, sortColumns);

  const items: (ContextMenuItem | null)[] = [];
  if (menu !== null) {
    const { args, selectedCells } = menu;
    const { column } = args;
    // clicking a header cell selects the column, so sorting moves to the context menu, like in a spreadsheet
    if (args.target === 'COLUMN_HEADER' && column?.sortable) {
      items.push(
        {
          label: `Sort "${String(column.name)}" Ascending`,
          onSelect: () => setSortColumns([{ columnKey: column.key, direction: 'ASC' }])
        },
        {
          label: `Sort "${String(column.name)}" Descending`,
          onSelect: () => setSortColumns([{ columnKey: column.key, direction: 'DESC' }])
        }
      );
      if (sortColumns.length > 0) {
        items.push({ label: 'Clear Sorting', onSelect: () => setSortColumns([]) });
      }
      items.push(null);
    }
    items.push(
      { label: 'Copy', onSelect: () => copySelectedCellsToClipboard(selectedCells, false) },
      {
        label: 'Copy with Headers',
        onSelect: () => copySelectedCellsToClipboard(selectedCells, true)
      },
      {
        label: 'Export to CSV',
        onSelect: () => exportSelectedCellsToCsv(selectedCells, 'Selection.csv')
      }
    );
  }

  return (
    <>
      <div className={toolbarClassname}>
        Click or drag over row numbers to select rows, and over column headers to select columns.
        Shift + click extends the selection, Ctrl/Cmd + click adds to it, and the top-left cell
        selects all. Right-click to copy or export the selection, and to sort a column.
      </div>
      <DataGrid
        aria-label="Row and Column Selection Example"
        rowKeyGetter={rowKeyGetter}
        columns={columns}
        rows={sortedRows}
        className="fill-grid"
        direction={direction}
        sortColumns={sortColumns}
        onSortColumnsChange={setSortColumns}
        enableCellSelection
        onCellSelectionContextMenu={(args, event) => {
          event.preventDefault();
          setMenu({
            top: event.clientY,
            left: event.clientX,
            args,
            selectedCells: args.getSelectedCells()
          });
        }}
      />
      {menu !== null && (
        <ContextMenu top={menu.top} left={menu.left} items={items} onClose={closeMenu} />
      )}
    </>
  );
}
