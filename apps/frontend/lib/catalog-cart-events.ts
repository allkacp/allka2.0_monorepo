export const CATALOG_CART_CHANGED = "allka:catalog2-cart-changed";
export function announceCatalogCartChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CATALOG_CART_CHANGED));
}
