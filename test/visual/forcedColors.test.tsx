import { commands, page, server, userEvent } from 'vite-plus/test/browser';

import { DataGrid, RowHeaderColumn, type Column } from '../../src';
import { safeTab } from '../browser/utils';

const grid = page.getGrid();

interface Row {
  id: number;
  name: string;
}

const columns: readonly Column<Row>[] = [
  RowHeaderColumn,
  {
    key: 'name',
    name: 'Name'
  }
];

const rows: readonly Row[] = [
  { id: 1, name: 'Row 1' },
  { id: 2, name: 'Row 2' },
  { id: 3, name: 'Row 3' }
];

function rowKeyGetter(row: Row) {
  return row.id;
}

// Windows contrast themes are light or dark, so test both palettes
const palettes = [
  { colorScheme: 'light', prefix: 'forced-colors' },
  { colorScheme: 'dark', prefix: 'forced-colors-dark' }
] as const;

describe.each(palettes)('$colorScheme palette', ({ colorScheme, prefix }) => {
  beforeEach(async ({ skip, onTestFinished }) => {
    // WebKit matches `(forced-colors: active)` when emulated, but does not force any colors,
    // and Firefox ignores the emulated color scheme in forced colors mode
    skip(server.browser === 'webkit' || (server.browser === 'firefox' && colorScheme === 'dark'));

    await commands.emulateMedia({ forcedColors: 'active', colorScheme });
    onTestFinished(async () => {
      // restore the context defaults, as `null` would make the page follow the OS instead
      await commands.emulateMedia({ forcedColors: 'none', colorScheme: 'light' });
    });

    await page.render(
      <DataGrid
        aria-label="Forced colors"
        rowKeyGetter={rowKeyGetter}
        columns={columns}
        rows={rows}
        style={{ blockSize: 160, inlineSize: 400 }}
      />
    );

    // focus the top-left header cell with the keyboard, so `:focus-visible` matches
    await safeTab();
  });

  it('active header cell', async () => {
    await expect.element(grid).toMatchScreenshot(`${prefix}-active-header-cell`);
  });

  it('selected cell', async () => {
    await userEvent.keyboard('{ArrowDown}{ArrowRight}');
    await expect.element(grid).toMatchScreenshot(`${prefix}-selected-cell`);
  });

  it('selected range', async () => {
    await userEvent.keyboard('{ArrowDown}{ArrowRight}{Shift>}{ArrowDown}{/Shift}');
    await expect.element(grid).toMatchScreenshot(`${prefix}-selected-range`);
  });
});
