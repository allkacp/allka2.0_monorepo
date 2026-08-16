"use client";

import { ProductBundleManager } from "@/components/product-bundle-manager";

export default function AgencyCombosPage() {
  return <ProductBundleManager basePath="/agency/combos" isAdminView={false} />;
}
