import type { CalculatedColumn } from '../types';

export * from './activePositionUtils';
export * from './cellSelectionUtils';
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
  if (typeof maxWidth === 'number' && maxWidth >= minWidth) {
    return min(width, maxWidth);
  }

  return width;
}
