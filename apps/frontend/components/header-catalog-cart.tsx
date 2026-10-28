import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "@/hooks/use-navigate";
import { apiClient } from "@/lib/api-client";
import { resolveCatalogIdentity } from "@/lib/catalog-access";
import { CATALOG_CART_CHANGED } from "@/lib/catalog-cart-events";
import type { AccountType } from "@/types/user";

/** Cesta global somente de quem pode contratar; o servidor continua sendo a fonte. */
export function HeaderCatalogCart({ accountType, legacyCount = 0, onOpenLegacy }: { accountType: AccountType; legacyCount?: number; onOpenLegacy?: () => void }) {
  const location = useLocation(), navigate = useNavigate();
  const identity = resolveCatalogIdentity(accountType);
  const canBuy = identity.kind === "agency" || identity.kind === "company";
  const key = [identity.userId, identity.kind, identity.scopeId].join(":");
  const [cart, setCart] = useState({ key: "", count: 0 });
  useEffect(() => {
    if (!canBuy) return;
    let active = true, requestId = 0;
    const load = async () => {
      const currentRequest = ++requestId;
      try {
        const result = await apiClient.getClientCatalog2Cart();
        if (active && currentRequest === requestId) setCart({ key, count: Math.max(0, Number(result.count) || 0) });
      } catch { if (active && currentRequest === requestId) setCart({ key, count: 0 }); }
    };
    void load();
    const listener = () => { void load(); };
    window.addEventListener(CATALOG_CART_CHANGED, listener);
    window.addEventListener("focus", listener);
    const timer = setInterval(listener, 45_000);
    return () => { active = false; clearInterval(timer); window.removeEventListener(CATALOG_CART_CHANGED, listener); window.removeEventListener("focus", listener); };
  }, [canBuy, key, location.pathname]);
  const serverCount = cart.key === key ? cart.count : 0;
  const count = serverCount || legacyCount;
  if (!canBuy || count <= 0) return null;
  return <button type="button" aria-label={`Cesta — ${count} ${count === 1 ? "item" : "itens"}`} title="Ver cesta"
    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
    onClick={() => {
      if (!serverCount && legacyCount && onOpenLegacy) { onOpenLegacy(); return; }
      navigate(`/${identity.kind === "agency" ? "agency" : "company"}/catalogo-produtos?cesta=1`);
    }}>
    <ShoppingCart className="h-4 w-4" />
    <span className="absolute -right-1 -top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">{count}</span>
  </button>;
}
