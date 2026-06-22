// @ts-nocheck
import { ProductCatalogView } from "@/components/product-catalog-view";

export default function LiderCatalogoPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-xl font-bold text-foreground">Catálogo de Produtos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Explore os produtos disponíveis na plataforma. Para contratar, entre em contato com a equipe comercial.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ProductCatalogView mode="page" readOnly contractableOnly={false} />
      </div>
    </div>
  );
}
