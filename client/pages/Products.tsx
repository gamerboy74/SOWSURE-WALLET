import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  unit: string; // Add missing unit property
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
  farmers?: {
    name: string;
    profile_photo_url: string | null;
  };
  buyers?: {
    company_name: string;
    profile_photo_url: string | null;
  };
}

function Marketplace() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isFetchingRef = useRef(false);
  const limit = 10;

  // Memoize formatted products
  const formattedProducts = useMemo(() => {
    return products.map((product) => ({
      ...product,
      formattedPrice: `₹${product.price}/${product.unit || "unit"}`,
      formattedQuantity: `${product.quantity} ${product.unit || "unit"}`,
      userName:
        product.type === "sell"
          ? product.farmers?.name ?? "Unknown Farmer"
          : product.buyers?.company_name ?? "Unknown Buyer",
    }));
  }, [products]);

  // Memoize filter conditions
  const hasNoProducts = useMemo(
    () => !loading && products.length === 0,
    [loading, products.length]
  );

  // Optimize loading by loading small batch first
  const loadMarketplaceProducts = useCallback(
    async (isFirstLoad = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const initialLimit = isFirstLoad ? 6 : limit; // Load fewer items initially for faster first paint
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
          .range((page - 1) * initialLimit, page * initialLimit - 1);

        if (error) throw error;

        if (!data || data.length === 0) {
          setProducts([]);
          setHasMore(false);
          return;
        }

        const formattedProducts: MarketplaceProduct[] = data
          .filter(Boolean)
          .map((product) => ({
            id: product.id,
            type: product.type,
            title: product.name,
            quantity: `${product.quantity} ${product.unit}`,
            price: `₹${product.price}/${product.unit}`,
            unit: product.unit, // Add unit property
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
            farmers: product.farmers
              ? {
                  name: product.farmers.name,
                  profile_photo_url: product.farmers.profile_photo_url,
                }
              : undefined,
            buyers: product.buyers
              ? {
                  company_name: product.buyers.company_name,
                  profile_photo_url: product.buyers.profile_photo_url,
                }
              : undefined,
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

  // Remove initial loading spinner to avoid flash
  if (loading && !products.length) {
    return null; // Return null instead of spinner for initial load
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MarketplaceHeader onNewListing={handleNewListing} page={page} />

        {error && (
          <div className="mb-6 bg-red-50/80 backdrop-blur-sm text-red-600 p-4 rounded-xl flex items-center shadow-lg transition-all duration-300 hover:shadow-xl border border-red-100">
            <span className="animate-fade-in">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
          {formattedProducts.map((product, index) => (
            <div
              key={product.id}
              className="transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              style={{
                animationDelay: `${index * 100}ms`,
                opacity: 0,
                animation: "fadeIn 0.5s ease-out forwards",
              }}
            >
              <ListingCard {...product} />
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-12 text-center">
            <button
              onClick={loadMore}
              disabled={isFetchingRef.current}
              className="group px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 
                active:bg-emerald-700 transition-all duration-300 transform hover:scale-[1.02] 
                active:scale-[0.98] shadow-md hover:shadow-xl font-medium disabled:opacity-50 
                disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-md 
                relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isFetchingRef.current ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </button>
          </div>
        )}

        {hasNoProducts && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg font-medium animate-fade-in">
              No products found
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Marketplace;
