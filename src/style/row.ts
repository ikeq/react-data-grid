import { css } from 'ecij';

import { cellClassname, cellRangeSelectedClassname, rowHeaderCellClassname } from './cell';

export const rowClassname = css`
  @layer rdg.Row {
    display: grid;
    grid-column: 1/-1;
    grid-template: subgrid / subgrid;
    background-color: var(--rdg-background-color);

    /*
     * The hovered data cell has the border of the selected ranges on every edge, and keeps its background.
     * The selected cells are not outlined, as the border of their range would surround the hovered cell's,
     * and neither are the row numbers.
     */
    & > .${cellClassname}:hover {
      &:not(.${rowHeaderCellClassname}, .${cellRangeSelectedClassname})::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        border: var(--rdg-cell-selection-border-width) solid var(--rdg-cell-selection-border-color);
      }
    }
  }
`;

/*
 * Zebra stripes, starting with the first row (rowIdx 0).
 * The row's background is replaced through the variable, so selected cells,
 * which set their own background, keep working.
 */
export const rowEvenClassname = css`
  @layer rdg.Row {
    --rdg-background-color: var(--rdg-row-stripe-background-color);
  }
`;
