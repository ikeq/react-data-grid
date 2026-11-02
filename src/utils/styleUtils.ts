import type { CalculatedColumn, Maybe } from '../types';
import { cellClassname, cellFrozenStartClassname, cellFrozenEndClassname } from '../style/cell';

/** The max width of a column, `undefined` when it has none, or when it is less than the min width */
export function getColumnMaxWidth({
  minWidth,
  maxWidth
}: Pick<CalculatedColumn<unknown>, 'minWidth' | 'maxWidth'>) {
  return typeof maxWidth === 'number' && maxWidth >= minWidth ? maxWidth : undefined;
}

/**
 * The grid track of a column with a string width.
 * The cells are capped to the max width, so content-sized tracks like `max-content` stay within it,
 * but `auto` and `fr` tracks also grow to fill the grid, so they are capped too.
 */
export function getColumnTrack<R>(width: string, column: CalculatedColumn<R>): string {
  const maxWidth = getColumnMaxWidth(column);
  if (maxWidth !== undefined && (width === 'auto' || /\dfr\b/.test(width))) {
    return `minmax(auto, ${maxWidth}px)`;
  }
  return width;
}

export function getCellStyle<R>(column: CalculatedColumn<R>): React.CSSProperties {
  const { idx, frozen } = column;
  return {
    gridColumnStart: idx + 1,
    insetInlineStart: frozen === 'start' ? `var(--rdg-frozen-start-${idx})` : undefined,
    insetInlineEnd: frozen === 'end' ? `var(--rdg-frozen-end-${idx})` : undefined,
    // CSS grid sizes the columns with string widths from their cells,
    // so the cells are capped for `max-content` to stay within the max width
    maxWidth: getColumnMaxWidth(column)
  };
}

type ClassValue = Maybe<string | false>;

export function classnames(...args: readonly ClassValue[]) {
  let classname = '';

  for (const arg of args) {
    if (typeof arg === 'string') {
      classname += ` ${arg}`;
    }
  }

  return classname.slice(1);
}

export function getCellClassname<R>(
  column: CalculatedColumn<R>,
  ...extraClasses: readonly ClassValue[]
): string {
  return classnames(
    cellClassname,
    column.frozen === 'start' && cellFrozenStartClassname,
    column.frozen === 'end' && cellFrozenEndClassname,
    ...extraClasses
  );
}
