import { css } from 'ecij';

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
    --rdg-selection-color: light-dark(#000, #fff);
    --rdg-font-size: 12px;
    --rdg-border-width: 1px;
    --rdg-color: inherit;
    --rdg-border-color: light-dark(#ddd, #444);
    --rdg-background-color: light-dark(hsl(0deg 0% 100%), hsl(0deg 0% 13%));
    /* same as the data area, but opaque, as the header is sticky and the rows scroll under it */
    --rdg-header-background-color: var(--rdg-background-color);
    --rdg-cell-hover-background-color: light-dark(hsl(0deg 0% 96%), hsl(0deg 0% 9%));
    /* the background of every other row, starting with the first row */
    --rdg-row-stripe-background-color: light-dark(hsl(0deg 0% 97.5%), hsl(0deg 0% 15%));
    --rdg-cell-selection-background-color: rgba(0, 0, 0, 0.05);
    --rdg-cell-selection-border-color: var(--rdg-selection-color);
    --rdg-cell-selection-border-width: var(--rdg-selection-width);
    --rdg-header-selection-background-color: var(--rdg-cell-hover-background-color);
    /* the text of the header cells and the row header cells */
    --rdg-header-color: light-dark(#000, #fff);
    --rdg-header-selection-color: var(--rdg-header-color);

    display: grid;

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

    /* needed on Firefox to fix scrollbars */
    &::before {
      content: '';
      grid-area: -2 / -2 / -1 / -1;
    }
  }
`;

export const rootClassname = `rdg ${root}`;
