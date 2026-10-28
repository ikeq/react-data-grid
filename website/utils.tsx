import type { SelectedCells } from '../src';

const { language } = navigator;

export const { compare } = new Intl.Collator(language, { numeric: true });
export const formatDate = new Intl.DateTimeFormat(language).format;
export const formatCurrency = new Intl.NumberFormat(language, {
  style: 'currency',
  currency: 'eur'
}).format;

function serializeCellValue(value: string) {
  const formattedValue = value.replaceAll('"', '""');
  return formattedValue.includes(',') ? `"${formattedValue}"` : formattedValue;
}

/**
 * Returns the header and the values of each selected range,
 * from the rows instead of the DOM, so it includes the rows that virtualization didn't render
 */
export function getSelectedCellsTables<R>(selectedCells: readonly SelectedCells<R>[]) {
  return selectedCells.map(({ columns, rows }) => [
    columns.map((column) => (typeof column.name === 'string' ? column.name : column.key)),
    ...rows.map((row) =>
      columns.map((column) => String((row as Record<string, unknown>)[column.key] ?? ''))
    )
  ]);
}

export function exportSelectedCellsToCsv<R>(
  selectedCells: readonly SelectedCells<R>[],
  fileName: string
) {
  // ranges added with Ctrl/Cmd are separated by an empty line
  const content = getSelectedCellsTables(selectedCells)
    .map((table) => table.map((cells) => cells.map(serializeCellValue).join(',')).join('\n'))
    .join('\n\n');

  downloadFile(fileName, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}

function downloadFile(fileName: string, data: Blob) {
  const downloadLink = document.createElement('a');
  downloadLink.download = fileName;
  const url = URL.createObjectURL(data);
  downloadLink.href = url;
  downloadLink.click();
  URL.revokeObjectURL(url);
}
