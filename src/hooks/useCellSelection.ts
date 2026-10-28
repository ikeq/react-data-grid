import { useLayoutEffect, useRef, useState } from 'react';

import {
  clampCellSelection,
  emptyCellSelection,
  getCellRange,
  getSelectedColumnIntervals,
  getSelectedRowRanges,
  isColumnInCellSelection,
  isElement,
  isPositionInCellSelection,
  isRowHeaderColumn,
  isRowInCellSelection,
  isSameCellRange,
  ROW_HEADER_COLUMN_KEY,
  SelectedCellIntervalsCache,
  SelectedRowRangesCache
} from '../utils';
import type {
  CalculatedColumn,
  CellMouseArgs,
  CellMouseEvent,
  CellRange,
  CellSelection,
  CellSelectionContextMenuArgs,
  Maybe,
  Position,
  SelectedCells
} from '../types';
import { useLatestFunc } from './useLatestFunc';

type SelectionMode = 'CELL' | 'ROW' | 'COLUMN';

interface DragState {
  readonly mode: SelectionMode;
  readonly anchor: Position;
  readonly base: CellSelection;
  lead: Position;
  clientX: number;
  clientY: number;
}

export interface UseCellSelectionArgs<R> {
  gridRef: React.RefObject<HTMLDivElement | null>;
  rows: readonly R[];
  columns: readonly CalculatedColumn<R>[];
  rawSelection: Maybe<CellSelection>;
  onSelectionChange: Maybe<(selection: CellSelection) => void>;
  onContextMenu: Maybe<
    (args: CellSelectionContextMenuArgs<R>, event: React.MouseEvent<HTMLDivElement>) => void
  >;
  headerRowsHeight: number;
  findRowIdx: (offset: number) => number;
}

// pixels scrolled per frame, at most, when the pointer is past the edge of the grid while selecting
const maxAutoScrollSpeed = 30;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getAutoScrollDelta(distance: number) {
  return Math.sign(distance) * Math.min(Math.ceil(Math.abs(distance) / 2), maxAutoScrollSpeed);
}

export function useCellSelection<R>({
  gridRef,
  rows,
  columns,
  rawSelection,
  onSelectionChange,
  onContextMenu,
  headerRowsHeight,
  findRowIdx
}: UseCellSelectionArgs<R>) {
  const [internalSelection, setInternalSelection] = useState(emptyCellSelection);
  const [isSelecting, setIsSelecting] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  // where Shift + click and Shift + arrow keys extend the last range from
  const anchorRef = useRef<Position | null>(null);
  // the other corner of the last range, moved by Shift + arrow keys
  const leadRef = useRef<Position | null>(null);
  const [intervalsCache] = useState(() => new SelectedCellIntervalsCache());
  const [rowRangesCache] = useState(() => new SelectedRowRangesCache());

  const isControlled = rawSelection != null;
  const maxIdx = columns.length - 1;
  const maxRowIdx = rows.length - 1;
  const selection = clampCellSelection(
    rawSelection ?? internalSelection,
    rows.length,
    columns.length
  );
  const isHighlighted = selection.length > 0;

  const handlePointerMoveLatest = useLatestFunc(handlePointerMove);
  const handlePointerUpLatest = useLatestFunc(stopSelecting);
  const autoScrollLatest = useLatestFunc(autoScroll);

  // Listen to the pointer while selecting, and scroll when it is past the edge of the grid.
  // The mousedown that starts selecting is a discrete event, so React commits its update, and runs this effect,
  // before the browser dispatches pointerup. The effect cleans up when the grid unmounts in the middle of a drag.
  useLayoutEffect(() => {
    if (!isSelecting) return;
    const doc = gridRef.current!.ownerDocument;
    let frame = requestAnimationFrame(onFrame);

    function onFrame() {
      autoScrollLatest();
      frame = requestAnimationFrame(onFrame);
    }

    doc.addEventListener('pointermove', handlePointerMoveLatest);
    doc.addEventListener('pointerup', handlePointerUpLatest);
    doc.addEventListener('pointercancel', handlePointerUpLatest);

    return () => {
      cancelAnimationFrame(frame);
      doc.removeEventListener('pointermove', handlePointerMoveLatest);
      doc.removeEventListener('pointerup', handlePointerUpLatest);
      doc.removeEventListener('pointercancel', handlePointerUpLatest);
    };
  }, [isSelecting, gridRef, autoScrollLatest, handlePointerMoveLatest, handlePointerUpLatest]);

  function setSelection(nextSelection: CellSelection) {
    if (!isControlled) {
      setInternalSelection(nextSelection);
    }
    onSelectionChange?.(nextSelection);
  }

  function getRange(mode: SelectionMode, anchor: Position, lead: Position): CellRange {
    const range = getCellRange(anchor, lead);
    if (mode === 'ROW') {
      // whole rows
      return { ...range, startIdx: 0, endIdx: maxIdx };
    }
    if (mode === 'COLUMN') {
      // whole columns
      return { ...range, startRowIdx: 0, endRowIdx: maxRowIdx };
    }
    return range;
  }

  function getAllRange(): CellRange {
    return { startIdx: 0, endIdx: maxIdx, startRowIdx: 0, endRowIdx: maxRowIdx };
  }

  /**
   * selection
   */
  function selectAll() {
    if (rows.length === 0 || columns.length === 0) return;
    anchorRef.current = { idx: 0, rowIdx: 0 };
    leadRef.current = { idx: maxIdx, rowIdx: maxRowIdx };
    setSelection([getAllRange()]);
  }

  // called when the active cell moves without extending the selection
  function collapseSelection(position: Position) {
    const isInRows =
      position.rowIdx >= 0 &&
      position.rowIdx <= maxRowIdx &&
      position.idx >= 0 &&
      position.idx <= maxIdx;
    anchorRef.current = isInRows ? position : null;
    leadRef.current = null;
    const nextSelection = isInRows ? [getCellRange(position, position)] : emptyCellSelection;
    if (
      nextSelection.length !== selection.length ||
      !isSameCellRange(nextSelection[0], selection[0])
    ) {
      setSelection(nextSelection);
    }
  }

  // Shift + arrow keys, Home, End, PageUp, and PageDown
  function extendSelection(
    key: string,
    ctrlKey: boolean,
    activePosition: Position,
    getPageRowIdx: (rowIdx: number, isPageDown: boolean) => number
  ): Position | undefined {
    if (rows.length === 0) return;
    const anchor =
      anchorRef.current ??
      (activePosition.rowIdx >= 0 && activePosition.rowIdx <= maxRowIdx ? activePosition : null);
    if (anchor === null || anchor.idx < 0) return;

    const lead = leadRef.current ?? anchor;
    let { idx, rowIdx } = lead;

    switch (key) {
      case 'ArrowUp':
        rowIdx = ctrlKey ? 0 : rowIdx - 1;
        break;
      case 'ArrowDown':
        rowIdx = ctrlKey ? maxRowIdx : rowIdx + 1;
        break;
      case 'ArrowLeft':
        idx = ctrlKey ? 0 : idx - 1;
        break;
      case 'ArrowRight':
        idx = ctrlKey ? maxIdx : idx + 1;
        break;
      case 'Home':
        idx = 0;
        if (ctrlKey) rowIdx = 0;
        break;
      case 'End':
        idx = maxIdx;
        if (ctrlKey) rowIdx = maxRowIdx;
        break;
      case 'PageUp':
        rowIdx = getPageRowIdx(rowIdx, false);
        break;
      case 'PageDown':
        rowIdx = getPageRowIdx(rowIdx, true);
        break;
      default:
        return;
    }

    const nextLead: Position = {
      idx: clamp(idx, 0, maxIdx),
      rowIdx: clamp(rowIdx, 0, maxRowIdx)
    };
    anchorRef.current = anchor;
    leadRef.current = nextLead;
    setSelection([...selection.slice(0, -1), getCellRange(anchor, nextLead)]);
    return nextLead;
  }

  /**
   * pointer selection
   */
  function startSelecting(
    mode: SelectionMode,
    anchor: Position,
    lead: Position,
    base: CellSelection,
    event: React.MouseEvent<HTMLDivElement>,
    canDrag: boolean
  ) {
    stopSelecting();
    anchorRef.current = anchor;
    leadRef.current = lead;
    setSelection([...base, getRange(mode, anchor, lead)]);

    if (!canDrag) return;
    dragRef.current = {
      mode,
      anchor,
      base,
      lead,
      clientX: event.clientX,
      clientY: event.clientY
    };
    setIsSelecting(true);
  }

  function stopSelecting() {
    if (dragRef.current === null) return;
    dragRef.current = null;
    setIsSelecting(false);
  }

  function getBodyBounds(grid: HTMLDivElement) {
    const rect = grid.getBoundingClientRect();
    const left = rect.left + grid.clientLeft;
    const top = rect.top + grid.clientTop;
    return {
      top,
      left,
      right: left + grid.clientWidth,
      bodyTop: top + headerRowsHeight,
      bodyBottom: top + grid.clientHeight
    };
  }

  function getPositionFromPoint(drag: DragState): Position {
    const grid = gridRef.current!;
    const { top, left, right, bodyTop, bodyBottom } = getBodyBounds(grid);
    let { idx, rowIdx } = drag.lead;
    // stay inside the rows, even when the pointer is past the edge of the grid
    const bodyY = clamp(drag.clientY, bodyTop, Math.max(bodyTop, bodyBottom - 1));

    if (drag.mode !== 'COLUMN') {
      rowIdx = clamp(findRowIdx(grid.scrollTop + bodyY - bodyTop), 0, maxRowIdx);
    }

    if (drag.mode !== 'ROW') {
      const x = clamp(drag.clientX, left + 1, Math.max(left + 1, right - 1));
      // find the column in the header row when selecting columns
      const y = drag.mode === 'COLUMN' ? top + headerRowsHeight / 2 : bodyY;
      const element = grid.ownerDocument.elementFromPoint(x, y);
      const cell = isElement(element)
        ? element.closest('[role="gridcell"], [role="columnheader"]')
        : null;
      if (cell !== null && grid.contains(cell)) {
        const colIndex = Number(cell.getAttribute('aria-colindex'));
        if (colIndex > 0) {
          idx = clamp(colIndex - 1, 0, maxIdx);
        }
      }
    }

    return { idx, rowIdx };
  }

  function updateLead() {
    const drag = dragRef.current;
    if (drag === null) return;
    const lead = getPositionFromPoint(drag);
    if (lead.idx === drag.lead.idx && lead.rowIdx === drag.lead.rowIdx) return;
    drag.lead = lead;
    leadRef.current = lead;
    setSelection([...drag.base, getRange(drag.mode, drag.anchor, lead)]);
  }

  function handlePointerMove(event: PointerEvent) {
    const drag = dragRef.current;
    if (drag === null) return;
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    updateLead();
  }

  // called on each frame while selecting: scroll the grid while the pointer is past its edge, and keep extending the selection
  function autoScroll() {
    const drag = dragRef.current;
    const grid = gridRef.current;
    if (drag === null || grid === null) return;
    const { left, right, bodyTop, bodyBottom } = getBodyBounds(grid);
    let deltaX = 0;
    let deltaY = 0;
    if (drag.mode !== 'COLUMN') {
      if (drag.clientY < bodyTop) deltaY = getAutoScrollDelta(drag.clientY - bodyTop);
      else if (drag.clientY > bodyBottom) deltaY = getAutoScrollDelta(drag.clientY - bodyBottom);
    }
    if (drag.mode !== 'ROW') {
      if (drag.clientX < left) deltaX = getAutoScrollDelta(drag.clientX - left);
      else if (drag.clientX > right) deltaX = getAutoScrollDelta(drag.clientX - right);
    }
    if (deltaX !== 0 || deltaY !== 0) {
      grid.scrollBy({ left: deltaX, top: deltaY, behavior: 'instant' });
      updateLead();
    }
  }

  function getStart(
    event: React.MouseEvent,
    position: Position
  ): { anchor: Position; base: CellSelection; isExtending: boolean } {
    const ctrlKey = event.ctrlKey || event.metaKey;
    if (event.shiftKey && anchorRef.current !== null) {
      return { anchor: anchorRef.current, base: selection.slice(0, -1), isExtending: true };
    }
    return { anchor: position, base: ctrlKey ? selection : emptyCellSelection, isExtending: false };
  }

  function handleCellMouseDown(args: CellMouseArgs<R>, event: CellMouseEvent) {
    if (event.isGridDefaultPrevented()) return;
    const { column, rowIdx } = args;
    const position: Position = { idx: column.idx, rowIdx };

    if (event.button !== 0) {
      // like in a spreadsheet, right-clicking in the selection keeps the active cell,
      // so the grid doesn't scroll to the clicked cell before the context menu opens
      if (event.button === 2 && isPositionInCellSelection(selection, position)) {
        event.preventGridDefault();
      }
      return;
    }

    const isRowHeader = column.key === ROW_HEADER_COLUMN_KEY;
    const { anchor, base, isExtending } = getStart(event, position);

    if (isExtending) {
      // keep the active cell where the selection started
      event.preventGridDefault();
      // avoid extending the text selection
      gridRef.current?.ownerDocument.getSelection()?.removeAllRanges();
    }

    startSelecting(isRowHeader ? 'ROW' : 'CELL', anchor, position, base, event, true);
  }

  function handleHeaderCellMouseDown(
    column: CalculatedColumn<R>,
    event: React.MouseEvent<HTMLDivElement>
  ) {
    if (event.button !== 0 || rows.length === 0) return;
    if (isElement(event.target) && event.target.closest('.rdg-resize-handle') !== null) return;

    if (column.key === ROW_HEADER_COLUMN_KEY) {
      stopSelecting();
      selectAll();
      return;
    }

    const position: Position = { idx: column.idx, rowIdx: 0 };
    const { anchor, base } = getStart(event, position);
    startSelecting('COLUMN', anchor, position, base, event, true);
  }

  /**
   * context menu
   */
  function getSelectedCells(currentSelection: CellSelection = selection): SelectedCells<R>[] {
    return currentSelection.map((range) => ({
      range,
      columns: columns
        .slice(range.startIdx, range.endIdx + 1)
        .filter((column) => !isRowHeaderColumn(column.key)),
      rows: rows.slice(range.startRowIdx, range.endRowIdx + 1)
    }));
  }

  function openContextMenu(
    nextSelection: CellSelection,
    column: CalculatedColumn<R> | undefined,
    target: CellSelectionContextMenuArgs<R>['target'],
    event: React.MouseEvent<HTMLDivElement>
  ) {
    stopSelecting();
    if (nextSelection !== selection) {
      setSelection(nextSelection);
    }
    onContextMenu?.(
      {
        selection: nextSelection,
        column,
        target,
        getSelectedCells: () => getSelectedCells(nextSelection)
      },
      event
    );
  }

  function handleCellContextMenu(args: CellMouseArgs<R>, event: CellMouseEvent) {
    if (event.isGridDefaultPrevented()) return;
    const { column, rowIdx } = args;

    if (column.key === ROW_HEADER_COLUMN_KEY) {
      let nextSelection = selection;
      if (!isRowInCellSelection(selection, rowIdx, maxIdx)) {
        const position: Position = { idx: 0, rowIdx };
        anchorRef.current = position;
        leadRef.current = position;
        nextSelection = [getRange('ROW', position, position)];
      }
      openContextMenu(nextSelection, undefined, 'ROW_HEADER', event);
      return;
    }

    const position: Position = { idx: column.idx, rowIdx };
    let nextSelection = selection;
    if (!isPositionInCellSelection(selection, position)) {
      anchorRef.current = position;
      leadRef.current = position;
      nextSelection = [getCellRange(position, position)];
    }
    openContextMenu(nextSelection, column, 'CELL', event);
  }

  function handleHeaderCellContextMenu(
    column: CalculatedColumn<R>,
    event: React.MouseEvent<HTMLDivElement>
  ) {
    if (rows.length === 0) return;

    if (column.key === ROW_HEADER_COLUMN_KEY) {
      openContextMenu([getAllRange()], undefined, 'ALL', event);
      return;
    }

    let nextSelection = selection;
    if (!isColumnInCellSelection(selection, column.idx, maxRowIdx)) {
      const position: Position = { idx: column.idx, rowIdx: 0 };
      anchorRef.current = position;
      leadRef.current = position;
      nextSelection = [getRange('COLUMN', position, position)];
    }
    openContextMenu(nextSelection, column, 'COLUMN_HEADER', event);
  }

  /**
   * rendering
   */
  function isUtilityColumn(idx: number) {
    return isRowHeaderColumn(columns[idx].key);
  }

  function getRowSelectedRanges(rowIdx: number) {
    if (!isHighlighted) return;
    return getSelectedRowRanges(selection, rowIdx, isUtilityColumn, rowRangesCache);
  }

  const selectedColumnIntervals = isHighlighted
    ? getSelectedColumnIntervals(selection, intervalsCache)
    : undefined;

  return {
    cellSelection: selection,
    isSelecting,
    selectedColumnIntervals,
    getRowSelectedRanges,
    getSelectedCells,
    setCellSelection: setSelection,
    selectAll,
    collapseSelection,
    extendSelection,
    handleCellMouseDown,
    handleCellContextMenu,
    handleHeaderCellMouseDown,
    handleHeaderCellContextMenu
  } as const;
}
