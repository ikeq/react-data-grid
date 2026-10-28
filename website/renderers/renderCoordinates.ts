import type { RenderCellContentProps } from '../../src';

export function renderCoordinates(props: RenderCellContentProps<number>) {
  return `${props.column.key}×${props.row}`;
}
