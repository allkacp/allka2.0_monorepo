// @ts-nocheck
import { ProductCatalogView } from "@/components/product-catalog-view";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { Store } from "lucide-react";

export default function LiderCatalogoPage() {
  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="relative h-full min-h-0 flex flex-col">
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={Store}
        title="Catálogo de Produtos"
        description="Explore os produtos disponíveis na plataforma. Para contratar, entre em contato com a equipe comercial."
        actions={
          <PinToTrayButton id="page-leader-catalogo" label="Catálogo de Produtos" icon={Store} path="/leader/catalogo" />
        }
      />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ProductCatalogView mode="page" readOnly contractableOnly={false} />
      </div>
    </div>
    </div>
  );
}
