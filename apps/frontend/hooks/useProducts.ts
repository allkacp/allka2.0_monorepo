import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export function useProducts(filters?: Record<string, any>) {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.getProducts(filters);
      setProducts(response.data || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error("[useProducts] API error:", err.message);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(
    async (data: any) => {
      const result: any = await apiClient.createProduct(data);
      await fetchProducts();
      return result;
    },
    [fetchProducts],
  );

  const updateProduct = useCallback(
    async (id: string, data: any) => {
      const result: any = await apiClient.updateProduct(id, data);
      await fetchProducts();
      return result;
    },
    [fetchProducts],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await apiClient.deleteProduct(id);
      await fetchProducts();
    },
    [fetchProducts],
  );

  return {
    products,
    total,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
