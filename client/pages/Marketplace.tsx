import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import ListingCard from "../components/marketplace/ListingCard";
import MarketplaceHeader from "../components/marketplace/MarketplaceHeader";
import { getStorageUrl } from "../lib/storage-helpers";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";

interface MarketplaceProduct {
  id: string;
  type: "sell" | "buy";
  title: string;
  quantity: string;
  price: string;
  location: string;
  image_url: string | null;
  user: {
    name: string;
    type: string;
    rating: number;
    profileImage: string | null;
  };
  postedDate: string;
  description: string;
}

function Marketplace() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isFetchingRef = useRef(false);
  const limit = 10;

  const loadMarketplaceProducts = useCallback(
    async (isFirstLoad = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            `
            *,
            farmers:farmer_id!left (
              id,
              name,
              profile_photo_url
            ),
            buyers:buyer_id!left (
              id,
              company_name,
              profile_photo_url
            )
          `
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;

        if (!data || data.length === 0) {
          setProducts([]);
          setHasMore(false);
          return;
        }

        const formattedProducts = data.filter(Boolean).map((product) => ({
          id: product.id,
          type: product.type,
          title: product.name,
          quantity: `${product.quantity} ${product.unit}`,
          price: `₹${product.price}/${product.unit}`,
          location: product.location,
          image_url: product.image_url,
          user: {
            name:
              product.type === "sell"
                ? product.farmers?.name ?? "Unknown Farmer"
                : product.buyers?.company_name ?? "Unknown Buyer",
            type: product.type === "sell" ? "Farmer" : "Buyer",
            rating: 4.5,
            profileImage:
              product.type === "sell"
                ? product.farmers?.profile_photo_url ?? null
                : product.buyers?.profile_photo_url ?? null,
          },
          postedDate: product.created_at,
          description: product.description || "",
        }));

        setProducts(
          isFirstLoad ? formattedProducts : [...products, ...formattedProducts]
        );
        setHasMore(data.length === limit);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load marketplace");
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [page, products]
  );

  useEffect(() => {
    const channel = supabase.channel("marketplace_changes");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          // Reset and reload on any change
          setPage(1);
          loadMarketplaceProducts(true);
        }
      )
      .subscribe();

    // Initial load
    loadMarketplaceProducts(true);

    return () => {
      channel.unsubscribe();
    };
  }, [loadMarketplaceProducts]);

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      loadMarketplaceProducts();
    }
  }, [page, loadMarketplaceProducts]);

  const handleNewListing = () => {
    // Navigate to create listing page
    console.log("Create new listing");
  };

  const loadMore = () => {
    if (!isFetchingRef.current && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  if (loading && page === 1) {
    return <LoadingSpinner text="Loading marketplace..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MarketplaceHeader onNewListing={handleNewListing} page={page} />

        {error && (
          <div
            className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center 
                        shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <span>{error}</span>
          </div>
        )}

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 
                      transition-all duration-300"
        >
          {products.map((product) => (
            <ListingCard key={product.id} {...product} />
          ))}
        </div>

        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={isFetchingRef.current}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg 
                       hover:bg-emerald-500 active:bg-emerald-700 
                       transition-all duration-200 transform 
                       hover:scale-[1.02] active:scale-[0.98] 
                       shadow-sm hover:shadow-md font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed
                       disabled:transform-none disabled:hover:shadow-sm"
            >
              {isFetchingRef.current ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner fullScreen={false} text="Loading..." />
                </span>
              ) : (
                "Load More"
              )}
            </button>
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Marketplace;
