declare global {
  interface ImportMeta {
    readonly env: {
      readonly CI: boolean;
    };
  }
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    resizeColumn: (
      name: string,
      resizeBy: number | readonly number[],
      resizeHandleSelector: string
    ) => Promise<void>;
  }
}

// required to make types work
export {};
