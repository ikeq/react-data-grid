import type { ReactElement, ReactNode } from 'react';

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Maybe<T> = T | undefined | null;

export type StateSetter<S> = React.Dispatch<React.SetStateAction<S>>;

export interface Column<TRow> {
  /** The name of the column. Displayed in the header cell by default */
  readonly name: string | ReactElement;
  /** A unique key to distinguish each column */
  readonly key: string;
  /**
   * Column width. If not specified, it will be determined automatically based on grid width and specified widths of other columns
   * @default 'auto'
   */
  readonly width?: Maybe<number | string>;
  /**
   * Minimum column width in pixels
   * @default 50
   */
  readonly minWidth?: Maybe<number>;
  /** Maximum column width in pixels */
  readonly maxWidth?: Maybe<number>;
  /** Class name(s) for cells */
  readonly cellClass?: Maybe<string | ((row: TRow) => Maybe<string>)>;
  /** Class name(s) for the header cell */
  readonly headerCellClass?: Maybe<string>;
  /** Render function to render the content of cells */
  readonly renderCell?: Maybe<(props: RenderCellContentProps<TRow>) => ReactNode>;
  /** Render function to render the content of the header cell */
  readonly renderHeaderCell?: Maybe<(props: RenderHeaderCellContentProps<TRow>) => ReactNode>;
  /** Determines whether the column is frozen, and on which edge.
   *  `true` is an alias for `'start'` for backward compatibility. */
  readonly frozen?: Maybe<ColumnFrozen | true>;
  /** Enable resizing of the column */
  readonly resizable?: Maybe<boolean>;
  /** Enable sorting of the column, with `onSort` passed to `renderHeaderCell` */
  readonly sortable?: Maybe<boolean>;
  /** Sets the column sort order to be descending instead of ascending the first time the column is sorted */
  readonly sortDescendingFirst?: Maybe<boolean>;
}

export interface CalculatedColumn<TRow> extends Column<TRow> {
  /** The index of the column in the grid. Frozen columns are moved to their edge, so it can differ from the column's index in `columns` */
  readonly idx: number;
  readonly width: number | string;
  readonly minWidth: number;
  readonly maxWidth: number | undefined;
  readonly resizable: boolean;
  readonly sortable: boolean;
  readonly frozen: ColumnFrozen;
  readonly renderCell: (props: RenderCellContentProps<TRow>) => ReactNode;
  readonly renderHeaderCell: (props: RenderHeaderCellContentProps<TRow>) => ReactNode;
  // Always set, `undefined` when not set on the column
  readonly cellClass: Column<TRow>['cellClass'];
  readonly headerCellClass: Column<TRow>['headerCellClass'];
  readonly sortDescendingFirst: Column<TRow>['sortDescendingFirst'];
}

export interface Position {
  /** Column index */
  readonly idx: number;
  /** Row index: `0` is the first row, and `-1` is the header row */
  readonly rowIdx: number;
}

/**
 * A rectangle of selected cells, with inclusive bounds.
 * `startIdx <= endIdx` and `startRowIdx <= endRowIdx` always hold.
 * Only cells in `rows` can be selected: the header row is never part of a range.
 */
export interface CellRange {
  readonly startIdx: number;
  readonly endIdx: number;
  readonly startRowIdx: number;
  readonly endRowIdx: number;
}

/** The selected ranges. Ctrl/Cmd + click or drag adds ranges, like in a spreadsheet */
export type CellSelection = readonly CellRange[];

/** Selected columns of a single row: inclusive `[startIdx, endIdx]` column index intervals */
export type SelectedCellIntervals = readonly (readonly [startIdx: number, endIdx: number])[];

/**
 * The parts of the selected ranges that cross a single row, one per range:
 * the inclusive column interval, and whether the row is the first or last row of the range.
 * Used to highlight the selected cells, and the border around each range.
 */
export type SelectedRowRanges = readonly (readonly [
  startIdx: number,
  endIdx: number,
  isFirstRow: boolean,
  isLastRow: boolean
])[];

export interface SelectedCells<TRow> {
  /** The range that the cells come from */
  readonly range: CellRange;
  /** The selected columns, without the row header column */
  readonly columns: readonly CalculatedColumn<TRow>[];
  /** The selected rows */
  readonly rows: readonly TRow[];
}

export interface CellSelectionContextMenuArgs<TRow> {
  /** The selection, updated to include the right-clicked cell, row, or column */
  readonly selection: CellSelection;
  /** The column of the right-clicked cell or header cell, `undefined` for the row header column's cells */
  readonly column: CalculatedColumn<TRow> | undefined;
  /** Where the context menu was opened */
  readonly target: 'CELL' | 'ROW_HEADER' | 'COLUMN_HEADER' | 'ALL';
  /** Returns the selected rows and columns of each range */
  readonly getSelectedCells: () => SelectedCells<TRow>[];
}

export interface RenderCellContentProps<TRow> {
  column: CalculatedColumn<TRow>;
  row: TRow;
  rowIdx: number;
  /** `0` when the cell is active and `-1` otherwise, for focusable elements in the cell */
  tabIndex: number;
}

export interface RenderHeaderCellContentProps<TRow> {
  column: CalculatedColumn<TRow>;
  /** The sort direction of the column, from `sortColumns`, or `undefined` if it is not sorted */
  sortDirection: SortDirection | undefined;
  /** The column's position in `sortColumns`, starting at 1, when sorting by multiple columns, or `undefined` otherwise */
  priority: number | undefined;
  /** `0` when the header cell is active and `-1` otherwise, for focusable elements in the header cell */
  tabIndex: number;
  /**
   * Sorts the column by calling `onSortColumnsChange`: ascending, then descending, then not sorted,
   * or descending first with `sortDescendingFirst`. Does nothing if the column is not `sortable`.
   * Clicking the header cell selects the column, so render a control that sorts, like `<button onClick={onSort}>`.
   * With Ctrl/Cmd held, the column is added to the sorted columns instead of replacing them.
   */
  onSort: (event?: SortEvent) => void;
}

/** The modifier keys of the event that sorts a column, usually a click event */
export interface SortEvent {
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

export interface RenderCellProps<TRow> extends Omit<React.ComponentProps<'div'>, 'children'> {
  column: CalculatedColumn<TRow>;
  row: TRow;
  rowIdx: number;
  isCellActive: boolean;
  /** Whether the cell is in the cell selection. For the row header column, whether any cell of the row is selected */
  isCellSelected: boolean;
  /**
   * The edges of the selected ranges that the cell is on, to draw the border around each range.
   * A bitmask of `1` for the top edge, `2` for the bottom edge, `4` for the inline start edge, and `8` for the inline end edge
   */
  cellSelectionEdges: number;
  onCellMouseDown: CellMouseEventHandler<TRow>;
  onCellClick: CellMouseEventHandler<TRow>;
  onCellDoubleClick: CellMouseEventHandler<TRow>;
  onCellContextMenu: CellMouseEventHandler<TRow>;
  setActivePosition: (position: Position) => void;
}

export type CellEvent<E extends React.SyntheticEvent<HTMLDivElement>> = E & {
  /** Prevents the default grid behavior for this event */
  preventGridDefault: () => void;
  /** Returns whether `preventGridDefault` was called */
  isGridDefaultPrevented: () => boolean;
};

export type CellMouseEvent = CellEvent<React.MouseEvent<HTMLDivElement>>;

export type CellKeyboardEvent = CellEvent<React.KeyboardEvent<HTMLDivElement>>;

export type CellClipboardEvent = React.ClipboardEvent<HTMLDivElement>;

export interface CellMouseArgs<TRow> {
  /** The column object of the cell. */
  column: CalculatedColumn<TRow>;
  /** The row object of the cell. */
  row: TRow;
  /** The row index of the cell. */
  rowIdx: number;
}

export interface CellKeyDownArgs<TRow> {
  /** column object of the active cell */
  column: CalculatedColumn<TRow>;
  row: TRow;
  rowIdx: number;
  setActivePosition: (position: Position, options?: SetActivePositionOptions) => void;
}

export interface PositionChangeArgs<TRow> {
  /** row index of the active position */
  rowIdx: number;
  /** row object of the active position, `undefined` if the active position is on the header row */
  row: TRow | undefined;
  /** column object of the active position */
  column: CalculatedColumn<TRow>;
}

export type CellMouseEventHandler<R> = Maybe<
  (args: CellMouseArgs<NoInfer<R>>, event: CellMouseEvent) => void
>;

export type MapViewportColumns<TRow> = <T>(
  activeIdx: number | undefined,
  callback: (column: CalculatedColumn<TRow>, isCellActive: boolean, index: number) => T
) => T[];

export interface RenderRowProps<TRow> extends Omit<React.ComponentProps<'div'>, 'children'> {
  /**
   * Calls `callback` for each cell to render in the row, and returns the results.
   * `activeIdx` is the column index of the row's active cell, if any: that cell is rendered even when it is scrolled out of view.
   * If virtualization would leave out the active row, it is rendered with only its active cell, if any.
   * The callback receives the cell's column, whether the cell is active, and its index in the results.
   */
  mapViewportColumns: MapViewportColumns<TRow>;
  row: TRow;
  rowIdx: number;
  activeCellIdx: number | undefined;
  gridRowStart: number;
  /**
   * The parts of the selected ranges that cross the row, `undefined` when none of its cells are selected.
   * The array keeps its identity while the row's selection doesn't change, so memoized rows don't re-render.
   */
  selectedRowRanges: SelectedRowRanges | undefined;
  rowClass: Maybe<(row: TRow, rowIdx: number) => Maybe<string>>;
  onCellMouseDown: CellMouseEventHandler<TRow>;
  onCellClick: CellMouseEventHandler<TRow>;
  onCellDoubleClick: CellMouseEventHandler<TRow>;
  onCellContextMenu: CellMouseEventHandler<TRow>;
  setActivePosition: (position: Position) => void;
}

interface CellCopyPasteArgs<TRow> {
  column: CalculatedColumn<TRow>;
  row: TRow;
}

export type CellCopyArgs<TRow> = CellCopyPasteArgs<TRow>;

export interface SortColumn {
  readonly columnKey: string;
  readonly direction: SortDirection;
}

export type CellNavigationMode = 'NONE' | 'CHANGE_ROW';
export type ColumnFrozen = false | 'start' | 'end';
export type SortDirection = 'ASC' | 'DESC';

export interface RenderSortIconProps {
  /** The sort direction of the column, or `undefined` if it is not sorted */
  sortDirection: SortDirection | undefined;
}

export interface RenderSortPriorityProps {
  /** The column's position in `sortColumns`, starting at 1, when sorting by multiple columns, or `undefined` otherwise */
  priority: number | undefined;
}

export interface Renderers {
  /** Rendered instead of the rows when there are none */
  readonly noRowsFallback?: Maybe<ReactNode>;
}

export interface SetActivePositionOptions {
  shouldFocus?: Maybe<boolean>;
}

export interface ColumnWidth {
  /** `'resized'` if the user resized the column, or `'measured'` if the grid measured it */
  readonly type: 'resized' | 'measured';
  /** The width in pixels */
  readonly width: number;
}

export type ColumnWidths = ReadonlyMap<string, ColumnWidth>;

export type ResizedWidth = number | 'max-content';
