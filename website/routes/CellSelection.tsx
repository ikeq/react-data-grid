import { useCallback, useState } from 'react';
import { faker } from '@faker-js/faker';
import { createFileRoute } from '@tanstack/react-router';
import { css } from 'ecij';

import { DataGrid, RowHeaderColumn } from '../../src';
import type {
  CellSelection as CellSelectionValue,
  CellSelectionContextMenuArgs,
  Column,
  SelectedCells,
  SortColumn
} from '../../src';
import { ContextMenu, renderSortableHeaderCell, type ContextMenuItem } from '../components';
import { compare, copySelectedCellsToClipboard, exportSelectedCellsToCsv } from '../utils';

export const Route = createFileRoute('/CellSelection')({
  component: CellSelection
});

const toolbarClassname = css`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-block-end: 8px;
`;

interface Row {
  id: number;
  name: string;
  email: string;
  city: string;
  country: string;
  company: string;
  jobTitle: string;
  price: number;
  quantity: number;
}

function createRows(): readonly Row[] {
  return Array.from({ length: 1000 }, (_, id) => ({
    id,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    city: faker.location.city(),
    country: faker.location.country(),
    company: faker.company.name(),
    jobTitle: faker.person.jobTitle(),
    price: Number(faker.commerce.price()),
    quantity: faker.number.int({ min: 1, max: 100 })
  }));
}

const columns: readonly Column<Row>[] = [
  // row numbers: click or drag to select rows, click its header cell to select all
  RowHeaderColumn,
  { key: 'name', name: 'Name', width: 180 },
  { key: 'email', name: 'Email', width: 240 },
  { key: 'city', name: 'City', width: 160 },
  { key: 'country', name: 'Country', width: 180 },
  { key: 'company', name: 'Company', width: 220 },
  { key: 'jobTitle', name: 'Job Title', width: 240 },
  { key: 'price', name: 'Price', width: 100 },
  { key: 'quantity', name: 'Quantity', width: 100 }
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

function countCells(cellSelection: CellSelectionValue) {
  return cellSelection.reduce(
    (count, range) =>
      count + (range.endIdx - range.startIdx + 1) * (range.endRowIdx - range.startRowIdx + 1),
    0
  );
}

interface MenuState {
  top: number;
  left: number;
  args: CellSelectionContextMenuArgs<Row>;
  selectedCells: SelectedCells<Row>[];
}

function CellSelection() {
  const [rows] = useState(createRows);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [cellSelection, setCellSelection] = useState<CellSelectionValue>([]);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const sortedRows = sortRows(rows, sortColumns);

  const items: (ContextMenuItem | null)[] = [];
  if (menu !== null) {
    const { args, selectedCells } = menu;
    const { column } = args;
    if (args.target === 'COLUMN_HEADER' && column !== undefined) {
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
        <span>
          Click or drag over cells, row numbers, or column headers to select them. Shift + click or
          Shift + arrow keys extend the selection, Ctrl/Cmd + click adds a range, and the top-left
          cell or Ctrl/Cmd + A selects all. Right-click to copy, export, or sort.
        </span>
        <output>
          {cellSelection.length} range(s), {countCells(cellSelection)} cell(s)
        </output>
      </div>
      <DataGrid
        aria-label="Cell Selection Example"
        rowKeyGetter={rowKeyGetter}
        columns={columns}
        rows={sortedRows}
        defaultColumnOptions={{ sortable: true, renderHeaderCell: renderSortableHeaderCell }}
        className="fill-grid"
        sortColumns={sortColumns}
        onSortColumnsChange={setSortColumns}
        cellSelection={cellSelection}
        onCellSelectionChange={setCellSelection}
        onCellSelectionContextMenu={(args, event) => {
          // replace the browser's context menu
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
