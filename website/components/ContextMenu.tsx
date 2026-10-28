import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { css } from 'ecij';

const menuClassname = css`
  position: fixed;
  z-index: 10;
  margin: 0;
  padding: 4px;
  min-inline-size: 180px;
  list-style: none;
  border: 1px solid light-dark(#ccc, #555);
  border-radius: 6px;
  background-color: light-dark(#fff, #2b2b2b);
  box-shadow: 0 4px 16px rgb(0 0 0 / 20%);

  > li > button {
    display: block;
    inline-size: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background-color: light-dark(#e8f1fb, #1f4e79);
      outline: none;
    }
  }

  > li[role='separator'] {
    margin-block: 4px;
    border-block-start: 1px solid light-dark(#ddd, #444);
  }
`;

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
}

interface ContextMenuProps {
  top: number;
  left: number;
  /** `null` renders a separator */
  items: readonly (ContextMenuItem | null)[];
  onClose: () => void;
}

/** Closes on outside clicks, Escape, window blur, and after selecting an item. It is position: fixed, so it stays where it opened when the grid scrolls */
export function ContextMenu({ top, left, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLMenuElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current!;
    // keep the menu inside the viewport
    const { width, height } = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(left, globalThis.innerWidth - width - 4)}px`;
    menu.style.top = `${Math.min(top, globalThis.innerHeight - height - 4)}px`;
    menu.querySelector('button')?.focus();

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && menu.contains(event.target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    globalThis.addEventListener('pointerdown', onPointerDown, true);
    globalThis.addEventListener('keydown', onKeyDown);
    globalThis.addEventListener('blur', onClose);

    return () => {
      globalThis.removeEventListener('pointerdown', onPointerDown, true);
      globalThis.removeEventListener('keydown', onKeyDown);
      globalThis.removeEventListener('blur', onClose);
    };
  }, [top, left, onClose]);

  return createPortal(
    <menu ref={menuRef} className={menuClassname} style={{ top, left }}>
      {items.map((item, index) =>
        item === null ? (
          <li key={index} role="separator" />
        ) : (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => {
                onClose();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          </li>
        )
      )}
    </menu>,
    document.body
  );
}
