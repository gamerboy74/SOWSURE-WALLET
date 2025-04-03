import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import ListingCard from "../components/marketplace/ListingCard";
import MarketplaceHeader from "../components/marketplace/MarketplaceHeader";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { debounce } from "lodash";
import { Search, Filter, AlertCircle } from "lucide-react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../contract/AgriculturalContract";
import { WalletService } from "../services/wallet.service";

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
  category: string;
}

const STATUS_MAP: { [key: string]: string } = {
  "0": "PENDING",
  "1": "FUNDED",
  "2": "IN_PROGRESS",
  "3": "COMPLETED",
  "4": "DISPUTED",
  "5": "RESOLVED",
};

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
  const [ethPriceInINR, setEthPriceInINR] = useState<number | null>(null);
  const [siteName, setSiteName] = useState("FarmConnect"); // Default value

  // Fetch site name from site_settings table
  useEffect(() => {
    const fetchSiteName = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("site_name")
          .single(); // Assumes one row with site settings
        if (error) throw error;
        if (data && data.site_name) {
          setSiteName(data.site_name);
        }
      } catch (err) {
        console.error("Failed to fetch site name:", err);
        // Keep default "FarmConnect" if fetch fails
      }
    };
    fetchSiteName();
  }, []);

  // Fetch ETH price in INR on mount
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const price = await WalletService.getEthPriceInINR();
        setEthPriceInINR(price);
      } catch (err) {
        console.error("Failed to fetch ETH price:", err);
        setEthPriceInINR(200000); // Fallback value
      }
    };
    fetchEthPrice();
  }, []);

  const displayAmountInINR = (ethAmount: number, unit: string) => {
    if (ethPriceInINR === null) return `₹${ethAmount.toFixed(2)}/${unit}`; // Fallback if price not loaded
    return `₹${(ethAmount * ethPriceInINR).toFixed(2)}/${unit}`;
  };

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
            smart_contracts!products_contract_id_fkey!inner (
              contract_id,
              status,
              amount_eth,
              escrow_balance_eth,
              farmer_confirmed_delivery,
              buyer_confirmed_receipt,
              is_buyer_initiated,
              delivery_method,
              delivery_location,
              start_date,
              end_date,
              additional_notes,
              buyer_id,
              farmer_id
            ),
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
          .eq("smart_contracts.status", "PENDING");

        const provider = WalletService.provider || new ethers.JsonRpcProvider("http://localhost:8545");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

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

        const syncedProducts = await Promise.all(
          data.map(async (product) => {
            if (product.smart_contracts && product.smart_contracts.contract_id) {
              try {
                const details = await contract.getContractDetails(product.smart_contracts.contract_id);
                const onChainStatus = STATUS_MAP[details.status.status.toString()] || product.smart_contracts.status;

                if (product.smart_contracts.status !== onChainStatus) {
                  await supabase
                    .from("smart_contracts")
                    .update({ status: onChainStatus })
                    .eq("contract_id", product.smart_contracts.contract_id);
                  product.smart_contracts.status = onChainStatus;
                }
                const contractPrice = Number(ethers.formatEther(details.basic.amount));
                if (product.price !== contractPrice) {
                  product.price = contractPrice; // Update price from contract if needed
                }
              } catch (err) {
                console.error(`Error syncing contract ${product.smart_contracts.contract_id}:`, err);
              }
            }
            return product;
          })
        );

        const pendingProducts = syncedProducts.filter(
          (product) => product.smart_contracts && product.smart_contracts.status === "PENDING"
        );

        if (pendingProducts.length === 0) {
          setProducts(isFirstLoad ? [] : products);
          setHasMore(false);
          return;
        }

        const formattedProducts = pendingProducts.map((product) => ({
          id: product.id,
          type: product.type,
          title: product.name,
          quantity: `${product.quantity} ${product.unit}`,
          price: displayAmountInINR(product.price, product.unit),
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
          category: product.category || "Not specified",
        }));

        setProducts(
          isFirstLoad ? formattedProducts : [...products, ...formattedProducts]
        );
        setHasMore(formattedProducts.length === limit);
      } catch (err) {
        console.error("Full Error:", JSON.stringify(err, null, 2));
        setError("Failed to load marketplace products");
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [page, products, searchQuery, selectedCategory, ethPriceInINR]
  );

  useEffect(() => {
    const channel = supabase.channel("marketplace_changes");

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "smart_contracts",
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

  if (loading && page === 1) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Skeleton width={200} height={32} />
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
        <MarketplaceHeader page={page} siteName={siteName} />

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
              <p className="text-gray-500">No pending contract products found</p>
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