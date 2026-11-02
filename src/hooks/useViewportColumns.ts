import { useCallback } from 'react';

import { mapColumns } from '../utils';
import type { CalculatedColumn, MapViewportColumns } from '../types';

// columns are not virtualized: every row renders all the columns
export function useViewportColumns<R>(columns: readonly CalculatedColumn<R>[]) {
  const mapViewportColumns = useCallback<MapViewportColumns<R>>(
    (activeColumnIdx = -1, callback) => mapColumns(columns, activeColumnIdx, callback),
    [columns]
  );

  // the rows outside of the viewport that are rendered for the active cell only render its column
  const mapViewportColumnsOutsideOfViewport = useCallback<MapViewportColumns<R>>(
    (activeColumnIdx = -1, callback) => {
      if (activeColumnIdx < 0 || activeColumnIdx >= columns.length) return [];
      return mapColumns([columns[activeColumnIdx]], activeColumnIdx, callback);
    },
    [columns]
  );

  return {
    mapViewportColumns,
    mapViewportColumnsOutsideOfViewport
  } as const;
}
