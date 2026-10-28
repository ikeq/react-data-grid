import { useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { Key, KeyboardEvent } from 'react';

import {
  useActivePosition,
  useCalculatedColumns,
  useCellSelection,
  useColumnWidths,
  useGridDimensions,
  useLatestFunc,
  useScrollState,
  useScrollToPosition,
  useViewportColumns,
  useViewportRows,
  type PartialPosition
} from './hooks';
import {
  canExitGrid,
  classnames,
  createCellEvent,
  getCellToScroll,
  getSelectedCellsText,
  getNextActivePosition,
  isCtrlKeyHeldDown,
  isElement,
  renderMeasuringCells,
  scrollIntoView
} from './utils';
import type {
  CalculatedColumn,
  CellKeyboardEvent,
  CellKeyDownArgs,
  CellMouseEventHandler,
  CellNavigationMode,
  CellSelection,
  CellSelectionContextMenuArgs,
  Column,
  ColumnWidths,
  Maybe,
  Position,
  PositionChangeArgs,
  Renderers,
  SelectedCells,
  SetActivePositionOptions,
  SortColumn
} from './types';
import HeaderRow from './HeaderRow';
import Row from './Row';
import { cellSelectingClassname } from './style/cell';
import { rootClassname } from './style/core';

export type DefaultColumnOptions<R> = Pick<
  Column<R>,
  'renderCell' | 'renderHeaderCell' | 'width' | 'minWidth' | 'maxWidth' | 'resizable' | 'sortable'
>;

export interface DataGridHandle {
  element: HTMLDivElement | null;
  scrollToCell: (position: PartialPosition) => void;
  setActivePosition: (position: Position, options?: SetActivePositionOptions) => void;
  /** Returns the selected rows and columns of each range of the cell selection */
  // the handle isn't generic, cast the result to `SelectedCells<Row>[]`
  // oxlint-disable-next-line typescript/no-explicit-any
  getSelectedCells: () => SelectedCells<any>[];
  /** Sets the cell selection, `[]` clears it */
  setCellSelection: (cellSelection: CellSelection) => void;
  /** Selects all the cells */
  selectAllCells: () => void;
}

type SharedDivProps = Pick<
  React.ComponentProps<'div'>,
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-description'
  | 'aria-describedby'
  | 'aria-rowcount'
  | 'className'
  | 'style'
  | 'onScroll'
>;

export interface DataGridProps<R, K extends Key = Key> extends SharedDivProps {
  ref?: Maybe<React.Ref<DataGridHandle>>;
  /**
   * Grid and data props
   */
  /** An array of column definitions */
  columns: readonly Column<NoInfer<R>>[];
  /** An array of rows, which can be of any type */
  rows: readonly R[];
  /** Function to return a unique key/identifier for each row */
  rowKeyGetter?: Maybe<(row: NoInfer<R>) => K>;

  /**
   * Dimensions props
   */
  /**
   * Height of each row in pixels
   * @default 30
   */
  rowHeight?: Maybe<number | ((row: NoInfer<R>) => number)>;
  /**
   * Height of the header row in pixels
   * @default 32
   */
  headerRowHeight?: Maybe<number>;
  /** A map of column widths */
  columnWidths?: Maybe<ColumnWidths>;
  /** Callback triggered when column widths change */
  onColumnWidthsChange?: Maybe<(columnWidths: ColumnWidths) => void>;

  /**
   * Feature props
   */
  /** An array of sorted columns */
  sortColumns?: Maybe<readonly SortColumn[]>;
  /** Callback triggered when sorting changes */
  onSortColumnsChange?: Maybe<(sortColumns: SortColumn[]) => void>;
  /** Default options applied to all columns */
  defaultColumnOptions?: Maybe<DefaultColumnOptions<NoInfer<R>>>;
  /**
   * The cell selection works like in a spreadsheet:
   * click a cell, or drag over cells, to select a range, Shift + click or Shift + arrow keys to extend it, Ctrl/Cmd + click to add a range,
   * click or drag over header cells to select columns, and over `RowHeaderColumn` cells to select rows,
   * and Ctrl/Cmd + C to copy the selected cells as tab-separated text.
   * The selected ranges, to control the cell selection. The grid manages it when `undefined`
   */
  cellSelection?: Maybe<CellSelection>;
  /** Callback triggered when the cell selection changes */
  onCellSelectionChange?: Maybe<(cellSelection: CellSelection) => void>;
  /**
   * Callback triggered when a cell, a row header cell, or a header cell is right-clicked.
   * Like in a spreadsheet, right-clicking outside of the selection first selects the cell, row, or column.
   * Call `event.preventDefault()` to replace the browser's context menu with your own.
   */
  onCellSelectionContextMenu?: Maybe<
    (
      args: CellSelectionContextMenuArgs<NoInfer<R>>,
      event: React.MouseEvent<HTMLDivElement>
    ) => void
  >;

  /**
   * Event props
   */
  /** Callback triggered when a cell is clicked */
  onCellClick?: CellMouseEventHandler<R>;
  /** Callback triggered when a cell is double-clicked */
  onCellDoubleClick?: CellMouseEventHandler<R>;
  /** Callback triggered when a key is pressed in a cell */
  onCellKeyDown?: Maybe<(args: CellKeyDownArgs<NoInfer<R>>, event: CellKeyboardEvent) => void>;
  /** Function called whenever the active position is changed */
  onActivePositionChange?: Maybe<(args: PositionChangeArgs<NoInfer<R>>) => void>;
  /** Callback triggered when a column is resized */
  onColumnResize?: Maybe<(column: CalculatedColumn<R>, width: number) => void>;

  /**
   * Toggles and modes
   */
  /** @default true */
  enableVirtualization?: Maybe<boolean>;

  /**
   * Miscellaneous
   */
  /** Custom renderers */
  renderers?: Maybe<Renderers>;
  /** Function to apply custom class names to rows */
  rowClass?: Maybe<(row: NoInfer<R>, rowIdx: number) => Maybe<string>>;
  /** Custom class name for the header row */
  headerRowClass?: Maybe<string>;
  'data-testid'?: Maybe<string>;
  'data-cy'?: Maybe<string>;
}

// the header row's index in positions
const headerRowIdx = -1;

/**
 * Main API component to render a data grid of rows and columns
 *
 * @example
 *
 * <DataGrid columns={columns} rows={rows} />
 */
export function DataGrid<R, K extends Key = Key>(props: DataGridProps<R, K>) {
  const {
    ref,
    // Grid and data props
    columns: rawColumns,
    rows,
    rowKeyGetter,
    // Dimensions props
    rowHeight: rawRowHeight,
    headerRowHeight: rawHeaderRowHeight,
    columnWidths: columnWidthsRaw,
    onColumnWidthsChange: onColumnWidthsChangeRaw,
    // Feature props
    sortColumns,
    onSortColumnsChange,
    defaultColumnOptions,
    cellSelection: rawCellSelection,
    onCellSelectionChange,
    onCellSelectionContextMenu,
    // Event props
    onCellClick,
    onCellDoubleClick,
    onCellKeyDown,
    onActivePositionChange,
    onScroll,
    onColumnResize,
    // Toggles and modes
    enableVirtualization: rawEnableVirtualization,
    // Miscellaneous
    renderers,
    className,
    style,
    rowClass,
    headerRowClass,
    // ARIA
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-description': ariaDescription,
    'aria-describedby': ariaDescribedBy,
    'aria-rowcount': rawAriaRowCount,
    'data-testid': testId,
    'data-cy': dataCy
  } = props;

  /**
   * defaults
   */
  const rowHeight = rawRowHeight ?? 30;
  const headerRowHeight = rawHeaderRowHeight ?? 32;
  const noRowsFallback = renderers?.noRowsFallback;
  const enableVirtualization = rawEnableVirtualization ?? true;

  /**
   * ref
   */
  const gridRef = useRef<HTMLDivElement>(null);

  /**
   * states
   */
  const { scrollTop, scrollLeft } = useScrollState(gridRef);
  const [gridWidth, gridHeight] = useGridDimensions(gridRef);
  const [columnWidthsInternal, setColumnWidthsInternal] = useState(
    (): ColumnWidths => columnWidthsRaw ?? new Map()
  );
  const [isColumnResizing, setIsColumnResizing] = useState(false);

  const isColumnWidthsControlled =
    columnWidthsRaw != null && onColumnWidthsChangeRaw != null && !isColumnResizing;
  const columnWidths = isColumnWidthsControlled ? columnWidthsRaw : columnWidthsInternal;
  const onColumnWidthsChange = isColumnWidthsControlled
    ? (columnWidths: ColumnWidths) => {
        // we keep the internal state in sync with the prop but this prevents an extra render
        setColumnWidthsInternal(columnWidths);
        onColumnWidthsChangeRaw(columnWidths);
      }
    : setColumnWidthsInternal;

  const getColumnWidth = useCallback(
    (column: CalculatedColumn<R>) => {
      return columnWidths.get(column.key)?.width ?? column.width;
    },
    [columnWidths]
  );

  const {
    columns,
    lastStartFrozenColumnIndex,
    firstEndFrozenColumnIndex,
    colOverscanStartIdx,
    colOverscanEndIdx,
    templateColumns,
    layoutCssVars,
    totalStartFrozenColumnWidth,
    totalEndFrozenColumnWidth
  } = useCalculatedColumns({
    rawColumns,
    defaultColumnOptions,
    getColumnWidth,
    scrollLeft,
    viewportWidth: gridWidth,
    enableVirtualization
  });

  /**
   * computed values
   */
  const minRowIdx = headerRowIdx;
  const maxRowIdx = rows.length - 1;
  const maxColIdx = columns.length - 1;
  const clientHeight = gridHeight - headerRowHeight;
  const ariaRowCount = rawAriaRowCount ?? 1 + rows.length;

  const {
    activePosition,
    setActivePosition,
    setPositionToFocus,
    activePositionIsInActiveBounds,
    activePositionIsCellInViewport,
    validatePosition,
    queryActiveColumn
  } = useActivePosition<R>({
    gridRef,
    columns,
    rows,
    maxColIdx,
    minRowIdx,
    maxRowIdx
  });
  const { setScrollToPosition, scrollToPositionElement } = useScrollToPosition({ gridRef });

  const {
    rowOverscanStartIdx,
    rowOverscanEndIdx,
    totalRowHeight,
    gridTemplateRows,
    getRowTop,
    getRowHeight,
    findRowIdx
  } = useViewportRows({
    rows,
    rowHeight,
    clientHeight,
    scrollTop,
    enableVirtualization
  });

  const {
    cellSelection,
    isSelecting,
    selectedColumnIntervals,
    getRowSelectedRanges,
    getSelectedCells,
    setCellSelection,
    selectAll,
    collapseSelection,
    extendSelection,
    handleCellMouseDown,
    handleCellContextMenu,
    handleHeaderCellMouseDown,
    handleHeaderCellContextMenu
  } = useCellSelection<R>({
    gridRef,
    rows,
    columns,
    rawSelection: rawCellSelection,
    onSelectionChange: onCellSelectionChange,
    onContextMenu: onCellSelectionContextMenu,
    headerRowsHeight: headerRowHeight,
    findRowIdx
  });

  const { viewportColumns, mapViewportColumns, mapViewportColumnsOutsideOfViewport } =
    useViewportColumns({
      columns,
      colOverscanStartIdx,
      colOverscanEndIdx,
      lastStartFrozenColumnIndex,
      firstEndFrozenColumnIndex
    });

  const { gridTemplateColumns, handleColumnResize } = useColumnWidths(
    columns,
    viewportColumns,
    templateColumns,
    gridRef,
    gridWidth,
    columnWidths,
    onColumnWidthsChange,
    onColumnResize,
    setIsColumnResizing
  );

  /**
   * The identity of the wrapper function is stable, so it won't break memoization
   */
  const handleColumnResizeLatest = useLatestFunc(handleColumnResize);
  const handleColumnResizeEndLatest = useLatestFunc(handleColumnResizeEnd);
  const onSortColumnsChangeLatest = useLatestFunc(onSortColumnsChange);
  const onCellMouseDownLatest = useLatestFunc(handleCellMouseDown);
  const onCellClickLatest = useLatestFunc(onCellClick);
  const onCellDoubleClickLatest = useLatestFunc(onCellDoubleClick);
  const onCellContextMenuLatest = useLatestFunc(handleCellContextMenu);
  const handleHeaderCellMouseDownLatest = useLatestFunc(handleHeaderCellMouseDown);
  const handleHeaderCellContextMenuLatest = useLatestFunc(handleHeaderCellContextMenu);
  const setPositionLatest = useLatestFunc(setPosition);
  const scrollToCellLatest = useLatestFunc(scrollToCell);

  /**
   * Misc hooks
   */
  useImperativeHandle(ref, (): DataGridHandle => ({
    element: gridRef.current,
    scrollToCell: scrollToCellLatest,
    setActivePosition: setPositionLatest,
    getSelectedCells: () => getSelectedCells(),
    setCellSelection,
    selectAllCells: selectAll
  }));

  function scrollToCell({ idx, rowIdx }: PartialPosition) {
    // frozen columns are always visible — scrolling to them is a no-op
    const scrollToIdx =
      idx != null &&
      idx > lastStartFrozenColumnIndex &&
      (firstEndFrozenColumnIndex === -1 || idx < firstEndFrozenColumnIndex) &&
      idx < columns.length
        ? idx
        : undefined;
    const scrollToRowIdx =
      rowIdx != null && validatePosition({ idx: 0, rowIdx }).isCellInViewport
        ? rowIdx + 1
        : undefined;

    if (scrollToIdx != null || scrollToRowIdx != null) {
      setScrollToPosition({ idx: scrollToIdx, rowIdx: scrollToRowIdx });
    }
  }

  /**
   * event handlers
   */
  function getPageRowIdx(rowIdx: number, isPageDown: boolean) {
    if (isPageDown) {
      const nextRowY = getRowTop(rowIdx) + clientHeight;
      return nextRowY < totalRowHeight ? findRowIdx(nextRowY) : rows.length - 1;
    }
    const nextRowY = getRowTop(rowIdx) + getRowHeight(rowIdx) - clientHeight;
    return nextRowY > 0 ? findRowIdx(nextRowY) : 0;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const { idx, rowIdx } = activePosition;

    if (onCellKeyDown && activePositionIsCellInViewport) {
      const cellEvent = createCellEvent(event);
      onCellKeyDown(
        {
          row: rows[rowIdx],
          column: columns[idx],
          rowIdx,
          setActivePosition: setPosition
        },
        cellEvent
      );
      if (cellEvent.isGridDefaultPrevented()) return;
    }

    const { target } = event;
    if (!isElement(target) || target.closest('.rdg-cell') === null) return;

    if (
      isCtrlKeyHeldDown(event) &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === 'a'
    ) {
      // select all the cells instead of the page's text
      event.preventDefault();
      selectAll();
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Tab':
      case 'Home':
      case 'End':
      case 'PageUp':
      case 'PageDown':
        navigate(event);
        break;
      default:
        break;
    }
  }

  // Ctrl/Cmd + C copies the selected cells as tab-separated text, like in a spreadsheet
  function handleCopy(event: React.ClipboardEvent<HTMLDivElement>) {
    if (cellSelection.length === 0) return;
    const { target } = event;
    // let controls in the cells and header cells, like inputs, copy their own text
    if (
      isElement(target) &&
      target.closest('input, textarea, select, [contenteditable]') !== null
    ) {
      return;
    }
    event.preventDefault();
    event.clipboardData.setData('text/plain', getSelectedCellsText(getSelectedCells()));
  }

  function handleColumnResizeEnd() {
    // This check is needed as double-clicking the resize handle triggers onLostPointerCapture without resizing the column
    if (isColumnResizing) {
      onColumnWidthsChangeRaw?.(columnWidths);
      setIsColumnResizing(false);
    }
  }

  function setPosition(position: Position, options?: SetActivePositionOptions): void {
    if (!validatePosition(position).isCellInActiveBounds) return;

    // Copy the coordinates instead of spreading `position`,
    // so the shape of the active position doesn't depend on the object passed in
    const { idx, rowIdx } = position;
    const samePosition = isSamePosition(activePosition, position);

    if (samePosition) {
      // Avoid re-renders if the active position is the same
      scrollIntoView(getCellToScroll(gridRef.current!));
    } else {
      const newPosition: Position = { idx, rowIdx };
      setActivePosition(newPosition);
      if (options?.shouldFocus) {
        setPositionToFocus(newPosition);
      }
    }

    if (onActivePositionChange && !samePosition) {
      onActivePositionChange({
        rowIdx,
        row: rows[rowIdx],
        column: columns[idx]
      });
    }
  }

  function getNextPosition(key: string, ctrlKey: boolean, shiftKey: boolean): Position {
    const { idx, rowIdx } = activePosition;

    switch (key) {
      case 'ArrowUp':
        return { idx, rowIdx: rowIdx - 1 };
      case 'ArrowDown':
        return { idx, rowIdx: rowIdx + 1 };
      case 'ArrowLeft':
        return { idx: idx - 1, rowIdx };
      case 'ArrowRight':
        return { idx: idx + 1, rowIdx };
      case 'Tab':
        return { idx: idx + (shiftKey ? -1 : 1), rowIdx };
      case 'Home':
        return { idx: 0, rowIdx: ctrlKey ? minRowIdx : rowIdx };
      case 'End':
        return { idx: maxColIdx, rowIdx: ctrlKey ? maxRowIdx : rowIdx };
      case 'PageUp':
        // The header row is above the rows, so there's nothing to page up to.
        if (rowIdx < 0) return activePosition;
        return { idx, rowIdx: getPageRowIdx(rowIdx, false) };

      case 'PageDown':
        if (rows.length === 0) return activePosition;
        return { idx, rowIdx: getPageRowIdx(rowIdx, true) };

      default:
        return activePosition;
    }
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const { key, shiftKey } = event;
    let cellNavigationMode: CellNavigationMode = 'NONE';
    if (key === 'Tab') {
      if (
        canExitGrid({
          shiftKey,
          maxColIdx,
          minRowIdx,
          maxRowIdx,
          activePosition
        })
      ) {
        // Allow focus to leave the grid so the next control in the tab order can be focused
        return;
      }

      cellNavigationMode = 'CHANGE_ROW';
    }

    // prevent scrolling and do not allow focus to leave
    event.preventDefault();

    const ctrlKey = isCtrlKeyHeldDown(event);

    if (shiftKey && key !== 'Tab' && activePositionIsCellInViewport) {
      // extend the selection, the active cell stays where the selection started
      const lead = extendSelection(key, ctrlKey, activePosition, getPageRowIdx);
      if (lead !== undefined) {
        scrollToCell(lead);
        return;
      }
    }

    const nextPosition = getNextPosition(key, ctrlKey, shiftKey);
    if (isSamePosition(activePosition, nextPosition)) return;

    const nextActivePosition = getNextActivePosition({
      cellNavigationMode,
      columnsCount: columns.length,
      minRowIdx,
      maxRowIdx,
      nextPosition
    });

    setPosition(nextActivePosition, { shouldFocus: true });
    collapseSelection(nextActivePosition);
  }

  function getViewportRows() {
    const activeRowIdx = activePosition.rowIdx;
    const viewportRows: React.ReactNode[] = [];

    if (activePositionIsCellInViewport && activeRowIdx < rowOverscanStartIdx) {
      viewportRows.push(renderViewportRow(activeRowIdx));
    }
    for (let rowIdx = rowOverscanStartIdx; rowIdx <= rowOverscanEndIdx; rowIdx++) {
      viewportRows.push(renderViewportRow(rowIdx));
    }
    if (activePositionIsCellInViewport && activeRowIdx > rowOverscanEndIdx) {
      viewportRows.push(renderViewportRow(activeRowIdx));
    }

    return viewportRows;
  }

  function renderViewportRow(rowIdx: number) {
    const { idx: activeIdx, rowIdx: activeRowIdx } = activePosition;
    const isActiveRow = rowIdx === activeRowIdx;

    // if the row is outside the viewport then only render its active column, if any
    const mapColumns =
      isActiveRow && (rowIdx < rowOverscanStartIdx || rowIdx > rowOverscanEndIdx)
        ? mapViewportColumnsOutsideOfViewport
        : mapViewportColumns;

    const row = rows[rowIdx];
    // the header row is the first grid row, and `aria-rowindex` is 1-based
    const gridRowStart = rowIdx + 2;

    return (
      <Row
        key={typeof rowKeyGetter === 'function' ? rowKeyGetter(row) : rowIdx}
        aria-rowindex={gridRowStart}
        rowIdx={rowIdx}
        row={row}
        mapViewportColumns={mapColumns}
        onCellMouseDown={onCellMouseDownLatest}
        onCellClick={onCellClickLatest}
        onCellDoubleClick={onCellDoubleClickLatest}
        onCellContextMenu={onCellContextMenuLatest}
        rowClass={rowClass}
        gridRowStart={gridRowStart}
        activeCellIdx={isActiveRow ? activeIdx : undefined}
        selectedRowRanges={getRowSelectedRanges(rowIdx)}
        setActivePosition={setPositionLatest}
      />
    );
  }

  // Keep the state and prop in sync
  if (isColumnWidthsControlled && columnWidthsInternal !== columnWidthsRaw) {
    setColumnWidthsInternal(columnWidthsRaw);
  }

  // `repeat()` ends with a parenthesis, so the rows' template can follow it without a space
  let templateRows = `repeat(1, ${headerRowHeight}px)`;
  if (rows.length > 0) {
    templateRows += gridTemplateRows;
  }

  // Frozen cells and the header row are sticky, so they are already visible on their sticky axis.
  // A sticky cell inside the scroll padding would be scrolled out of it when it's focused or scrolled into view,
  // so the padding only applies when the active cell is a non-sticky cell on that axis, or when scrolling to a position.
  const isScrollingToPosition = scrollToPositionElement !== null;
  const hasInlineScrollPadding = isScrollingToPosition || queryActiveColumn()?.frozen === false;
  const hasBlockScrollPadding = isScrollingToPosition || activePositionIsCellInViewport;

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-description={ariaDescription}
      aria-describedby={ariaDescribedBy}
      aria-multiselectable
      aria-readonly
      aria-colcount={columns.length}
      aria-rowcount={ariaRowCount}
      // Scrollable containers without tabIndex are keyboard focusable in Chrome only if there is no focusable element inside,
      // whereas they are always focusable in Firefox. We need to set tabIndex to have consistent behavior across browsers.
      tabIndex={-1}
      className={classnames(rootClassname, isSelecting && cellSelectingClassname, className)}
      style={{
        ...style,
        // set scrollPadding to correctly scroll to non-sticky cells/rows
        scrollPaddingInlineStart: hasInlineScrollPadding ? totalStartFrozenColumnWidth : undefined,
        scrollPaddingInlineEnd: hasInlineScrollPadding ? totalEndFrozenColumnWidth : undefined,
        scrollPaddingBlockStart: hasBlockScrollPadding ? headerRowHeight : undefined,
        gridTemplateColumns,
        gridTemplateRows: templateRows,
        ...layoutCssVars
      }}
      // the keyboard navigation and the column resizing are left to right
      dir="ltr"
      onScroll={onScroll}
      onKeyDown={handleKeyDown}
      onCopy={handleCopy}
      data-testid={testId}
      data-cy={dataCy}
    >
      <HeaderRow
        headerRowClass={headerRowClass}
        mapViewportColumns={mapViewportColumns}
        onColumnResize={handleColumnResizeLatest}
        onColumnResizeEnd={handleColumnResizeEndLatest}
        sortColumns={sortColumns}
        onSortColumnsChange={onSortColumnsChangeLatest}
        activeCellIdx={activePosition.rowIdx === headerRowIdx ? activePosition.idx : undefined}
        setPosition={setPositionLatest}
        shouldFocusGrid={!activePositionIsInActiveBounds}
        selectedColumnIntervals={selectedColumnIntervals}
        onHeaderCellMouseDown={handleHeaderCellMouseDownLatest}
        onHeaderCellContextMenu={handleHeaderCellContextMenuLatest}
      />
      {rows.length === 0 && noRowsFallback ? noRowsFallback : getViewportRows()}

      {/* render empty cells so we can measure column widths */}
      {renderMeasuringCells(viewportColumns)}

      {scrollToPositionElement}
    </div>
  );
}

function isSamePosition(p1: Position, p2: Position) {
  return p1.idx === p2.idx && p1.rowIdx === p2.rowIdx;
}
