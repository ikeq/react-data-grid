import type { CalculatedColumn } from '../types';
import { getColumnMaxWidth } from './styleUtils';

export * from './activePositionUtils';
export * from './cellSelectionUtils';
export * from './copyUtils';
export * from './domUtils';
export * from './eventUtils';
export * from './keyboardUtils';
export * from './renderMeasuringCells';
export * from './styleUtils';
export * from './viewportUtils';

export const { min, max, floor, abs } = Math;

export function clampColumnWidth<R>(
  width: number,
  { minWidth, maxWidth }: CalculatedColumn<R>
): number {
  width = max(width, minWidth);

  // ignore maxWidth if it is less than minWidth
  const cappedMaxWidth = getColumnMaxWidth({ minWidth, maxWidth });
  return cappedMaxWidth === undefined ? width : min(width, cappedMaxWidth);
}
