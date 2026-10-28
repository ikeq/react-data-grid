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
    padding-inline: 8px;
    align-content: center;
    background-color: inherit;

    white-space: nowrap;
    overflow: clip;
    text-overflow: ellipsis;
    outline: none;

    /*
     * The active cell box is only drawn when the cell isn't in the cell selection, for example in summary rows:
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

// a line between the frozen columns and the scrolling columns, like the line between the header and the data area
const cellFrozenEdge = css`
  @layer rdg.Cell {
    &.rdg-cell-frozen-start:nth-last-child(1 of .rdg-cell-frozen-start):not(
        .rdg-row-header-corner-cell
      ) {
      border-inline-end: var(--rdg-border-width) solid var(--rdg-border-color);
    }

    &.rdg-cell-frozen-end:nth-child(1 of .rdg-cell-frozen-end) {
      border-inline-start: var(--rdg-border-width) solid var(--rdg-border-color);
    }
  }
`;

// the top-left cell, the header cell of `RowHeaderColumn`, has no lines, like the corner of a spreadsheet
export const rowHeaderCornerCellClassname = 'rdg-row-header-corner-cell';

// The header line starts after the top-left cell, and the frozen column line starts below it,
// so the pixel where they meet is drawn in the cell's end bottom corner, to join them
const rowHeaderCornerCell = css`
  @layer rdg.Cell {
    &::after {
      content: '';
      position: absolute;
      inset-block-end: 0;
      inset-inline-end: 0;
      inline-size: var(--rdg-border-width);
      block-size: var(--rdg-border-width);
      background-color: var(--rdg-border-color);
      pointer-events: none;
    }
  }
`;

export const rowHeaderCornerCellClassnames = `${rowHeaderCornerCellClassname} ${rowHeaderCornerCell}`;

export const cellFrozenStartClassname = `rdg-cell-frozen-start ${cellFrozenBase} ${cellFrozenEdge}`;
export const cellFrozenEndClassname = `rdg-cell-frozen-end ${cellFrozenBase} ${cellFrozenEdge}`;

const cellDragHandle = css`
  @layer rdg.DragHandle {
    --rdg-drag-handle-size: 8px;
    z-index: 0;
    cursor: move;
    inline-size: var(--rdg-drag-handle-size);
    block-size: var(--rdg-drag-handle-size);
    background-color: var(--rdg-selection-color);
    place-self: end;

    &:hover {
      --rdg-drag-handle-size: 16px;
      border: 2px solid var(--rdg-selection-color);
      background-color: var(--rdg-background-color);
    }

    /* keep the handle visible on both Canvas and SelectedItem backgrounds */
    @media (forced-colors: active) {
      outline: 1px solid Canvas;
    }
  }
`;

export const cellDragHandleFrozenClassname = css`
  @layer rdg.DragHandle {
    z-index: 1;
    position: sticky;
  }
`;

export const cellDragHandleClassname = `rdg-cell-drag-handle ${cellDragHandle}`;

const cellRangeSelected = css`
  @layer rdg.Cell {
    background-color: var(--rdg-cell-selection-background-color);

    @media (forced-colors: active) {
      background-color: Highlight;
      color: HighlightText;
    }
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
    color: var(--rdg-row-header-color);
    text-align: end;
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

    @media (forced-colors: active) {
      background-color: Highlight;
      color: HighlightText;
    }
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
