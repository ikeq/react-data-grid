import { css } from 'ecij';

export const cell = css`
  @layer rdg.Cell {
    /* max-content does not work with size containment
     * dynamically switching between different containment styles incurs a heavy relayout penalty
     * Chromium bug: at odd zoom levels or subpixel positioning,
     * layout/paint/style containment can make cell borders disappear
     *   https://issues.chromium.org/issues/40840864
     */
    position: relative; /* needed for absolute positioning to work */
    padding-block: 0;
    padding-inline: 12px;
    align-content: center;
    background-color: inherit;

    white-space: nowrap;
    overflow: clip;
    text-overflow: ellipsis;
    outline: none;

    /*
     * The active cell box is only drawn when the cell isn't in the cell selection, for example when the selection is cleared:
     * the selection draws the selected cells with its background and the border around each range.
     */
    &[aria-selected='true']:not(.rdg-cell-range-selected)::before {
      /* drawn on a pseudo element inside the cell, like the border around the selected ranges, so both line up */
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      border: var(--rdg-selection-width) solid var(--rdg-selection-color);
    }

    /*
     * Header cells and row header cells are highlighted with their background when selected,
     * so the box is only drawn in the data area. It still shows when they are focused with the keyboard,
     * otherwise there would be no focus indicator.
     */
    &[aria-selected='true']:is([role='columnheader'], .rdg-row-header-cell):not(
        :focus-visible
      )::before {
      content: none;
    }
  }
`;

export const cellClassname = `rdg-cell ${cell}`;

// Single shared sticky/z-index rule reused by both edge-frozen variants.
// Selectors that need to distinguish start vs end use the marker classes
// (`.rdg-cell-frozen-start` / `.rdg-cell-frozen-end`) directly rather than this ecij identifier.
export const cellFrozenBase = css`
  @layer rdg.Cell {
    position: sticky;
    /* Should have a higher value than 0 to show up above unfrozen cells */
    z-index: 1;
  }
`;

// every frozen cell has a line on its side facing the scrolling columns,
// so the frozen columns are separated from each other and from the scrolling columns
const cellFrozenStartEdge = css`
  @layer rdg.Cell {
    border-inline-end: var(--rdg-border-width) solid var(--rdg-border-color);
  }
`;

const cellFrozenEndEdge = css`
  @layer rdg.Cell {
    border-inline-start: var(--rdg-border-width) solid var(--rdg-border-color);
  }
`;

// the top-left cell, the header cell of `RowHeaderColumn`.
// It has the header line and the frozen column line, which meet at its end bottom corner
export const rowHeaderCornerCellClassname = 'rdg-row-header-corner-cell';

export const cellFrozenStartClassname = `rdg-cell-frozen-start ${cellFrozenBase} ${cellFrozenStartEdge}`;
export const cellFrozenEndClassname = `rdg-cell-frozen-end ${cellFrozenBase} ${cellFrozenEndEdge}`;

const cellRangeSelected = css`
  @layer rdg.Cell {
    background-color: var(--rdg-cell-selection-background-color);
  }
`;

export const cellRangeSelectedClassname = `rdg-cell-range-selected ${cellRangeSelected}`;

// draws the border around each selected range, on the edges that the cell is on
const cellRangeEdge = css`
  @layer rdg.Cell {
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      border: 0 solid var(--rdg-cell-selection-border-color);
    }

    &.rdg-cell-range-edge-top::after {
      border-block-start-width: var(--rdg-cell-selection-border-width);
    }

    &.rdg-cell-range-edge-bottom::after {
      border-block-end-width: var(--rdg-cell-selection-border-width);
    }

    &.rdg-cell-range-edge-start::after {
      border-inline-start-width: var(--rdg-cell-selection-border-width);
    }

    &.rdg-cell-range-edge-end::after {
      border-inline-end-width: var(--rdg-cell-selection-border-width);
    }
  }
`;

export const cellRangeEdgeClassname = `rdg-cell-range-edge ${cellRangeEdge}`;

const rowHeaderCell = css`
  @layer rdg.Cell {
    background-color: var(--rdg-header-background-color);
    color: var(--rdg-header-color);
    text-align: center;
    cursor: default;
    user-select: none;
  }
`;

export const rowHeaderCellClassname = `rdg-row-header-cell ${rowHeaderCell}`;

// highlights the row header cells of the selected rows, and the header cells of the selected columns
const headerCellRangeSelected = css`
  @layer rdg.HeaderCell {
    background-color: var(--rdg-header-selection-background-color);
    color: var(--rdg-header-selection-color);
  }
`;

export const headerCellRangeSelectedClassname = `rdg-header-cell-range-selected ${headerCellRangeSelected}`;

// prevents text selection while selecting cells with a pointer
const cellSelecting = css`
  @layer rdg.Root {
    user-select: none;
  }
`;

export const cellSelectingClassname = `rdg-cell-selecting ${cellSelecting}`;
