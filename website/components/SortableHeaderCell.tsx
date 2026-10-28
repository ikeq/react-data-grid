import { css } from 'ecij';

import { renderSortIcon, renderSortPriority } from '../../src';
import type { RenderHeaderCellContentProps } from '../../src';

const headerClassname = css`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const nameClassname = css`
  flex-grow: 1;
  overflow: clip;
  text-overflow: ellipsis;
`;

const sortButtonClassname = css`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-inline-size: 20px;
  block-size: 20px;
  padding-inline: 4px;
  border: none;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.4;

  &:hover,
  &:focus-visible,
  &[data-sorted] {
    opacity: 1;
  }

  &:hover {
    background-color: light-dark(rgb(0 0 0 / 8%), rgb(255 255 255 / 12%));
  }
`;

/**
 * Clicking a header cell selects the column, so sortable columns are sorted with a button,
 * which shows the sort state passed by the grid. Ctrl/Cmd + click sorts by multiple columns.
 */
export function renderSortableHeaderCell<R, SR>({
  column,
  sortDirection,
  priority,
  tabIndex,
  onSort
}: RenderHeaderCellContentProps<R, SR>) {
  if (!column.sortable) return column.name;

  return (
    <span className={headerClassname}>
      <span className={nameClassname}>{column.name}</span>
      <button
        type="button"
        tabIndex={tabIndex}
        className={sortButtonClassname}
        data-sorted={sortDirection === undefined ? undefined : true}
        aria-label={`Sort ${typeof column.name === 'string' ? column.name : column.key}`}
        onClick={onSort}
      >
        {sortDirection === undefined ? '⇅' : renderSortIcon({ sortDirection })}
        {renderSortPriority({ priority })}
      </button>
    </span>
  );
}
