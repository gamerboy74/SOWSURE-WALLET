// useProductDetails.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const TABLES = {
  PRODUCTS: "products",
  FARMERS: "farmers",
  BUYERS: "buyers",
} as const;

interface ProductDetails {
  id: string;
  type: "sell" | "buy";
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  image_url: string | null;
  location: string;
  created_at: string;
  deadline?: string | null;
  moisture_content?: string | null;
  protein_level?: string | null;
  origin?: string | null;
  harvest_year?: string | null;
  certification?: string | null;
  shipping_terms?: string | null;
  required_docs?: string[] | null;
  farmer?: {
    id: string;
    name: string;
    profile_photo_url: string | null;
    complete_address: string;
    land_type: string;
    land_size: number;
    phone: string;
    email: string;
    wallet_address: string;
    user_id?: string;
  } | null;
  buyer?: {
    id: string;
    company_name: string;
    profile_photo_url: string | null;
    business_address: string;
    business_type: string;
    storage_capacity: number;
    user_id?: string;
  } | null;
}

export const useProductDetails = (productId: string) => {
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnListing, setIsOwnListing] = useState(false);
  const [isFarmer, setIsFarmer] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw new Error("Authentication failed");
      if (!user) throw new Error("No authenticated user found");

      setCurrentUserId(user.id);

      // Fetch farmer, buyer, and product data in parallel
      const [farmerRes, buyerRes, productRes] = await Promise.all([
        supabase.from(TABLES.FARMERS).select("id").eq("user_id", user.id).single(),
        supabase.from(TABLES.BUYERS).select("id").eq("user_id", user.id).single(),
        supabase
          .from(TABLES.PRODUCTS)
          .select("*, farmer:farmer_id (*), buyer:buyer_id (*)")
          .eq("id", productId)
          .single(),
      ]);

      // Set role flags
      setIsFarmer(!!farmerRes.data && !farmerRes.error);
      setIsBuyer(!!buyerRes.data && !buyerRes.error);

      // Handle product fetch errors
      if (productRes.error) throw productRes.error;
      if (!productRes.data) throw new Error("Product not found");

      // Set product data
      setProduct(productRes.data);

      // Determine if the current user owns this listing
      setIsOwnListing(
        (productRes.data.type === "sell" && productRes.data.farmer?.user_id === user.id) ||
        (productRes.data.type === "buy" && productRes.data.buyer?.user_id === user.id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Fetch data when the component mounts or productId changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    product,
    loading,
    error,
    currentUserId,
    isOwnListing,
    isFarmer,
    isBuyer,
    refetch: fetchData, // Expose refetch function to manually trigger data fetch
  };
};