import { ROW_HEADER_COLUMN_KEY } from './utils';
import type { Column } from './types';
import { rowHeaderCellClassname } from './style/cell';

/**
 * A start-frozen column that shows row numbers, like the row headers of a spreadsheet.
 * With `enableCellSelection`, clicking or dragging over its cells selects whole rows,
 * and clicking its header cell selects all the cells.
 * Spread it to customize it, for example `{ ...RowHeaderColumn, width: 60 }`, but keep its `key`.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export const RowHeaderColumn: Column<any, any> = {
  key: ROW_HEADER_COLUMN_KEY,
  name: '',
  width: 50,
  minWidth: 40,
  resizable: false,
  sortable: false,
  draggable: false,
  frozen: true,
  cellClass: rowHeaderCellClassname,
  renderCell({ rowIdx }) {
    return rowIdx + 1;
  }
};
