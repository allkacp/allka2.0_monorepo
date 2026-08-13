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
