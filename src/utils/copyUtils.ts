import type { SelectedCells } from '../types';

export interface GetSelectedCellsTextOptions {
  /**
   * Add the column names as the first line of each range
   * @default false
   */
  includeHeader?: boolean;
}

function getCellText(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

// quote the values that contain a tab, a line break, or a quote, like spreadsheets do,
// so they paste into a single cell
function serializeCellText(text: string): string {
  return /[\t\n\r"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Returns the selected cells as tab-separated text, the format that spreadsheets paste into separate cells.
 * The values come from the rows, `row[column.key]`, not from the rendered cells,
 * so it includes the rows that virtualization didn't render.
 * Ranges added with Ctrl/Cmd are separated by an empty line.
 * The grid copies the selection with this text on Ctrl/Cmd + C, use it for a copy item in a context menu for example.
 */
export function getSelectedCellsText<R>(
  selectedCells: readonly SelectedCells<R>[],
  { includeHeader = false }: GetSelectedCellsTextOptions = {}
): string {
  return selectedCells
    .map(({ columns, rows }) => {
      const lines: string[] = [];
      if (includeHeader) {
        lines.push(
          columns
            .map((column) =>
              serializeCellText(typeof column.name === 'string' ? column.name : column.key)
            )
            .join('\t')
        );
      }
      for (const row of rows) {
        lines.push(
          columns
            .map((column) =>
              serializeCellText(getCellText((row as Record<string, unknown>)[column.key]))
            )
            .join('\t')
        );
      }
      return lines.join('\n');
    })
    .join('\n\n');
}
