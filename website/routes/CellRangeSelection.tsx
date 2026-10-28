import { useCallback, useState } from 'react';
import { faker } from '@faker-js/faker';
import { createFileRoute } from '@tanstack/react-router';
import { css } from 'ecij';

import { DataGrid } from '../../src';
import type { CellSelection, Column, SelectedCells } from '../../src';
import { ContextMenu, type ContextMenuItem } from '../components';
import { copySelectedCellsToClipboard, exportSelectedCellsToCsv } from '../utils';
import { useDirection } from '../directionContext';

export const Route = createFileRoute('/CellRangeSelection')({
  component: CellRangeSelection
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
  product: string;
  price: string;
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
    product: faker.commerce.productName(),
    price: faker.commerce.price(),
    quantity: faker.number.int({ min: 1, max: 100 })
  }));
}

const columns: readonly Column<Row>[] = [
  { key: 'id', name: 'ID', width: 60, frozen: true },
  { key: 'name', name: 'Name', width: 180 },
  { key: 'email', name: 'Email', width: 240 },
  { key: 'city', name: 'City', width: 160 },
  { key: 'country', name: 'Country', width: 180 },
  { key: 'company', name: 'Company', width: 220 },
  { key: 'jobTitle', name: 'Job Title', width: 240 },
  { key: 'product', name: 'Product', width: 220 },
  { key: 'price', name: 'Price', width: 100 },
  { key: 'quantity', name: 'Quantity', width: 100 }
];

function rowKeyGetter(row: Row) {
  return row.id;
}

function countCells(cellSelection: CellSelection) {
  return cellSelection.reduce(
    (count, range) =>
      count + (range.endIdx - range.startIdx + 1) * (range.endRowIdx - range.startRowIdx + 1),
    0
  );
}

interface MenuState {
  top: number;
  left: number;
  selectedCells: SelectedCells<Row>[];
}

function CellRangeSelection() {
  const direction = useDirection();
  const [rows] = useState(createRows);
  const [cellSelection, setCellSelection] = useState<CellSelection>([]);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const items: ContextMenuItem[] = [];
  if (menu !== null) {
    const { selectedCells } = menu;
    items.push(
      { label: 'Copy', onSelect: () => copySelectedCellsToClipboard(selectedCells, false) },
      {
        label: 'Copy with Headers',
        onSelect: () => copySelectedCellsToClipboard(selectedCells, true)
      },
      {
        label: 'Export to CSV',
        onSelect: () => exportSelectedCellsToCsv(selectedCells, 'Cells.csv')
      }
    );
  }

  return (
    <>
      <div className={toolbarClassname}>
        <span>
          Drag over cells to select a range, Shift + click or Shift + arrow keys to extend it,
          Ctrl/Cmd + click to add a range, and right-click to copy or export it.
        </span>
        <output>
          {cellSelection.length} range(s), {countCells(cellSelection)} cell(s)
        </output>
      </div>
      <DataGrid
        aria-label="Cell Range Selection Example"
        rowKeyGetter={rowKeyGetter}
        columns={columns}
        rows={rows}
        className="fill-grid"
        direction={direction}
        cellSelection={cellSelection}
        onCellSelectionChange={setCellSelection}
        onCellSelectionContextMenu={(args, event) => {
          // replace the browser's context menu
          event.preventDefault();
          setMenu({
            top: event.clientY,
            left: event.clientX,
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
