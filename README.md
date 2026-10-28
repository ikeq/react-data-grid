# @ikeq/react-data-grid

A read-only data grid for React, with spreadsheet-like cell selection, for previewing large tables like CSV files.

It is a fork of [react-data-grid](https://github.com/Comcast/react-data-grid), trimmed down to a read-only grid: editing, row selection, grouping, column spans and groups, summary rows, column reordering, and right-to-left support were removed.

## Features

- Virtualization: rows and columns outside the viewport are not rendered, so large tables stay fast
- Spreadsheet-like cell selection: drag to select a range, Shift to extend it, Ctrl/Cmd to add ranges, select whole rows and columns, and Ctrl/Cmd + C to copy
- Row numbers with `RowHeaderColumn`
- Frozen columns, at the start or the end
- Column resizing, by dragging or with the keyboard, and auto-sizing with a double click
- Sorting by one or multiple columns, from controls in header cells
- Custom cell and header cell content
- Keyboard navigation
- Light and dark themes, and forced colors mode
- Zebra stripes
- No dependencies, with TypeScript types

## Installation

```sh
npm install @ikeq/react-data-grid
```

Import the styles once in your application:

```tsx
import '@ikeq/react-data-grid/lib/styles.css';
```

The package is published as ECMAScript modules, and requires React 19.2+.

The styles use `light-dark()`, and Lightning CSS, which Vite 8+ uses to minify CSS, has a [bug minifying `light-dark()`](https://github.com/parcel-bundler/lightningcss/issues/873). Set `build.cssMinify` to `'esbuild'` or `build.cssTarget` to `'esnext'` in your Vite config as a workaround.

## Getting Started

```tsx
import '@ikeq/react-data-grid/lib/styles.css';

import { DataGrid, RowHeaderColumn, type Column } from '@ikeq/react-data-grid';

interface Row {
  id: number;
  title: string;
}

const columns: readonly Column<Row>[] = [
  RowHeaderColumn,
  { key: 'id', name: 'ID' },
  { key: 'title', name: 'Title' }
];

const rows: readonly Row[] = [
  { id: 0, title: 'Example' },
  { id: 1, title: 'Demo' }
];

function App() {
  return <DataGrid columns={columns} rows={rows} rowKeyGetter={(row) => row.id} />;
}
```

The grid is 350px tall by default, set its size with `className` or `style`.

## Cell Selection

The cell selection is always enabled, and works like in a spreadsheet:

- Click a cell, or drag over cells, to select a range. Dragging past the edge of the grid scrolls it.
- Shift + click, or Shift + arrow keys, Home, End, PageUp, PageDown, extend the last range.
- Ctrl/Cmd + click or drag adds a range.
- Click or drag over header cells to select columns, and over `RowHeaderColumn` cells to select rows.
- Click the top-left cell, or press Ctrl/Cmd + A, to select all the cells.
- Ctrl/Cmd + C copies the selected cells as tab-separated text, which spreadsheets paste into separate cells.

The header cells of the selected columns, and the row numbers of the selected rows, are highlighted.

A selection is a list of ranges. Only data rows can be selected, and the column indexes include `RowHeaderColumn` when it is used:

```ts
interface CellRange {
  readonly startIdx: number; // first column index
  readonly endIdx: number; // last column index, inclusive
  readonly startRowIdx: number; // first row index
  readonly endRowIdx: number; // last row index, inclusive
}

type CellSelection = readonly CellRange[];
```

The grid manages the selection by default. Pass `cellSelection` and `onCellSelectionChange` to control it:

```tsx
const [cellSelection, setCellSelection] = useState<CellSelection>([]);

<DataGrid
  columns={columns}
  rows={rows}
  cellSelection={cellSelection}
  onCellSelectionChange={setCellSelection}
/>;
```

### Selected Cells

`getSelectedCells()` returns the rows and columns of each range. The rows come from `rows`, not from the rendered cells, so they include the rows that virtualization didn't render. The columns don't include `RowHeaderColumn`.

```ts
interface SelectedCells<R> {
  readonly range: CellRange;
  readonly columns: readonly CalculatedColumn<R>[];
  readonly rows: readonly R[];
}
```

`getSelectedCellsText(selectedCells, { includeHeader })` returns the text that Ctrl/Cmd + C copies: the values are `row[column.key]`, separated by tabs, values with tabs, line breaks, or quotes are quoted, and ranges are separated by an empty line.

### Context Menu

`onCellSelectionContextMenu` is called when a cell, a row number, or a header cell is right-clicked. Like in a spreadsheet, right-clicking outside of the selection first selects the cell, row, or column. Call `event.preventDefault()` to replace the browser's context menu:

```tsx
<DataGrid
  columns={columns}
  rows={rows}
  onCellSelectionContextMenu={(args, event) => {
    event.preventDefault();
    openMenu(event.clientX, event.clientY, args.getSelectedCells());
  }}
/>
```

```ts
interface CellSelectionContextMenuArgs<R> {
  // the selection, updated to include the right-clicked cell, row, or column
  readonly selection: CellSelection;
  // the column of the right-clicked cell or header cell, `undefined` for row numbers
  readonly column: CalculatedColumn<R> | undefined;
  readonly target: 'CELL' | 'ROW_HEADER' | 'COLUMN_HEADER' | 'ALL';
  readonly getSelectedCells: () => SelectedCells<R>[];
}
```

### Row Numbers

`RowHeaderColumn` is a start-frozen column that shows row numbers. Clicking or dragging over its cells selects whole rows, and clicking its header cell selects all the cells. Spread it to customize it, and keep its `key`:

```tsx
const columns = [{ ...RowHeaderColumn, width: 60 }, ...otherColumns];
```

## Sorting

The grid doesn't sort the rows: sort them yourself with `sortColumns`, and update it in `onSortColumnsChange`.

Clicking a header cell selects its column, so the column is sorted by a control in the header cell that calls `onSort`. `onSort` cycles through ascending, descending, and not sorted, or starts with descending when `sortDescendingFirst` is set. With Ctrl/Cmd held, it adds the column to the sorted columns.

```tsx
import {
  renderSortIcon,
  renderSortPriority,
  type RenderHeaderCellContentProps
} from '@ikeq/react-data-grid';

function renderSortableHeaderCell<R>({
  column,
  sortDirection,
  priority,
  tabIndex,
  onSort
}: RenderHeaderCellContentProps<R>) {
  if (!column.sortable) return column.name;

  return (
    <>
      {column.name}
      <button type="button" tabIndex={tabIndex} onClick={onSort}>
        {sortDirection === undefined ? '⇅' : renderSortIcon({ sortDirection })}
        {renderSortPriority({ priority })}
      </button>
    </>
  );
}

function App() {
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const sortedRows = useMemo(() => sortRows(rows, sortColumns), [sortColumns]);

  return (
    <DataGrid
      columns={columns}
      rows={sortedRows}
      defaultColumnOptions={{ sortable: true, renderHeaderCell: renderSortableHeaderCell }}
      sortColumns={sortColumns}
      onSortColumnsChange={setSortColumns}
    />
  );
}
```

The default header cell content shows the column name and its sort status, without a control to sort it.

## Keyboard Shortcuts

| Keys                                       | Action                                                           |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Arrow keys                                 | Move the active cell, and select it                              |
| Tab, Shift + Tab                           | Move to the next or previous cell, and leave the grid at its end |
| Home, End                                  | Move to the first or last cell of the row                        |
| Ctrl/Cmd + Home, End                       | Move to the first or last cell of the grid                       |
| PageUp, PageDown                           | Move up or down by a page                                        |
| Shift + arrow keys, Home, End, PageUp/Down | Extend the selection                                             |
| Ctrl/Cmd + A                               | Select all the cells                                             |
| Ctrl/Cmd + C                               | Copy the selected cells                                          |
| Ctrl/Cmd + Left, Right on a header cell    | Resize a resizable column                                        |

Controls in cells and header cells receive the focus when their cell is active, if they use the `tabIndex` passed to `renderCell` and `renderHeaderCell`. Stop the propagation of the arrow keys in inputs, so they move the caret instead of the active cell.

## Styling

### Themes

The grid follows `color-scheme`. Set it on `:root`, or add the `rdg-light` or `rdg-dark` class to a grid:

```tsx
<DataGrid className="rdg-dark" columns={columns} rows={rows} />
```

### CSS Variables

```css
.rdg {
  --rdg-font-size: 12px;
  /* the text of the data cells */
  --rdg-color: light-dark(#888, #ddd);
  --rdg-background-color: light-dark(hsl(0deg 0% 100%), hsl(0deg 0% 13%));

  /* the header cells and the row numbers */
  --rdg-header-background-color: var(--rdg-background-color);
  --rdg-header-color: light-dark(#000, #fff);

  /* the lines below the header and next to the frozen columns */
  --rdg-border-width: 1px;
  --rdg-border-color: light-dark(#ddd, #444);

  /* rows */
  /* the hovered data cell */
  --rdg-cell-hover-background-color: light-dark(hsl(0deg 0% 96%), hsl(0deg 0% 9%));
  /* every other row, starting with the first row, set it to var(--rdg-background-color) to remove the stripes */
  --rdg-row-stripe-background-color: light-dark(hsl(0deg 0% 97.5%), hsl(0deg 0% 15%));

  /* the active cell */
  --rdg-selection-width: 1px;
  --rdg-selection-color: light-dark(#000, #fff);

  /* the selected cells, and the border around each range */
  --rdg-cell-selection-background-color: rgba(0, 0, 0, 0.05);
  --rdg-cell-selection-border-color: var(--rdg-selection-color);
  --rdg-cell-selection-border-width: var(--rdg-selection-width);

  /* the header cells of the selected columns, and the row numbers of the selected rows */
  --rdg-header-selection-background-color: var(--rdg-cell-hover-background-color);
  --rdg-header-selection-color: var(--rdg-header-color);
}
```

The styles are not in cascade layers, so your rules override them when their selectors are at least as specific, and come after `styles.css`.

### Classes

- `className` and `style` apply to the grid.
- `rowClass(row, rowIdx)` and `headerRowClass` apply to rows.
- `cellClass`, a string or a function of the row, and `headerCellClass` apply to the cells of a column.

## API Reference

### `<DataGrid />`

`DataGrid<R, K extends React.Key = React.Key>`, where `R` is the row type and `K` the row key type.

| Prop                         | Type                                                                       | Description                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `columns`                    | `readonly Column<R>[]`                                                     | Column definitions. Memoize them, or define them outside the component                                     |
| `rows`                       | `readonly R[]`                                                             | Rows, of any type                                                                                          |
| `rowKeyGetter`               | `(row: R) => K`                                                            | Returns a unique key for each row, used as the React key of rows                                           |
| `ref`                        | `React.Ref<DataGridHandle>`                                                | See [`DataGridHandle`](#datagridhandle)                                                                    |
| `rowHeight`                  | `number \| ((row: R) => number)`                                           | Row height in pixels, `30` by default                                                                      |
| `headerRowHeight`            | `number`                                                                   | Header row height in pixels, `32` by default                                                               |
| `columnWidths`               | `ColumnWidths`                                                             | The widths of the resized and measured columns, to control them                                            |
| `onColumnWidthsChange`       | `(columnWidths: ColumnWidths) => void`                                     | Called when columns are measured, and when a resize ends                                                   |
| `onColumnResize`             | `(column: CalculatedColumn<R>, width: number) => void`                     | Called while a column is resized                                                                           |
| `sortColumns`                | `readonly SortColumn[]`                                                    | The sorted columns                                                                                         |
| `onSortColumnsChange`        | `(sortColumns: SortColumn[]) => void`                                      | Called by `onSort`                                                                                         |
| `defaultColumnOptions`       | `DefaultColumnOptions<R>`                                                  | `width`, `minWidth`, `maxWidth`, `resizable`, `sortable`, `renderCell`, `renderHeaderCell` for all columns |
| `cellSelection`              | `CellSelection`                                                            | The selected ranges, to control the selection                                                              |
| `onCellSelectionChange`      | `(cellSelection: CellSelection) => void`                                   | Called when the selection changes                                                                          |
| `onCellSelectionContextMenu` | `(args: CellSelectionContextMenuArgs<R>, event: React.MouseEvent) => void` | Called on right-click, see [Context Menu](#context-menu)                                                   |
| `onCellClick`                | `(args: CellMouseArgs<R>, event: CellMouseEvent) => void`                  | Called when a cell is clicked                                                                              |
| `onCellDoubleClick`          | `(args: CellMouseArgs<R>, event: CellMouseEvent) => void`                  | Called when a cell is double-clicked                                                                       |
| `onCellKeyDown`              | `(args: CellKeyDownArgs<R>, event: CellKeyboardEvent) => void`             | Called when a key is pressed in a cell, call `event.preventGridDefault()` to skip the navigation           |
| `onActivePositionChange`     | `(args: PositionChangeArgs<R>) => void`                                    | Called when the active cell changes                                                                        |
| `onScroll`                   | `React.UIEventHandler<HTMLDivElement>`                                     | Called when the grid scrolls, to load more rows for example                                                |
| `enableVirtualization`       | `boolean`                                                                  | `true` by default                                                                                          |
| `renderers`                  | `{ noRowsFallback?: ReactNode }`                                           | Rendered instead of the rows when there are none                                                           |
| `rowClass`                   | `(row: R, rowIdx: number) => string \| undefined`                          | Class names of rows                                                                                        |
| `headerRowClass`             | `string`                                                                   | Class names of the header row                                                                              |
| `className`, `style`         |                                                                            | Applied to the grid                                                                                        |
| `aria-*`, `data-testid`      |                                                                            | `aria-label`, `aria-labelledby`, `aria-description`, `aria-describedby`, `aria-rowcount`                   |

`CellMouseArgs<R>` is `{ column, row, rowIdx }`. `CellMouseEvent` and `CellKeyboardEvent` are React events with `preventGridDefault()` and `isGridDefaultPrevented()`.

### `DataGridHandle`

| Member                                                 | Description                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `element`                                              | The grid element                                                  |
| `scrollToCell({ idx?, rowIdx? })`                      | Scrolls to a column, a row, or a cell                             |
| `setActivePosition({ idx, rowIdx }, { shouldFocus? })` | Moves the active cell, `rowIdx: -1` is the header row             |
| `getSelectedCells()`                                   | Returns the selected cells, see [Selected Cells](#selected-cells) |
| `setCellSelection(cellSelection)`                      | Sets the selection, `[]` clears it                                |
| `selectAllCells()`                                     | Selects all the cells                                             |

### `Column<R>`

| Property              | Type                                                    | Description                                                                           |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `key`                 | `string`                                                | A unique key, also the property of the row that the default cell content shows        |
| `name`                | `string \| ReactElement`                                | Shown in the header cell by default                                                   |
| `width`               | `number \| string`                                      | Pixels, or a CSS grid track size like `'1fr'` or `'max-content'`, `'auto'` by default |
| `minWidth`            | `number`                                                | `50` by default                                                                       |
| `maxWidth`            | `number`                                                |                                                                                       |
| `frozen`              | `boolean \| 'start' \| 'end'`                           | Keeps the column visible at the start or end edge, `true` is `'start'`                |
| `resizable`           | `boolean`                                               | Shows a resize handle, a double click auto-sizes the column                           |
| `sortable`            | `boolean`                                               | Enables `onSort`                                                                      |
| `sortDescendingFirst` | `boolean`                                               | Sorts descending first                                                                |
| `renderCell`          | `(props: RenderCellContentProps<R>) => ReactNode`       | Cell content, `row[key]` by default                                                   |
| `renderHeaderCell`    | `(props: RenderHeaderCellContentProps<R>) => ReactNode` | Header cell content                                                                   |
| `cellClass`           | `string \| ((row: R) => string \| undefined)`           | Class names of cells                                                                  |
| `headerCellClass`     | `string`                                                | Class names of the header cell                                                        |

`RenderCellContentProps<R>` is `{ column, row, rowIdx, tabIndex }`.

`RenderHeaderCellContentProps<R>` is `{ column, sortDirection, priority, tabIndex, onSort }`, where `sortDirection` is `'ASC' | 'DESC' | undefined`, and `priority` is the column's position in `sortColumns` when sorting by multiple columns.

### Exports

- `DataGrid`, `RowHeaderColumn`, `ROW_HEADER_COLUMN_KEY`
- `getSelectedCellsText`
- `renderValue`, the default cell content, and `renderHeaderCell`, the default header cell content
- `renderSortIcon({ sortDirection })` and `renderSortPriority({ priority })`, for sortable header cells
- The types used above

## Development

```sh
npm install
npm run dev # the examples website
npm run pack # builds the package into lib/
```

The examples are in [`website/routes`](website/routes).
