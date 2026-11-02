import { css } from 'ecij';

import { cellClassname, cellRangeSelectedClassname, rowHeaderCellClassname } from './cell';

export const rowClassname = css`
  @layer rdg.Row {
    display: grid;
    grid-column: 1/-1;
    grid-template: subgrid / subgrid;
    background-color: var(--rdg-background-color);

    /* the hovered data cell, the selected cells and the row numbers keep their own background */
    & > .${cellClassname}:hover {
      &:not(.${rowHeaderCellClassname}, .${cellRangeSelectedClassname}) {
        background-color: var(--rdg-cell-hover-background-color);
      }
    }
  }
`;

/*
 * Zebra stripes, starting with the first row (rowIdx 0).
 * The row's background is replaced through the variable, so hovered and selected cells,
 * which set their own background, keep working.
 */
export const rowEvenClassname = css`
  @layer rdg.Row {
    --rdg-background-color: var(--rdg-row-stripe-background-color);
  }
`;
