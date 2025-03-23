import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import ListingCard from "../components/marketplace/ListingCard";
import MarketplaceHeader from "../components/marketplace/MarketplaceHeader";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { debounce } from "lodash";
import { Search, Filter, AlertCircle } from "lucide-react";

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
  category: string; // Added category field
}

const customStyles = `
  .search-input, .filter-select {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .search-input:focus, .filter-select:focus {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  .dropdown-constrain {
    width: 100%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .dropdown-constrain option {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .product-grid {
    display: grid;
    gap: 1.5rem;
    animation: slideIn 0.6s ease-out;
  }
`;

function Marketplace() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isFetchingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const limit = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadMarketplaceProducts = useCallback(
    async (isFirstLoad = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        let query = supabase
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
          .order("created_at", { ascending: false });

        if (selectedCategory !== "all") {
          query = query.eq("category", selectedCategory);
        }

        if (searchQuery) {
          query = query.ilike("name", `%${searchQuery}%`);
        }

        const { data, error } = await query.range(
          (page - 1) * limit,
          page * limit - 1
        );

        if (error) throw error;

        if (!data || data.length === 0) {
          setProducts(isFirstLoad ? [] : products);
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
          category: product.category || "Not specified", // Added category mapping
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
    [page, products, searchQuery, selectedCategory]
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
          setPage(1);
          loadMarketplaceProducts(true);
        }
      )
      .subscribe();

    loadMarketplaceProducts(true);

    return () => {
      channel.unsubscribe();
    };
  }, [loadMarketplaceProducts]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observerRef.current?.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore]);

  useEffect(() => {
    setPage(1);
    loadMarketplaceProducts(true);
  }, [searchQuery, selectedCategory, loadMarketplaceProducts]);

  const debouncedSetSearchQuery = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );

  const handleNewListing = () => {
    console.log("Create new listing");
    // Navigate to the create listing page if needed
    // navigate("/create-listing");
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Skeleton width={200} height={32} />
          <Skeleton width={150} height={40} />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton width="100%" height={40} />
          <Skeleton width={200} height={40} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3)
            .fill(0)
            .map((_, index) => (
              <div key={index}>
                <Skeleton height={192} />
                <Skeleton count={3} />
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <style>{customStyles}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MarketplaceHeader onNewListing={handleNewListing} page={page} />

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
            <button
              onClick={() => {
                setError(null);
                setPage(1);
                loadMarketplaceProducts(true);
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search listings..."
              className="search-input pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all"
              onChange={(e) => debouncedSetSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="filter-select pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all appearance-none bg-white dropdown-constrain"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="grains">Grains</option>
              <option value="vegetables">Vegetables</option>
              <option value="fruits">Fruits</option>
              <option value="pulses">Pulses</option>
              <option value="herbs">Herbs</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="product-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && !loading ? (
            <div className="text-center py-12 col-span-full">
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            products.map((product) => (
              <ListingCard key={product.id} {...product} />
            ))
          )}
        </div>

        {hasMore && (
          <div ref={loadMoreRef} className="h-10">
            {isFetchingRef.current && (
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Marketplace;