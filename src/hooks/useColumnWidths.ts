import { useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

import type { CalculatedColumn, ColumnWidths, ResizedWidth } from '../types';
import type { DataGridProps } from '../DataGrid';

/**
 * The grid doesn't measure columns: string widths, like `'auto'` or `'minmax(0, max-content)'`,
 * are left to CSS grid. Only the columns resized by the user get a width in pixels.
 */
export function useColumnWidths<R>(
  columns: readonly CalculatedColumn<R>[],
  templateColumns: readonly string[],
  gridRef: React.RefObject<HTMLDivElement | null>,
  columnWidths: ColumnWidths,
  onColumnWidthsChange: (columnWidths: ColumnWidths) => void,
  onColumnResize: DataGridProps<R>['onColumnResize'],
  setColumnResizing: (isColumnResizing: boolean) => void
) {
  const [columnToResize, setColumnToResize] = useState<{
    readonly key: string;
    readonly width: ResizedWidth;
  } | null>(null);
  const newTemplateColumns = [...templateColumns];

  if (columnToResize !== null) {
    const column = columns.find(({ key }) => key === columnToResize.key);
    if (column !== undefined) {
      newTemplateColumns[column.idx] =
        columnToResize.width === 'max-content' ? 'max-content' : `${columnToResize.width}px`;
    }
  }

  const gridTemplateColumns = newTemplateColumns.join(' ');

  useLayoutEffect(updateResizedWidth);

  // the resized width is read from the rendered column, so `max-content` and the min and max widths are applied
  function updateResizedWidth() {
    if (columnToResize === null) return;
    const { key } = columnToResize;
    setColumnToResize(null);

    const width = getRenderedColumnWidth(gridRef, key);
    if (width === undefined || width === columnWidths.get(key)?.width) return;

    onColumnWidthsChange(new Map([...columnWidths, [key, { type: 'resized', width }]]));
  }

  function handleColumnResize(column: CalculatedColumn<R>, nextWidth: ResizedWidth) {
    const { key } = column;

    flushSync(() => {
      setColumnToResize({ key, width: nextWidth });
      setColumnResizing(typeof nextWidth === 'number');
    });

    if (onColumnResize) {
      const previousWidth = columnWidths.get(key)?.width;
      const newWidth =
        typeof nextWidth === 'number' ? nextWidth : getRenderedColumnWidth(gridRef, key);
      if (newWidth !== undefined && newWidth !== previousWidth) {
        onColumnResize(column, newWidth);
      }
    }
  }

  return {
    gridTemplateColumns,
    handleColumnResize
  } as const;
}

function getRenderedColumnWidth(gridRef: React.RefObject<HTMLDivElement | null>, key: string) {
  const selector = `[data-measuring-cell-key="${CSS.escape(key)}"]`;
  const measuringCell = gridRef.current?.querySelector(selector);
  return measuringCell?.getBoundingClientRect().width;
}
