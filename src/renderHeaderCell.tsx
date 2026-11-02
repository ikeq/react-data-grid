import { css } from 'ecij';

import type { RenderHeaderCellContentProps } from './types';
import { renderSortIcon, renderSortPriority } from './sortStatus';

const headerSortCellClassname = css`
  @layer rdg.SortableHeaderCell {
    display: flex;
  }
`;

export const headerSortNameClassname = css`
  @layer rdg.SortableHeaderCellName {
    flex-grow: 1;
    overflow: clip;
    text-overflow: ellipsis;
  }
`;

/**
 * The default header cell content: the column name, and the sort status when the column is sorted.
 * It doesn't sort the column: render a control that calls `onSort` to sort it.
 */
export function renderHeaderCell<R>({
  column,
  sortDirection,
  priority
}: RenderHeaderCellContentProps<R>) {
  if (sortDirection === undefined) return column.name;

  return (
    <span className={headerSortCellClassname}>
      <span className={headerSortNameClassname}>{column.name}</span>
      <span>
        {renderSortIcon({ sortDirection })}
        {renderSortPriority({ priority })}
      </span>
    </span>
  );
}
