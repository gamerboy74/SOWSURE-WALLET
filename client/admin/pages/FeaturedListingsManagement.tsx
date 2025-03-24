import React, { useEffect, useState } from "react";
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

const FeaturedListingsManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleEdit = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ featured: !product.featured })
        .eq("id", product.id);

      if (error) throw error;
      setProducts(products.map((p) => (p.id === product.id ? { ...p, featured: !p.featured } : p)));
    } catch (error) {
      console.error("Error updating featured status:", error);
    }
  };

  const handleDelete = async (productId: string) => {
    setDeleting(productId);
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      setProducts(products.filter((p) => p.id !== productId));
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleImageError = () => {
    // Optionally update the product to remove invalid image_url
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
          <span className="text-gray-900 text-lg">Loading products...</span>
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
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedListingsManagement;