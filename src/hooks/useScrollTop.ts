import { useCallback, useSyncExternalStore } from 'react';

// only the vertical scroll position is tracked: columns are not virtualized,
// so scrolling horizontally doesn't render the grid again
const initialScrollTop = 0;

function getServerSnapshot() {
  return initialScrollTop;
}

const scrollTopMap = new WeakMap<React.RefObject<HTMLDivElement | null>, number>();

export function useScrollTop(gridRef: React.RefObject<HTMLDivElement | null>): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (gridRef.current === null) return () => {};

      const el = gridRef.current;

      // prime the scroll state map with the initial value
      setScrollTop();

      function setScrollTop() {
        const { scrollTop } = el;
        const prev = scrollTopMap.get(gridRef) ?? initialScrollTop;
        if (prev === scrollTop) {
          return false;
        }

        scrollTopMap.set(gridRef, scrollTop);
        return true;
      }

      function onScroll() {
        if (setScrollTop()) {
          onStoreChange();
        }
      }

      el.addEventListener('scroll', onScroll);

      return () => el.removeEventListener('scroll', onScroll);
    },
    [gridRef]
  );

  const getSnapshot = useCallback((): number => {
    // gridRef.current is null during the initial render, when suspending, or in <Activity mode="hidden">.
    // To avoid returning a different state in those cases,
    // we key the ref object instead of the element itself.
    return scrollTopMap.get(gridRef) ?? initialScrollTop;
  }, [gridRef]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
