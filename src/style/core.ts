import { css } from 'ecij';

import { cell } from './cell';
import { bottomSummaryRowClassname, row, topSummaryRowClassname } from './row';

const root = css`
  @layer rdg.Defaults {
    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }
  }

  @layer rdg.Root {
    --rdg-selection-width: 1px;
    --rdg-selection-color: hsl(207, 75%, 66%);
    --rdg-font-size: 14px;
    --rdg-border-width: 1px;
    --rdg-summary-border-width: calc(var(--rdg-border-width) * 2);
    --rdg-color: light-dark(#000, #ddd);
    --rdg-border-color: light-dark(#ddd, #444);
    --rdg-summary-border-color: light-dark(#aaa, #555);
    --rdg-background-color: light-dark(hsl(0deg 0% 100%), hsl(0deg 0% 13%));
    /* same as the data area, but opaque, as the header is sticky and the rows scroll under it */
    --rdg-header-background-color: var(--rdg-background-color);
    --rdg-header-draggable-background-color: light-dark(hsl(0deg 0% 90.5%), hsl(0deg 0% 17.5%));
    --rdg-row-hover-background-color: light-dark(hsl(0deg 0% 96%), hsl(0deg 0% 9%));
    /* the background of every other row, starting with the first row */
    --rdg-row-stripe-background-color: light-dark(hsl(0deg 0% 97.5%), hsl(0deg 0% 15%));
    --rdg-row-selected-background-color: light-dark(hsl(207deg 76% 92%), hsl(207deg 76% 42%));
    --rdg-row-selected-hover-background-color: light-dark(hsl(207deg 76% 88%), hsl(207deg 76% 38%));
    --rdg-checkbox-focus-color: hsl(207deg 100% 69%);
    --rdg-cell-selection-background-color: light-dark(hsl(207deg 76% 92%), hsl(207deg 50% 26%));
    --rdg-cell-selection-border-color: var(--rdg-selection-color);
    --rdg-cell-selection-border-width: var(--rdg-selection-width);
    --rdg-header-selection-background-color: light-dark(hsl(207deg 45% 85%), hsl(207deg 35% 24%));
    --rdg-header-selection-color: inherit;
    --rdg-row-header-color: light-dark(#666, #999);

    /* forced colors mode replaces non-system colors, which would hide the drag handle */
    @media (forced-colors: active) {
      --rdg-selection-color: CanvasText;
      --rdg-checkbox-focus-color: CanvasText;
    }

    &.rdg-dark {
      color-scheme: dark;
    }

    &.rdg-light {
      color-scheme: light;
    }

    display: grid;

    accent-color: light-dark(hsl(207deg 100% 29%), hsl(207deg 100% 79%));

    /* https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context */
    /* We set a stacking context so internal elements don't render on top of external elements. */
    /* size containment is not used as it could break "width: min-content" for example, and the grid would infinitely resize on Chromium browsers */
    contain: content;
    content-visibility: auto;
    block-size: 350px;
    box-sizing: border-box;
    overflow: auto;
    background-color: var(--rdg-background-color);
    color: var(--rdg-color);
    font-size: var(--rdg-font-size);
    font-variant-numeric: tabular-nums;

    container-name: rdg-root;
    container-type: scroll-state;

    /* needed on Firefox to fix scrollbars */
    &::before {
      content: '';
      grid-area: -2 / -2 / -1 / -1;
    }

    > :nth-last-child(1 of .${topSummaryRowClassname}) {
      > .${cell} {
        border-block-end: var(--rdg-summary-border-width) solid var(--rdg-summary-border-color);
      }
    }

    > :nth-child(1 of .${bottomSummaryRowClassname}) {
      > .${cell} {
        border-block-start: var(--rdg-summary-border-width) solid var(--rdg-summary-border-color);
      }
    }
  }
`;

export const rootClassname = `rdg ${root}`;

const viewportDragging = css`
  @layer rdg.Root {
    user-select: none;

    & .${row} {
      cursor: move;
    }
  }
`;

export const viewportDraggingClassname = `rdg-viewport-dragging ${viewportDragging}`;
