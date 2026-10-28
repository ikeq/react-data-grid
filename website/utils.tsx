import type { SelectedCells } from '../src';

const { language } = navigator;

export const { compare } = new Intl.Collator(language, { numeric: true });
export const formatDate = new Intl.DateTimeFormat(language).format;
export const formatCurrency = new Intl.NumberFormat(language, {
  style: 'currency',
  currency: 'eur'
}).format;

export function showModalRef(dialog: HTMLDialogElement | null) {
  dialog?.showModal();
}

export function exportToCsv(gridEl: HTMLDivElement, fileName: string) {
  // TODO: remove both toArray calls https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/join
  const content = getGridContent(gridEl)
    .map((row) => row.cells.map(serializeCellValue).toArray().join(','))
    .toArray()
    .join('\n');

  downloadFile(fileName, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}

export async function exportToPdf(gridEl: HTMLDivElement, fileName: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const doc = new jsPDF({
    orientation: 'l',
    unit: 'px'
  });

  const head: string[][] = [];
  const body: string[][] = [];
  const foot: string[][] = [];

  for (const row of getGridContent(gridEl)) {
    const cells = row.cells.toArray();
    if (row.type === 'body') {
      body.push(cells);
    } else if (row.type === 'head') {
      head.push(cells);
    } else {
      foot.push(cells);
    }
  }

  autoTable(doc, {
    head,
    body,
    foot,
    horizontalPageBreak: true,
    styles: { cellPadding: 1.5, fontSize: 8, cellWidth: 'wrap' },
    tableWidth: 'wrap'
  });
  doc.save(fileName);
}

function getGridContent(gridEl: HTMLDivElement) {
  return Iterator.from(gridEl.children)
    .filter((child) => child.matches('[role="row"]:not(.rdg-top-summary-row)'))
    .map((row) => {
      const cells = Iterator.from(row.children).map((cell) => cell.textContent);

      if (row.classList.contains('rdg-header-row')) {
        return { type: 'head', cells } as const;
      }

      if (row.classList.contains('rdg-bottom-summary-row')) {
        return { type: 'foot', cells } as const;
      }

      return { type: 'body', cells } as const;
    });
}

function serializeCellValue(value: string) {
  const formattedValue = value.replaceAll('"', '""');
  return formattedValue.includes(',') ? `"${formattedValue}"` : formattedValue;
}

/**
 * Returns the header and the values of each selected range,
 * from the rows instead of the DOM, so it includes the rows that virtualization didn't render
 */
export function getSelectedCellsTables<R, SR>(selectedCells: readonly SelectedCells<R, SR>[]) {
  return selectedCells.map(({ columns, rows }) => [
    columns.map((column) => (typeof column.name === 'string' ? column.name : column.key)),
    ...rows.map((row) =>
      columns.map((column) => String((row as Record<string, unknown>)[column.key] ?? ''))
    )
  ]);
}

export function exportSelectedCellsToCsv<R, SR>(
  selectedCells: readonly SelectedCells<R, SR>[],
  fileName: string
) {
  // ranges added with Ctrl/Cmd are separated by an empty line
  const content = getSelectedCellsTables(selectedCells)
    .map((table) => table.map((cells) => cells.map(serializeCellValue).join(',')).join('\n'))
    .join('\n\n');

  downloadFile(fileName, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}

// tab-separated values paste into separate cells in spreadsheets
export function copySelectedCellsToClipboard<R, SR>(
  selectedCells: readonly SelectedCells<R, SR>[],
  withHeader: boolean
) {
  const content = getSelectedCellsTables(selectedCells)
    .map((table) =>
      (withHeader ? table : table.slice(1))
        .map((cells) => cells.map((cell) => cell.replaceAll(/[\t\n]/g, ' ')).join('\t'))
        .join('\n')
    )
    .join('\n\n');

  return navigator.clipboard.writeText(content);
}

function downloadFile(fileName: string, data: Blob) {
  const downloadLink = document.createElement('a');
  downloadLink.download = fileName;
  const url = URL.createObjectURL(data);
  downloadLink.href = url;
  downloadLink.click();
  URL.revokeObjectURL(url);
}
