import { useRef } from 'react';
import { css } from 'ecij';

import { useRovingTabIndex } from './hooks';
import {
  clampColumnWidth,
  getCellClassname,
  getCellStyle,
  isCtrlKeyHeldDown,
  isElement,
  ROW_HEADER_COLUMN_KEY,
  stopPropagation
} from './utils';
import type { CalculatedColumn, SortColumn, SortEvent } from './types';
import type { HeaderRowProps } from './HeaderRow';
import { headerCellRangeSelectedClassname, rowHeaderCornerCellClassnames } from './style/cell';

const cellResizable = css`
  @layer rdg.HeaderCell {
    touch-action: none;
  }
`;

const cellResizableClassname = `rdg-cell-resizable ${cellResizable}`;

const resizeHandle = css`
  @layer rdg.HeaderCell {
    cursor: col-resize;
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    inset-block-end: 0;
    inline-size: 10px;
  }
`;

const resizeHandleClassname = `rdg-resize-handle ${resizeHandle}`;

type SharedHeaderRowProps<R, SR> = Pick<
  HeaderRowProps<R, SR, React.Key>,
  | 'sortColumns'
  | 'onSortColumnsChange'
  | 'setPosition'
  | 'onColumnResize'
  | 'onColumnResizeEnd'
  | 'shouldFocusGrid'
  | 'onHeaderCellMouseDown'
  | 'onHeaderCellContextMenu'
>;

export interface HeaderCellProps<R, SR> extends SharedHeaderRowProps<R, SR> {
  column: CalculatedColumn<R, SR>;
  isCellActive: boolean;
  isColumnSelected: boolean;
}

export default function HeaderCell<R, SR>({
  column,
  isCellActive,
  isColumnSelected,
  onHeaderCellMouseDown,
  onHeaderCellContextMenu,
  onColumnResize,
  onColumnResizeEnd,
  sortColumns,
  onSortColumnsChange,
  setPosition,
  shouldFocusGrid
}: HeaderCellProps<R, SR>) {
  const resizingRef = useRef(false);
  // the header row's index, header cells are always in the header row
  const rowIdx = -1;
  // set the tabIndex to 0 when there is no active cell so the grid can receive focus
  const { tabIndex, childTabIndex, onFocus } = useRovingTabIndex(shouldFocusGrid || isCellActive);
  const sortIndex = sortColumns?.findIndex((sort) => sort.columnKey === column.key);
  const sortColumn =
    sortIndex !== undefined && sortIndex > -1 ? sortColumns![sortIndex] : undefined;
  const sortDirection = sortColumn?.direction;
  const priority = sortColumn !== undefined && sortColumns!.length > 1 ? sortIndex! + 1 : undefined;
  const ariaSort =
    sortDirection && !priority ? (sortDirection === 'ASC' ? 'ascending' : 'descending') : undefined;
  const { resizable } = column;

  const className = getCellClassname(
    column,
    column.key === ROW_HEADER_COLUMN_KEY && rowHeaderCornerCellClassnames,
    column.headerCellClass,
    resizable && cellResizableClassname,
    isColumnSelected && headerCellRangeSelectedClassname
  );

  // Clicking the header cell selects the column, so sorting is triggered by controls rendered in the header cell,
  // for example a sort button with `onClick={onSort}`, `onSort` being passed to `renderHeaderCell`
  function onSort(event?: SortEvent) {
    if (!column.sortable || onSortColumnsChange == null) return;
    // Ctrl/Cmd + click adds the column to the sorted columns
    const multiSort = event != null && (event.ctrlKey || event.metaKey);
    const { sortDescendingFirst } = column;
    if (sortColumn === undefined) {
      // not currently sorted
      const nextSort: SortColumn = {
        columnKey: column.key,
        direction: sortDescendingFirst ? 'DESC' : 'ASC'
      };
      onSortColumnsChange(sortColumns && multiSort ? [...sortColumns, nextSort] : [nextSort]);
    } else {
      let nextSortColumn: SortColumn | undefined;
      if (
        (sortDescendingFirst === true && sortDirection === 'DESC') ||
        (sortDescendingFirst !== true && sortDirection === 'ASC')
      ) {
        nextSortColumn = {
          columnKey: column.key,
          direction: sortDirection === 'ASC' ? 'DESC' : 'ASC'
        };
      }
      if (multiSort) {
        const nextSortColumns = [...sortColumns!];
        if (nextSortColumn) {
          // swap direction
          nextSortColumns[sortIndex!] = nextSortColumn;
        } else {
          // remove sort
          nextSortColumns.splice(sortIndex!, 1);
        }
        onSortColumnsChange(nextSortColumns);
      } else {
        onSortColumnsChange(nextSortColumn ? [nextSortColumn] : []);
      }
    }
  }

  function handleFocus(event: React.FocusEvent<HTMLDivElement>) {
    onFocus?.(event);
    if (shouldFocusGrid) {
      // Activate the first header cell if there is no active cell
      setPosition({ idx: 0, rowIdx });
    }
  }

  function onMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    setPosition({ idx: column.idx, rowIdx });
    // controls rendered in the header cell, like a sort button, don't select the column
    if (!isInteractiveTarget(event)) {
      onHeaderCellMouseDown(column, event);
    }
  }

  function onContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    onHeaderCellContextMenu(column, event);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLSpanElement>) {
    const { key } = event;
    if (resizable && isCtrlKeyHeldDown(event) && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      // prevent navigation
      // TODO: check if we can use `preventDefault` instead
      event.stopPropagation();
      resizingRef.current = true;
      const { width } = event.currentTarget.getBoundingClientRect();
      const offset = key === 'ArrowLeft' ? -10 : 10;
      const newWidth = clampColumnWidth(width + offset, column);
      if (newWidth !== width) {
        onColumnResize(column, newWidth);
      }
    }
  }

  // the resize also ends when the header cell loses focus, as the key may then be released elsewhere
  function endKeyboardResize() {
    if (resizingRef.current) {
      resizingRef.current = false;
      onColumnResizeEnd();
    }
  }

  const style: React.CSSProperties = {
    ...getCellStyle(column),
    insetBlockStart: 0,
    gridRowStart: 1
  };

  const content = column.renderHeaderCell({
    column,
    sortDirection,
    priority,
    tabIndex: childTabIndex,
    onSort
  });

  return (
    <div
      role="columnheader"
      aria-colindex={column.idx + 1}
      aria-selected={isCellActive}
      aria-sort={ariaSort}
      tabIndex={tabIndex}
      className={className}
      style={style}
      onMouseDown={onMouseDown}
      onFocus={handleFocus}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      onKeyUp={endKeyboardResize}
      onBlur={endKeyboardResize}
    >
      {content}

      {resizable && (
        <ResizeHandle
          column={column}
          onColumnResize={onColumnResize}
          onColumnResizeEnd={onColumnResizeEnd}
        />
      )}
    </div>
  );
}

type ResizeHandleProps<R, SR> = Pick<
  HeaderCellProps<R, SR>,
  'column' | 'onColumnResize' | 'onColumnResizeEnd'
>;

function ResizeHandle<R, SR>({
  column,
  onColumnResize,
  onColumnResizeEnd
}: ResizeHandleProps<R, SR>) {
  const resizingOffsetRef = useRef<number>(undefined);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const { currentTarget, pointerId } = event;
    currentTarget.setPointerCapture(pointerId);
    const headerCell = currentTarget.parentElement!;
    const { right } = headerCell.getBoundingClientRect();
    resizingOffsetRef.current = right - event.clientX;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const offset = resizingOffsetRef.current;
    if (offset === undefined) return;
    const { width, left } = event.currentTarget.parentElement!.getBoundingClientRect();
    let newWidth = event.clientX + offset - left;
    newWidth = clampColumnWidth(newWidth, column);
    if (width > 0 && newWidth !== width) {
      onColumnResize(column, newWidth);
    }
  }

  function onLostPointerCapture() {
    onColumnResizeEnd();
    resizingOffsetRef.current = undefined;
  }

  function onDoubleClick() {
    onColumnResize(column, 'max-content');
  }

  return (
    <div
      aria-hidden
      className={resizeHandleClassname}
      onClick={stopPropagation}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      // we are not using pointerup because it does not fire in some cases
      // pointer down -> alt+tab -> pointer up over another window -> pointerup event not fired
      onLostPointerCapture={onLostPointerCapture}
      onDoubleClick={onDoubleClick}
    />
  );
}

// controls in the header cell handle their own clicks
function isInteractiveTarget(event: React.MouseEvent<HTMLDivElement>) {
  const { target, currentTarget } = event;
  if (!isElement(target)) return false;
  const control = target.closest('button, a[href], input, select, textarea, [role="button"]');
  return control !== null && currentTarget.contains(control);
}
