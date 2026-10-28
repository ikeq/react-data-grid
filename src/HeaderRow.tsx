import { memo } from 'react';
import { css } from 'ecij';

import { classnames, intervalsOverlap, ROW_HEADER_COLUMN_KEY } from './utils';
import type {
  CalculatedColumn,
  MapViewportColumns,
  Maybe,
  Position,
  ResizedWidth,
  SelectedCellIntervals
} from './types';
import type { DataGridProps } from './DataGrid';
import HeaderCell from './HeaderCell';
import { cell, cellFrozenBase, rowHeaderCornerCellClassname } from './style/cell';

type SharedDataGridProps<R, K extends React.Key> = Pick<
  DataGridProps<R, K>,
  'sortColumns' | 'onSortColumnsChange'
>;

export interface HeaderRowProps<R, K extends React.Key> extends SharedDataGridProps<R, K> {
  mapViewportColumns: MapViewportColumns<R>;
  onColumnResize: (column: CalculatedColumn<R>, width: ResizedWidth) => void;
  onColumnResizeEnd: () => void;
  activeCellIdx: number | undefined;
  setPosition: (position: Position) => void;
  shouldFocusGrid: boolean;
  headerRowClass: Maybe<string>;
  selectedColumnIntervals: SelectedCellIntervals | undefined;
  onHeaderCellMouseDown: (
    column: CalculatedColumn<R>,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
  onHeaderCellContextMenu: (
    column: CalculatedColumn<R>,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
}

const headerRow = css`
  @layer rdg.HeaderRow {
    display: contents;
    background-color: var(--rdg-header-background-color);
    color: var(--rdg-header-color);
    font-weight: bold;

    & > .${cell} {
      /* Should have a higher value than 1 to show up above regular cells and the focus sink */
      z-index: 2;
      position: sticky;

      /*
       * The line between the header and the data area.
       * It is drawn on the header cells, which are sticky, so it stays when the rows scroll under them.
       */
      &:not(.${rowHeaderCornerCellClassname}) {
        border-block-end: var(--rdg-border-width) solid var(--rdg-border-color);
      }
    }

    & > .${cellFrozenBase} {
      z-index: 3;
    }
  }
`;

export const headerRowClassname = `rdg-header-row ${headerRow}`;

function HeaderRow<R, K extends React.Key>({
  headerRowClass,
  mapViewportColumns,
  onColumnResize,
  onColumnResizeEnd,
  sortColumns,
  onSortColumnsChange,
  activeCellIdx,
  setPosition,
  shouldFocusGrid,
  selectedColumnIntervals,
  onHeaderCellMouseDown,
  onHeaderCellContextMenu
}: HeaderRowProps<R, K>) {
  const cells = mapViewportColumns(activeCellIdx, (column, isCellActive, index) => (
    <HeaderCell<R>
      key={column.key}
      column={column}
      isCellActive={isCellActive}
      isColumnSelected={
        column.key !== ROW_HEADER_COLUMN_KEY &&
        intervalsOverlap(selectedColumnIntervals, column.idx, column.idx)
      }
      onHeaderCellMouseDown={onHeaderCellMouseDown}
      onHeaderCellContextMenu={onHeaderCellContextMenu}
      onColumnResize={onColumnResize}
      onColumnResizeEnd={onColumnResizeEnd}
      onSortColumnsChange={onSortColumnsChange}
      sortColumns={sortColumns}
      setPosition={setPosition}
      shouldFocusGrid={shouldFocusGrid && index === 0}
    />
  ));

  return (
    <div
      role="row"
      aria-rowindex={1} // aria-rowindex is 1-based
      className={classnames(headerRowClassname, headerRowClass)}
    >
      {cells}
    </div>
  );
}

export default memo(HeaderRow) as <R, K extends React.Key>(
  props: HeaderRowProps<R, K>
) => React.JSX.Element;
