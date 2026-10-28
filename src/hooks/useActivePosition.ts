import { useLayoutEffect, useRef, useState } from 'react';

import { focusCell } from '../utils';
import type { CalculatedColumn, Position } from '../types';

const initialActivePosition: Position = {
  idx: -1,
  // use -Infinity so the initial position is never a valid position
  rowIdx: Number.NEGATIVE_INFINITY
};

export function useActivePosition<R>({
  gridRef,
  columns,
  rows,
  maxColIdx,
  minRowIdx,
  maxRowIdx
}: {
  gridRef: React.RefObject<HTMLDivElement | null>;
  columns: readonly CalculatedColumn<R>[];
  rows: readonly R[];
  maxColIdx: number;
  minRowIdx: number;
  maxRowIdx: number;
}) {
  const [activePosition, setActivePosition] = useState<Position>(initialActivePosition);
  const [positionToFocus, setPositionToFocus] = useState<Position | null>(null);
  const positionToFocusRef = useRef<Position>(null);

  /**
   * Returns whether the given position is a valid cell position in the grid.
   * Active bounds: any cell of the grid, including the header row
   * Viewport: any cell of the rows
   */
  function validatePosition({ idx, rowIdx }: Position) {
    const isColumnInBounds = idx >= 0 && idx <= maxColIdx;
    const isCellInActiveBounds = isColumnInBounds && rowIdx >= minRowIdx && rowIdx <= maxRowIdx;
    const isCellInViewport = isColumnInBounds && rowIdx >= 0 && rowIdx < rows.length;

    return { isCellInActiveBounds, isCellInViewport };
  }

  let resolvedActivePosition = activePosition;
  let validatedPosition = validatePosition(activePosition);

  // Reinitialize the active position and immediately use the new state if it is no longer valid.
  // This can happen when a column or row is removed.
  if (activePosition !== initialActivePosition && !validatedPosition.isCellInActiveBounds) {
    setActivePosition(initialActivePosition);
    resolvedActivePosition = initialActivePosition;
    validatedPosition = validatePosition(initialActivePosition);
  }

  function queryActiveColumn(): CalculatedColumn<R> | undefined {
    if (!validatedPosition.isCellInActiveBounds) return;
    return columns[resolvedActivePosition.idx];
  }

  useLayoutEffect(() => {
    // Layout effects clean up when the component is replaced by a suspense fallback,
    // or when under <Activity mode="hidden">, then re-mount when the suspense boundary resolves,
    // or when Activity switches back to `mode="visible"`.
    // So we use a ref to:
    // 1. avoid re-focusing after the effect re-mounts
    // 2. avoid re-rendering by not re-setting the state
    if (positionToFocus !== null && positionToFocus !== positionToFocusRef.current) {
      positionToFocusRef.current = positionToFocus;
      focusCell(gridRef.current!);
    }
  }, [positionToFocus, gridRef]);

  return {
    activePosition: resolvedActivePosition,
    setActivePosition,
    setPositionToFocus,
    activePositionIsInActiveBounds: validatedPosition.isCellInActiveBounds,
    activePositionIsCellInViewport: validatedPosition.isCellInViewport,
    validatePosition,
    queryActiveColumn
  } as const;
}
