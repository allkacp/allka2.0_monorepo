// @ts-nocheck
import { ProductCatalogView } from "@/components/product-catalog-view";
import { PageHeader } from "@/components/page-header";

export default function LiderCatalogoPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <PageHeader
          title="Catálogo de Produtos"
          description="Explore os produtos disponíveis na plataforma. Para contratar, entre em contato com a equipe comercial."
        />
      </div>
      <div className="flex-1 min-h-0">
        <ProductCatalogView mode="page" readOnly contractableOnly={false} />
      </div>
    </div>
  );
}
