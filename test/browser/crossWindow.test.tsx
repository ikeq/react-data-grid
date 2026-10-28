import { createPortal } from 'react-dom';
import { page, userEvent } from 'vite-plus/test/browser';

import { DataGrid, type Column } from '../../src';

// The grid can be portaled into another window, like an iframe or a popup window.
// Its DOM nodes then belong to that other window, while its JS still runs in this window.
// https://github.com/Comcast/react-data-grid/issues/4184

interface Row {
  a: string;
  b: string;
}

const columns: readonly Column<unknown>[] = Array.from({ length: 20 }, (_, i) => ({
  key: String(i),
  name: String(i),
  width: 100
}));

const noRows: readonly unknown[] = [];

const rows: readonly Row[] = [
  { a: 'a1', b: 'b1' },
  { a: 'a2', b: 'b2' }
];

const rowColumns: readonly Column<Row>[] = [
  { key: 'a', name: 'A' },
  { key: 'b', name: 'B' }
];

async function createIframe() {
  const iframe = document.createElement('iframe');
  iframe.style.width = '400px';
  iframe.srcdoc = '<!doctype html><body style="margin: 0"></body>';

  await new Promise((resolve) => {
    iframe.addEventListener('load', resolve, { once: true });
    document.body.append(iframe);
  });

  onTestFinished(() => {
    iframe.remove();
  });

  const iframeDocument = iframe.contentDocument!;

  // copy the grid styles into the iframe
  for (const style of document.head.querySelectorAll('style')) {
    iframeDocument.head.append(style.cloneNode(true));
  }

  return {
    iframe,
    iframeDocument,
    iframeWindow: iframeDocument.defaultView!,
    frame: page.frameLocator(page.elementLocator(iframe))
  };
}

test('should observe grid resizes with the ResizeObserver of the window the grid is rendered in', async () => {
  const { iframe, iframeDocument, iframeWindow, frame } = await createIframe();
  const observeSpy = vi.spyOn(iframeWindow.ResizeObserver.prototype, 'observe');

  await page.render(
    createPortal(<DataGrid columns={columns} rows={noRows} />, iframeDocument.body)
  );

  const grid = frame.getGrid();
  await expect.element(grid).toBeInTheDocument();
  expect(observeSpy).toHaveBeenCalledWith(grid.element());

  const headerCells = grid.getHeaderCell();

  await expect.element(headerCells).toHaveLength(5);

  iframe.style.width = '800px';

  await expect.element(headerCells).toHaveLength(9);
});

test('should navigate between cells with the keyboard', async () => {
  const { iframeDocument, frame } = await createIframe();
  await page.render(
    createPortal(<DataGrid columns={rowColumns} rows={rows} />, iframeDocument.body)
  );

  await userEvent.click(frame.getCell({ name: 'a1' }));
  await expect.element(frame.getActiveCell()).toHaveTextContent('a1');
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(frame.getActiveCell()).toHaveTextContent('b1');
});
