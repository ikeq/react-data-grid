import { useCallback, useMemo } from 'react';

import { getViewportColumns, mapColumns, min } from '../utils';
import type { CalculatedColumn, MapViewportColumns } from '../types';

interface ViewportColumnsArgs<R> {
  columns: readonly CalculatedColumn<R>[];
  colOverscanStartIdx: number;
  colOverscanEndIdx: number;
  lastStartFrozenColumnIndex: number;
  firstEndFrozenColumnIndex: number;
}

export function useViewportColumns<R>({
  columns,
  colOverscanStartIdx,
  colOverscanEndIdx,
  lastStartFrozenColumnIndex,
  firstEndFrozenColumnIndex
}: ViewportColumnsArgs<R>) {
  // Effective inclusive upper bound for overscan in the unfrozen band.
  // When end-frozen columns exist, the unfrozen band ends just before them.
  const effectiveOverscanEndIdx =
    firstEndFrozenColumnIndex > -1
      ? min(colOverscanEndIdx, firstEndFrozenColumnIndex - 1)
      : colOverscanEndIdx;

  // the columns of the rows without an active cell, shared by all of them
  const viewportColumns = useMemo((): readonly CalculatedColumn<R>[] => {
    return getViewportColumns(
      columns,
      lastStartFrozenColumnIndex,
      firstEndFrozenColumnIndex,
      colOverscanStartIdx,
      effectiveOverscanEndIdx,
      -1
    );
  }, [
    columns,
    lastStartFrozenColumnIndex,
    firstEndFrozenColumnIndex,
    colOverscanStartIdx,
    effectiveOverscanEndIdx
  ]);

  const mapViewportColumns = useCallback<MapViewportColumns<R>>(
    (activeColumnIdx = -1, callback) => {
      const rowColumns =
        activeColumnIdx === -1
          ? viewportColumns
          : getViewportColumns(
              columns,
              lastStartFrozenColumnIndex,
              firstEndFrozenColumnIndex,
              colOverscanStartIdx,
              effectiveOverscanEndIdx,
              activeColumnIdx
            );

      return mapColumns(rowColumns, activeColumnIdx, callback);
    },
    [
      viewportColumns,
      columns,
      lastStartFrozenColumnIndex,
      firstEndFrozenColumnIndex,
      colOverscanStartIdx,
      effectiveOverscanEndIdx
    ]
  );

  const mapViewportColumnsOutsideOfViewport = useCallback<MapViewportColumns<R>>(
    (activeColumnIdx = -1, callback) => {
      if (activeColumnIdx < 0 || activeColumnIdx >= columns.length) return [];
      return mapColumns([columns[activeColumnIdx]], activeColumnIdx, callback);
    },
    [columns]
  );

  return {
    viewportColumns,
    mapViewportColumns,
    mapViewportColumnsOutsideOfViewport
  } as const;
}
