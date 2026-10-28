import type { CellNavigationMode, Position } from '../types';

interface GetNextPositionOpts {
  cellNavigationMode: CellNavigationMode;
  columnsCount: number;
  minRowIdx: number;
  maxRowIdx: number;
  nextPosition: Position;
}

export function getNextActivePosition({
  cellNavigationMode,
  columnsCount,
  minRowIdx,
  maxRowIdx,
  nextPosition
}: GetNextPositionOpts): Position {
  let { idx: nextIdx, rowIdx: nextRowIdx } = nextPosition;

  // Tab moves to the next or previous row at the end or start of a row
  if (cellNavigationMode === 'CHANGE_ROW') {
    if (nextIdx === columnsCount && nextRowIdx !== maxRowIdx) {
      nextIdx = 0;
      nextRowIdx += 1;
    } else if (nextIdx === -1 && nextRowIdx !== minRowIdx) {
      nextRowIdx -= 1;
      nextIdx = columnsCount - 1;
    }
  }

  return { idx: nextIdx, rowIdx: nextRowIdx };
}

interface CanExitGridOpts {
  maxColIdx: number;
  minRowIdx: number;
  maxRowIdx: number;
  activePosition: Position;
  shiftKey: boolean;
}

export function canExitGrid({
  maxColIdx,
  minRowIdx,
  maxRowIdx,
  activePosition: { rowIdx, idx },
  shiftKey
}: CanExitGridOpts): boolean {
  // Exit the grid if we're at the first or last cell of the grid
  const atLastCellInRow = idx === maxColIdx;
  const atFirstCellInRow = idx === 0;
  const atLastRow = rowIdx === maxRowIdx;
  const atFirstRow = rowIdx === minRowIdx;

  return shiftKey ? atFirstCellInRow && atFirstRow : atLastCellInRow && atLastRow;
}
