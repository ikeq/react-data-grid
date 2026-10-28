import type {
  CellRange,
  CellSelection,
  Position,
  SelectedCellIntervals,
  SelectedRowRanges
} from '../types';

export const ROW_HEADER_COLUMN_KEY = 'rdg-row-header-column';

// same value as `SELECT_COLUMN_KEY` in `Columns.tsx`, which can't be imported here without an import cycle
const SELECT_COLUMN_KEY = 'rdg-select-column';

export const emptyCellSelection: CellSelection = [];

/** The row header and select columns can be part of a range, but their cells are never selected data */
export function isCellSelectionUtilityColumn(key: string) {
  return key === ROW_HEADER_COLUMN_KEY || key === SELECT_COLUMN_KEY;
}

export function getCellRange(anchor: Position, lead: Position): CellRange {
  return {
    startIdx: Math.min(anchor.idx, lead.idx),
    endIdx: Math.max(anchor.idx, lead.idx),
    startRowIdx: Math.min(anchor.rowIdx, lead.rowIdx),
    endRowIdx: Math.max(anchor.rowIdx, lead.rowIdx)
  };
}

export function isSameCellRange(r1: CellRange | undefined, r2: CellRange | undefined) {
  return (
    r1 === r2 ||
    (r1 !== undefined &&
      r2 !== undefined &&
      r1.startIdx === r2.startIdx &&
      r1.endIdx === r2.endIdx &&
      r1.startRowIdx === r2.startRowIdx &&
      r1.endRowIdx === r2.endRowIdx)
  );
}

/**
 * Clamps the ranges to the grid's rows and columns, and drops the ranges that are entirely out of bounds,
 * for example after rows or columns were removed.
 * Returns `selection` itself when nothing changes.
 */
export function clampCellSelection(
  selection: CellSelection,
  rowsCount: number,
  columnsCount: number
): CellSelection {
  if (selection.length === 0) return selection;
  if (rowsCount === 0 || columnsCount === 0) return emptyCellSelection;

  const maxRowIdx = rowsCount - 1;
  const maxIdx = columnsCount - 1;
  let changed = false;
  const clamped: CellRange[] = [];

  for (const range of selection) {
    if (range.startRowIdx > maxRowIdx || range.startIdx > maxIdx) {
      changed = true;
      continue;
    }

    const startRowIdx = Math.max(range.startRowIdx, 0);
    const endRowIdx = Math.min(range.endRowIdx, maxRowIdx);
    const startIdx = Math.max(range.startIdx, 0);
    const endIdx = Math.min(range.endIdx, maxIdx);

    if (
      startRowIdx === range.startRowIdx &&
      endRowIdx === range.endRowIdx &&
      startIdx === range.startIdx &&
      endIdx === range.endIdx
    ) {
      clamped.push(range);
    } else {
      changed = true;
      clamped.push({ startIdx, endIdx, startRowIdx, endRowIdx });
    }
  }

  return changed ? clamped : selection;
}

/** A single cell is the active cell's selection, so it isn't highlighted, like in a spreadsheet */
export function isSingleCellSelection(selection: CellSelection) {
  if (selection.length !== 1) return false;
  const [range] = selection;
  return range.startIdx === range.endIdx && range.startRowIdx === range.endRowIdx;
}

export function isPositionInCellSelection(selection: CellSelection, { idx, rowIdx }: Position) {
  return selection.some(
    (range) =>
      idx >= range.startIdx &&
      idx <= range.endIdx &&
      rowIdx >= range.startRowIdx &&
      rowIdx <= range.endRowIdx
  );
}

/** Whether a range covers every column of the row, or every row of the column */
export function isRowInCellSelection(selection: CellSelection, rowIdx: number, maxIdx: number) {
  return selection.some(
    (range) =>
      range.startIdx === 0 &&
      range.endIdx === maxIdx &&
      rowIdx >= range.startRowIdx &&
      rowIdx <= range.endRowIdx
  );
}

export function isColumnInCellSelection(selection: CellSelection, idx: number, maxRowIdx: number) {
  return selection.some(
    (range) =>
      range.startRowIdx === 0 &&
      range.endRowIdx === maxRowIdx &&
      idx >= range.startIdx &&
      idx <= range.endIdx
  );
}

/** Merges the intervals, which must be sorted by start index */
function mergeIntervals(intervals: [number, number][]) {
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const last = merged.at(-1);
    if (last !== undefined && interval[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], interval[1]);
    } else {
      merged.push([interval[0], interval[1]]);
    }
  }
  return merged;
}

/**
 * Caches the intervals by their content, so rows get the same array while their selection doesn't change,
 * and memoized rows and header rows don't re-render.
 */
export class SelectedCellIntervalsCache {
  readonly #cache = new Map<string, SelectedCellIntervals>();

  get(intervals: [number, number][]): SelectedCellIntervals | undefined {
    if (intervals.length === 0) return;
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = mergeIntervals(intervals);
    const key = merged.join(';');
    let cached = this.#cache.get(key);
    if (cached === undefined) {
      // the cache only grows with distinct selections, so clearing it once in a while is enough
      if (this.#cache.size > 1000) this.#cache.clear();
      cached = merged;
      this.#cache.set(key, cached);
    }
    return cached;
  }
}

export const CELL_SELECTION_EDGE_TOP = 1;
export const CELL_SELECTION_EDGE_BOTTOM = 2;
export const CELL_SELECTION_EDGE_START = 4;
export const CELL_SELECTION_EDGE_END = 8;

type MutableSelectedRowRange = [
  startIdx: number,
  endIdx: number,
  isFirstRow: boolean,
  isLastRow: boolean
];

/** Caches the row ranges by their content, like `SelectedCellIntervalsCache` */
export class SelectedRowRangesCache {
  readonly #cache = new Map<string, SelectedRowRanges>();

  get(ranges: MutableSelectedRowRange[]): SelectedRowRanges | undefined {
    if (ranges.length === 0) return;
    const key = ranges.map((range) => range.join(',')).join(';');
    let cached = this.#cache.get(key);
    if (cached === undefined) {
      if (this.#cache.size > 1000) this.#cache.clear();
      cached = ranges;
      this.#cache.set(key, cached);
    }
    return cached;
  }
}

/**
 * Returns the parts of the ranges that cross the row.
 * The row header and select columns at the start of a range are skipped, so the border starts at the first data column.
 */
export function getSelectedRowRanges(
  selection: CellSelection,
  rowIdx: number,
  isUtilityColumn: (idx: number) => boolean,
  cache: SelectedRowRangesCache
) {
  const ranges: MutableSelectedRowRange[] = [];
  for (const range of selection) {
    if (rowIdx < range.startRowIdx || rowIdx > range.endRowIdx) continue;
    let { startIdx } = range;
    while (startIdx <= range.endIdx && isUtilityColumn(startIdx)) startIdx++;
    if (startIdx > range.endIdx) continue;
    ranges.push([startIdx, range.endIdx, rowIdx === range.startRowIdx, rowIdx === range.endRowIdx]);
  }
  return cache.get(ranges);
}

/** Returns the `CELL_SELECTION_EDGE_*` bitmask of the cell spanning `[startIdx, endIdx]` */
export function getCellSelectionEdges(
  ranges: SelectedRowRanges | undefined,
  startIdx: number,
  endIdx: number
) {
  let edges = 0;
  if (ranges === undefined) return edges;
  for (const [rangeStartIdx, rangeEndIdx, isFirstRow, isLastRow] of ranges) {
    if (startIdx > rangeEndIdx || endIdx < rangeStartIdx) continue;
    if (isFirstRow) edges |= CELL_SELECTION_EDGE_TOP;
    if (isLastRow) edges |= CELL_SELECTION_EDGE_BOTTOM;
    if (rangeStartIdx >= startIdx) edges |= CELL_SELECTION_EDGE_START;
    if (rangeEndIdx <= endIdx) edges |= CELL_SELECTION_EDGE_END;
  }
  return edges;
}

export function getSelectedColumnIntervals(
  selection: CellSelection,
  cache: SelectedCellIntervalsCache
) {
  return cache.get(selection.map((range): [number, number] => [range.startIdx, range.endIdx]));
}

export function intervalsOverlap(
  intervals: SelectedCellIntervals | undefined,
  startIdx: number,
  endIdx: number
) {
  return intervals?.some(([start, end]) => startIdx <= end && endIdx >= start) ?? false;
}
