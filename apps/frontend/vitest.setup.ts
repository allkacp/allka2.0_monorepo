import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver — several layout hooks (useAppFrameMetrics)
// use it just to react to header/footer size changes, which don't matter
// in a test environment that never actually paints/resizes anything.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

// Node 25's built-in global `localStorage` (Web Storage API, file-backed)
// can shadow jsdom's own implementation and end up in a degraded state in
// this environment (missing .clear(), per a `--localstorage-file` warning
// with no valid path) — replace it with a plain in-memory Storage so tests
// that touch localStorage (e.g. the "allka_user" session key) are reliable
// and fully isolated between tests, never touching a real file.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}
Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});

// jsdom has no matchMedia — this is a minimal but real implementation
// (parses "(min-width: Npx)"/"(max-width: Npx)" against the current
// window.innerWidth, supports the addEventListener/removeEventListener
// listener API), not just a stub returning matches:false, so tests that
// actually depend on breakpoint behavior (e.g. sidebar-visibility-aware
// hooks) can resize the jsdom window and see real change events.
type MediaQueryListenerEntry = { mql: MediaQueryList; listener: () => void };
const mediaQueryListeners: MediaQueryListenerEntry[] = [];

function evaluateMediaQuery(query: string): boolean {
  const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
  const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
  let result = true;
  if (minWidthMatch) result = result && window.innerWidth >= Number(minWidthMatch[1]);
  if (maxWidthMatch) result = result && window.innerWidth <= Number(maxWidthMatch[1]);
  return result;
}

function createMatchMedia(query: string): MediaQueryList {
  const mql = {
    media: query,
    get matches() {
      return evaluateMediaQuery(query);
    },
    onchange: null,
    addEventListener: (_event: string, listener: () => void) => {
      mediaQueryListeners.push({ mql: mql as unknown as MediaQueryList, listener });
    },
    removeEventListener: (_event: string, listener: () => void) => {
      const index = mediaQueryListeners.findIndex((entry) => entry.listener === listener);
      if (index >= 0) mediaQueryListeners.splice(index, 1);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  return mql;
}

window.matchMedia = ((query: string) => createMatchMedia(query)) as typeof window.matchMedia;

// jsdom doesn't implement the Pointer Events capture API or scrollIntoView,
// which Radix UI's Select (and other popover-based primitives) call when
// opening/closing via pointer interaction — without these no-op stand-ins,
// userEvent.click() on a Select trigger throws
// "target.hasPointerCapture is not a function".
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = () => {};
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
// jsdom also has no scrollTo on Element — AlertDetailDrawer (ata 2026-08,
// 9º lote) calls it to reset a scrollable panel to the top on open.
if (!window.Element.prototype.scrollTo) {
  window.Element.prototype.scrollTo = () => {};
}

/** Test helper: resize jsdom's window and fire matchMedia change listeners,
 * mirroring what a real browser does when crossing a breakpoint. */
export function setTestViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
  mediaQueryListeners.forEach(({ listener }) => listener());
}
