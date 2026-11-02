import { useMemo } from 'react';

import { clampColumnWidth, getColumnTrack } from '../utils';
import type { CalculatedColumn, Column, ColumnFrozen } from '../types';
import { renderValue } from '../cellRenderers';
import type { DataGridProps } from '../DataGrid';
import { renderHeaderCell } from '../renderHeaderCell';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

interface ColumnMetric {
  width: number;
  left: number;
}

const DEFAULT_COLUMN_WIDTH = 'max-content';
const DEFAULT_COLUMN_MIN_WIDTH = 50;

interface CalculatedColumnsArgs<R> {
  rawColumns: readonly Column<R>[];
  defaultColumnOptions: DataGridProps<R>['defaultColumnOptions'];
  getColumnWidth: (column: CalculatedColumn<R>) => string | number;
  /** the rendered widths of the frozen columns with string widths, for the offsets of the frozen columns */
  renderedFrozenColumnWidths: ReadonlyMap<string, number>;
}

export function useCalculatedColumns<R>({
  rawColumns,
  defaultColumnOptions,
  getColumnWidth,
  renderedFrozenColumnWidths
}: CalculatedColumnsArgs<R>) {
  const defaultWidth = defaultColumnOptions?.width ?? DEFAULT_COLUMN_WIDTH;
  const defaultMinWidth = defaultColumnOptions?.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH;
  const defaultMaxWidth = defaultColumnOptions?.maxWidth ?? undefined;
  const defaultRenderCell = defaultColumnOptions?.renderCell ?? renderValue;
  const defaultRenderHeaderCell = defaultColumnOptions?.renderHeaderCell ?? renderHeaderCell;
  const defaultSortable = defaultColumnOptions?.sortable ?? false;
  const defaultResizable = defaultColumnOptions?.resizable ?? false;

  const { columns, lastStartFrozenColumnIndex, firstEndFrozenColumnIndex } = useMemo((): {
    readonly columns: readonly CalculatedColumn<R>[];
    readonly lastStartFrozenColumnIndex: number;
    readonly firstEndFrozenColumnIndex: number;
  } => {
    let startFrozenColumnCount = 0;
    let endFrozenColumnCount = 0;
    const columns: Mutable<CalculatedColumn<R>>[] = [];

    for (const rawColumn of rawColumns) {
      // normalize the `frozen` value
      const frozen: ColumnFrozen =
        rawColumn.frozen === true ? 'start' : (rawColumn.frozen ?? false);

      // Set every property in a fixed order instead of spreading `rawColumn`,
      // so that all calculated columns share a single hidden class (shape) in JS engines,
      // and the column property reads that run for every rendered cell stay monomorphic.
      columns.push({
        name: rawColumn.name,
        key: rawColumn.key,
        idx: 0,
        width: rawColumn.width ?? defaultWidth,
        minWidth: rawColumn.minWidth ?? defaultMinWidth,
        maxWidth: rawColumn.maxWidth ?? defaultMaxWidth,
        cellClass: rawColumn.cellClass,
        headerCellClass: rawColumn.headerCellClass,
        renderCell: rawColumn.renderCell ?? defaultRenderCell,
        renderHeaderCell: rawColumn.renderHeaderCell ?? defaultRenderHeaderCell,
        frozen,
        resizable: rawColumn.resizable ?? defaultResizable,
        sortable: rawColumn.sortable ?? defaultSortable,
        sortDescendingFirst: rawColumn.sortDescendingFirst
      });

      if (frozen === 'start') {
        startFrozenColumnCount += 1;
      } else if (frozen === 'end') {
        endFrozenColumnCount += 1;
      }
    }

    // Sort by band: start-frozen → unfrozen → end-frozen.
    // Stable sort preserves definition order within each band.
    columns.sort((a, b) => {
      const ra = a.frozen === 'end' ? 2 : a.frozen === false ? 1 : 0;
      const rb = b.frozen === 'end' ? 2 : b.frozen === false ? 1 : 0;
      return ra - rb;
    });

    for (let idx = 0; idx < columns.length; idx++) {
      columns[idx].idx = idx;
    }

    return {
      columns,
      lastStartFrozenColumnIndex: startFrozenColumnCount - 1,
      firstEndFrozenColumnIndex:
        endFrozenColumnCount === 0 ? -1 : columns.length - endFrozenColumnCount
    };
  }, [
    rawColumns,
    defaultWidth,
    defaultMinWidth,
    defaultMaxWidth,
    defaultRenderCell,
    defaultRenderHeaderCell,
    defaultResizable,
    defaultSortable
  ]);

  // the metrics are only used for the offsets of the frozen columns: all the columns are rendered
  const { templateColumns, layoutCssVars, totalStartFrozenColumnWidth, totalEndFrozenColumnWidth } =
    useMemo((): {
      templateColumns: readonly string[];
      layoutCssVars: Readonly<Record<string, string>>;
      totalStartFrozenColumnWidth: number;
      totalEndFrozenColumnWidth: number;
    } => {
      const columnMetrics = new Map<CalculatedColumn<R>, ColumnMetric>();
      let left = 0;
      let totalStartFrozenColumnWidth = 0;
      let totalEndFrozenColumnWidth = 0;
      const templateColumns: string[] = [];

      for (const column of columns) {
        const rawWidth = getColumnWidth(column);
        let width: number;

        if (typeof rawWidth === 'number') {
          width = clampColumnWidth(rawWidth, column);
          templateColumns.push(`${width}px`);
        } else {
          // the rendered width of frozen columns is read after they are rendered,
          // the min width is an estimate until then, and for the other columns
          width = renderedFrozenColumnWidths.get(column.key) ?? column.minWidth;
          templateColumns.push(getColumnTrack(rawWidth, column));
        }

        columnMetrics.set(column, { width, left });
        left += width;
      }

      if (lastStartFrozenColumnIndex !== -1) {
        const lastStartFrozenColumnMetric = columnMetrics.get(columns[lastStartFrozenColumnIndex])!;
        totalStartFrozenColumnWidth =
          lastStartFrozenColumnMetric.left + lastStartFrozenColumnMetric.width;
      }

      const layoutCssVars: Record<string, string> = {};

      for (let i = 0; i <= lastStartFrozenColumnIndex; i++) {
        const column = columns[i];
        layoutCssVars[`--rdg-frozen-start-${column.idx}`] = `${columnMetrics.get(column)!.left}px`;
      }

      if (firstEndFrozenColumnIndex !== -1) {
        const lastColumn = columns[columns.length - 1];
        const lastColumnMetric = columnMetrics.get(lastColumn)!;
        const gridEnd = lastColumnMetric.left + lastColumnMetric.width;
        const firstEndFrozenColumnMetric = columnMetrics.get(columns[firstEndFrozenColumnIndex])!;
        totalEndFrozenColumnWidth = gridEnd - firstEndFrozenColumnMetric.left;

        for (let i = firstEndFrozenColumnIndex; i < columns.length; i++) {
          const column = columns[i];
          const metric = columnMetrics.get(column)!;
          layoutCssVars[`--rdg-frozen-end-${column.idx}`] =
            `${gridEnd - (metric.left + metric.width)}px`;
        }
      }

      return {
        templateColumns,
        layoutCssVars,
        totalStartFrozenColumnWidth,
        totalEndFrozenColumnWidth
      };
    }, [
      getColumnWidth,
      renderedFrozenColumnWidths,
      columns,
      lastStartFrozenColumnIndex,
      firstEndFrozenColumnIndex
    ]);

  return {
    columns,
    templateColumns,
    layoutCssVars,
    lastStartFrozenColumnIndex,
    firstEndFrozenColumnIndex,
    totalStartFrozenColumnWidth,
    totalEndFrozenColumnWidth
  };
}
