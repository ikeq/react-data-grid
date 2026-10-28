import { css } from 'ecij';

export const row = css`
  @layer rdg.Row {
    display: grid;
    grid-column: 1/-1;
    grid-template: subgrid / subgrid;
    background-color: var(--rdg-background-color);

    /*
     * Zebra stripes, starting with the first row (rowIdx 0).
     * The row's background is replaced through the variable, so hovered rows and selected cells,
     * which set their own background, keep working.
     */
    &.rdg-row-even {
      --rdg-background-color: var(--rdg-row-stripe-background-color);
    }

    &:hover {
      background-color: var(--rdg-row-hover-background-color);
    }
  }
`;

export const rowClassname = `rdg-row ${row}`;
