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
    border-inline-end: var(--rdg-border-width) solid var(--rdg-border-color);
    border-block-end: var(--rdg-border-width) solid var(--rdg-border-color);
    align-content: center;
    background-color: inherit;

    white-space: nowrap;
    overflow: clip;
    text-overflow: ellipsis;
    outline: none;

    &[aria-selected='true'] {
      outline: var(--rdg-selection-width) solid var(--rdg-selection-color);
      outline-offset: calc(var(--rdg-selection-width) * -1);
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

export const cellFrozenStartClassname = `rdg-cell-frozen-start ${cellFrozenBase}`;
export const cellFrozenEndClassname = `rdg-cell-frozen-end ${cellFrozenBase}`;

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
