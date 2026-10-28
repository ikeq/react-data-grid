import { memo, type MouseEvent } from 'react';

import { useRovingTabIndex } from './hooks';
import {
  CELL_SELECTION_EDGE_BOTTOM,
  CELL_SELECTION_EDGE_END,
  CELL_SELECTION_EDGE_START,
  CELL_SELECTION_EDGE_TOP,
  createCellEvent,
  getCellClassname,
  getCellStyle,
  ROW_HEADER_COLUMN_KEY
} from './utils';
import type { CellMouseEventHandler, RenderCellProps } from './types';
import {
  cellRangeEdgeClassname,
  cellRangeSelectedClassname,
  headerCellRangeSelectedClassname
} from './style/cell';

function Cell<R>({
  column,
  isCellActive,
  isCellSelected,
  cellSelectionEdges,
  row,
  rowIdx,
  className,
  onMouseDown,
  onCellMouseDown,
  onClick,
  onCellClick,
  onDoubleClick,
  onCellDoubleClick,
  onContextMenu,
  onCellContextMenu,
  setActivePosition,
  style,
  ...props
}: RenderCellProps<R>) {
  const { tabIndex, childTabIndex, onFocus } = useRovingTabIndex(isCellActive);

  const { cellClass } = column;
  let selectedClassname: string | undefined;
  if (isCellSelected) {
    selectedClassname =
      column.key === ROW_HEADER_COLUMN_KEY
        ? headerCellRangeSelectedClassname
        : cellRangeSelectedClassname;
  }
  className = getCellClassname(
    column,
    selectedClassname,
    cellSelectionEdges !== 0 && cellRangeEdgeClassname,
    (cellSelectionEdges & CELL_SELECTION_EDGE_TOP) !== 0 && 'rdg-cell-range-edge-top',
    (cellSelectionEdges & CELL_SELECTION_EDGE_BOTTOM) !== 0 && 'rdg-cell-range-edge-bottom',
    (cellSelectionEdges & CELL_SELECTION_EDGE_START) !== 0 && 'rdg-cell-range-edge-start',
    (cellSelectionEdges & CELL_SELECTION_EDGE_END) !== 0 && 'rdg-cell-range-edge-end',
    typeof cellClass === 'function' ? cellClass(row) : cellClass,
    className
  );

  function handleMouseEvent(
    event: React.MouseEvent<HTMLDivElement>,
    eventHandler: CellMouseEventHandler<R>
  ) {
    let eventHandled = false;
    if (eventHandler) {
      const cellEvent = createCellEvent(event);
      eventHandler({ rowIdx, row, column }, cellEvent);
      eventHandled = cellEvent.isGridDefaultPrevented();
    }
    return eventHandled;
  }

  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event);
    if (!handleMouseEvent(event, onCellMouseDown)) {
      // activate the cell if the event is not prevented
      setActivePosition({ idx: column.idx, rowIdx });
    }
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    onClick?.(event);
    handleMouseEvent(event, onCellClick);
  }

  function handleDoubleClick(event: MouseEvent<HTMLDivElement>) {
    onDoubleClick?.(event);
    handleMouseEvent(event, onCellDoubleClick);
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    onContextMenu?.(event);
    handleMouseEvent(event, onCellContextMenu);
  }

  return (
    <div
      role="gridcell"
      aria-colindex={column.idx + 1} // aria-colindex is 1-based
      aria-selected={isCellActive}
      tabIndex={tabIndex}
      className={className}
      style={{
        ...getCellStyle(column),
        ...style
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onFocus={onFocus}
      {...props}
    >
      {column.renderCell({
        column,
        row,
        rowIdx,
        tabIndex: childTabIndex
      })}
    </div>
  );
}

export default memo(Cell) as <R>(props: RenderCellProps<R>) => React.JSX.Element;
