import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import ProductCard from "../../../client/pages/ProductCard";

interface Product {
  id: string;
  farmer_id: string | null;
  buyer_id: string | null;
  type: "sell" | "buy";
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  image_url: string | null;
  status: string;
  location: string;
  created_at: string;
  featured: boolean;
}

const CACHE_KEY = "featuredProducts";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Skeleton Loader Component
const SkeletonProductCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
    <div className="h-48 bg-gray-300 rounded mb-4" />
    <div className="h-6 bg-gray-300 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-300 rounded w-full mb-2" />
    <div className="h-4 bg-gray-300 rounded w-1/2 mb-4" />
    <div className="flex gap-2">
      <div className="h-10 w-20 bg-gray-300 rounded" />
      <div className="h-10 w-20 bg-gray-300 rounded" />
    </div>
  </div>
);

const FeaturedListingsManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Cache utility functions
  const getCachedData = useCallback(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data as Product[];
  }, []);

  const setCachedData = useCallback((data: Product[]) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  }, []);

  // Fetch products with caching
  const fetchProducts = useCallback(async () => {
    try {
      const cachedData = getCachedData();
      if (cachedData) {
        setProducts(cachedData);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      setProducts(data || []);
      if (data?.length) setCachedData(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [getCachedData, setCachedData]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = useCallback(
    async (product: Product) => {
      try {
        const { error } = await supabase
          .from("products")
          .update({ featured: !product.featured })
          .eq("id", product.id);

        if (error) throw error;
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, featured: !p.featured } : p))
        );
      } catch (error) {
        console.error("Error updating featured status:", error);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (productId: string) => {
      setDeleting(productId);
      try {
        const { error } = await supabase.from("products").delete().eq("id", productId);
        if (error) throw error;
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } catch (error) {
        console.error("Error deleting product:", error);
      } finally {
        setDeleting(null);
      }
    },
    []
  );

  const handleImageError = useCallback(() => {
    // Optionally update the product to remove invalid image_url
  }, []);

  if (loading) {
    return (
      <div className="max-w h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Manage Featured Listings</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-10">Manage Featured Listings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={handleEdit}
            onDelete={() => handleDelete(product.id)}
            deleting={deleting}
            handleImageError={handleImageError}
            isAdmin={true}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedListingsManagement;