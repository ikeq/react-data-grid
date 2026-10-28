import type { CalculatedColumn, Maybe } from '../types';
import { cellClassname, cellFrozenStartClassname, cellFrozenEndClassname } from '../style/cell';

export function getCellStyle<R>(column: CalculatedColumn<R>): React.CSSProperties {
  const { idx, frozen } = column;
  return {
    gridColumnStart: idx + 1,
    insetInlineStart: frozen === 'start' ? `var(--rdg-frozen-start-${idx})` : undefined,
    insetInlineEnd: frozen === 'end' ? `var(--rdg-frozen-end-${idx})` : undefined
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
