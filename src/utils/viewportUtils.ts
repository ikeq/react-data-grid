import type { CalculatedColumn } from '../types';

// These functions build arrays with plain loops instead of using generators:
// iterating over generator objects is much slower, and React Compiler doesn't support `yield`

/**
 * Returns the columns to render, ordered by index:
 * start-frozen columns, the unfrozen columns in the overscan range, and end-frozen columns,
 * plus the active column when it is outside of the overscan range
 */
export function getViewportColumns<R, SR>(
  columns: readonly CalculatedColumn<R, SR>[],
  lastStartFrozenColumnIndex: number,
  firstEndFrozenColumnIndex: number,
  startIdx: number,
  effectiveOverscanEndIdx: number,
  activeColumnIdx: number
): CalculatedColumn<R, SR>[] {
  const viewportColumns: CalculatedColumn<R, SR>[] = [];

  for (let colIdx = 0; colIdx <= lastStartFrozenColumnIndex; colIdx++) {
    viewportColumns.push(columns[colIdx]);
  }

  const unfrozenLastIdx =
    firstEndFrozenColumnIndex > -1 ? firstEndFrozenColumnIndex - 1 : columns.length - 1;

  if (lastStartFrozenColumnIndex < unfrozenLastIdx) {
    if (activeColumnIdx > lastStartFrozenColumnIndex && activeColumnIdx < startIdx) {
      viewportColumns.push(columns[activeColumnIdx]);
    }

    for (let colIdx = startIdx; colIdx <= effectiveOverscanEndIdx; colIdx++) {
      viewportColumns.push(columns[colIdx]);
    }

    if (activeColumnIdx > effectiveOverscanEndIdx && activeColumnIdx <= unfrozenLastIdx) {
      viewportColumns.push(columns[activeColumnIdx]);
    }
  }

  // Always include the end-frozen tail (virtualization must keep these in the DOM)
  if (firstEndFrozenColumnIndex > -1) {
    for (let colIdx = firstEndFrozenColumnIndex; colIdx < columns.length; colIdx++) {
      viewportColumns.push(columns[colIdx]);
    }
  }

  return viewportColumns;
}

// The callback receives each cell's values as arguments, so no object is allocated per cell
export function mapColumns<R, SR, T>(
  viewportColumns: readonly CalculatedColumn<R, SR>[],
  activeColumnIdx: number,
  callback: (column: CalculatedColumn<R, SR>, isCellActive: boolean, index: number) => T
): T[] {
  const results: T[] = [];

  for (const column of viewportColumns) {
    results.push(callback(column, column.idx === activeColumnIdx, results.length));
  }

  return results;
}
