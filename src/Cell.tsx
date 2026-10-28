import { memo, type MouseEvent } from 'react';
import { css } from 'ecij';

import { useRovingTabIndex } from './hooks';
import {
  CELL_SELECTION_EDGE_BOTTOM,
  CELL_SELECTION_EDGE_END,
  CELL_SELECTION_EDGE_START,
  CELL_SELECTION_EDGE_TOP,
  createCellEvent,
  getCellClassname,
  getCellStyle,
  isCellEditableUtil,
  isCellSelectionUtilityColumn,
  ROW_HEADER_COLUMN_KEY
} from './utils';
import type { CellMouseEventHandler, RenderCellProps } from './types';
import {
  cellRangeEdgeClassname,
  cellRangeSelectedClassname,
  headerCellRangeSelectedClassname
} from './style/cell';

const cellDraggedOver = css`
  @layer rdg.Cell {
    background-color: #ccccff;

    @media (forced-colors: active) {
      background-color: Mark;
    }
  }
`;

const cellDraggedOverClassname = `rdg-cell-dragged-over ${cellDraggedOver}`;

function Cell<R, SR>({
  column,
  colSpan,
  isCellActive,
  isCellSelected = false,
  cellSelectionEdges = 0,
  isDraggedOver,
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
  onRowChange,
  setActivePosition,
  style,
  ...props
}: RenderCellProps<R, SR>) {
  const { tabIndex, childTabIndex, onFocus } = useRovingTabIndex(isCellActive);

  const { cellClass } = column;
  let selectedClassname: string | undefined;
  if (isCellSelected) {
    if (column.key === ROW_HEADER_COLUMN_KEY) {
      selectedClassname = headerCellRangeSelectedClassname;
    } else if (!isCellSelectionUtilityColumn(column.key)) {
      selectedClassname = cellRangeSelectedClassname;
    }
  }
  className = getCellClassname(
    column,
    isDraggedOver && cellDraggedOverClassname,
    selectedClassname,
    cellSelectionEdges !== 0 && cellRangeEdgeClassname,
    (cellSelectionEdges & CELL_SELECTION_EDGE_TOP) !== 0 && 'rdg-cell-range-edge-top',
    (cellSelectionEdges & CELL_SELECTION_EDGE_BOTTOM) !== 0 && 'rdg-cell-range-edge-bottom',
    (cellSelectionEdges & CELL_SELECTION_EDGE_START) !== 0 && 'rdg-cell-range-edge-start',
    (cellSelectionEdges & CELL_SELECTION_EDGE_END) !== 0 && 'rdg-cell-range-edge-end',
    typeof cellClass === 'function' ? cellClass(row) : cellClass,
    className
  );
  const isEditable = isCellEditableUtil(column, row);

  function setActivePositionWrapper(enableEditor = false) {
    setActivePosition({ idx: column.idx, rowIdx }, { enableEditor });
  }

  function handleMouseEvent(
    event: React.MouseEvent<HTMLDivElement>,
    eventHandler: CellMouseEventHandler<R, SR>
  ) {
    let eventHandled = false;
    if (eventHandler) {
      const cellEvent = createCellEvent(event);
      eventHandler({ rowIdx, row, column, setActivePosition: setActivePositionWrapper }, cellEvent);
      eventHandled = cellEvent.isGridDefaultPrevented();
    }
    return eventHandled;
  }

  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event);
    if (!handleMouseEvent(event, onCellMouseDown)) {
      // activate the cell if the event is not prevented
      setActivePositionWrapper();
    }
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    onClick?.(event);
    handleMouseEvent(event, onCellClick);
  }

  function handleDoubleClick(event: MouseEvent<HTMLDivElement>) {
    onDoubleClick?.(event);
    if (!handleMouseEvent(event, onCellDoubleClick)) {
      // go into edit mode if the event is not prevented
      setActivePositionWrapper(true);
    }
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    onContextMenu?.(event);
    handleMouseEvent(event, onCellContextMenu);
  }

  function handleRowChange(newRow: R) {
    onRowChange(column, rowIdx, newRow);
  }

  return (
    <div
      role="gridcell"
      aria-colindex={column.idx + 1} // aria-colindex is 1-based
      aria-colspan={colSpan > 1 ? colSpan : undefined}
      aria-selected={isCellActive}
      aria-readonly={!isEditable || undefined}
      tabIndex={tabIndex}
      className={className}
      style={{
        ...getCellStyle(column, colSpan),
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
        isCellEditable: isEditable,
        tabIndex: childTabIndex,
        onRowChange: handleRowChange
      })}
    </div>
  );
}

const MemoCell = memo(Cell) as <R, SR>(props: RenderCellProps<R, SR>) => React.JSX.Element;

export { MemoCell as Cell };

export function defaultRenderCell<R, SR>(key: React.Key, props: RenderCellProps<R, SR>) {
  return <MemoCell key={key} {...props} />;
}
