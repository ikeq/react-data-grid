import type { CalculatedColumn } from '../types';

// This function builds an array with a plain loop instead of using a generator:
// iterating over generator objects is much slower, and React Compiler doesn't support `yield`

// The callback receives each cell's values as arguments, so no object is allocated per cell
export function mapColumns<R, T>(
  viewportColumns: readonly CalculatedColumn<R>[],
  activeColumnIdx: number,
  callback: (column: CalculatedColumn<R>, isCellActive: boolean, index: number) => T
): T[] {
  const results: T[] = [];

  for (const column of viewportColumns) {
    results.push(callback(column, column.idx === activeColumnIdx, results.length));
  }

  return results;
}
