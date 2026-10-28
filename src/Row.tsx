import { memo } from 'react';

import { classnames, getCellSelectionEdges, ROW_HEADER_COLUMN_KEY } from './utils';
import type { RenderRowProps } from './types';
import Cell from './Cell';
import { rowClassname } from './style/row';

function Row<R, SR>({
  className,
  rowIdx,
  gridRowStart,
  activeCellIdx,
  selectedRowRanges,
  row,
  mapViewportColumns,
  onCellMouseDown,
  onCellClick,
  onCellDoubleClick,
  onCellContextMenu,
  rowClass,
  setActivePosition,
  style,
  ...props
}: RenderRowProps<R, SR>) {
  className = classnames(
    rowClassname,
    `rdg-row-${rowIdx % 2 === 0 ? 'even' : 'odd'}`,
    rowClass?.(row, rowIdx),
    className
  );

  const cells = mapViewportColumns(activeCellIdx, (column, isCellActive) => (
    <Cell
      key={column.key}
      column={column}
      row={row}
      rowIdx={rowIdx}
      isCellActive={isCellActive}
      isCellSelected={
        selectedRowRanges !== undefined &&
        // the row header cell is highlighted when any cell of the row is selected
        (column.key === ROW_HEADER_COLUMN_KEY ||
          selectedRowRanges.some(([start, end]) => column.idx >= start && column.idx <= end))
      }
      cellSelectionEdges={getCellSelectionEdges(selectedRowRanges, column.idx, column.idx)}
      onCellMouseDown={onCellMouseDown}
      onCellClick={onCellClick}
      onCellDoubleClick={onCellDoubleClick}
      onCellContextMenu={onCellContextMenu}
      setActivePosition={setActivePosition}
    />
  ));

  return (
    <div
      role="row"
      className={className}
      style={{
        gridRowStart,
        ...style
      }}
      {...props}
    >
      {cells}
    </div>
  );
}

export default memo(Row) as <R, SR>(props: RenderRowProps<R, SR>) => React.JSX.Element;
