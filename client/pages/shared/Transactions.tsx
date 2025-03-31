import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Filter,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Box,
  DollarSign,
  Clock,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { WalletService } from "../../services/wallet.service";
import { SmartContract } from "../../types/types";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-green-500/10 text-green-600",
  PENDING: "bg-yellow-500/10 text-yellow-600",
  FUNDED: "bg-blue-500/10 text-blue-600",
  IN_PROGRESS: "bg-purple-500/10 text-purple-600",
  DELIVERED: "bg-teal-500/10 text-teal-600",
  CANCELLED: "bg-gray-500/10 text-gray-600",
  DISPUTED: "bg-red-500/10 text-red-600",
  RESOLVED: "bg-green-600/10 text-green-700",
};

interface EnhancedSmartContract extends SmartContract {
  products?: {
    name: string;
    description: string;
    unit: string;
    image_url?: string;
  };
  farmer?: {
    name: string;
    profile_photo_url?: string;
  };
  buyer?: {
    contact_name: string;
    profile_photo_url?: string;
  };
}

const TransactionCard = React.memo(
  ({
    contract,
    userRole,
    ethPriceInINR,
  }: {
    contract: EnhancedSmartContract;
    userRole: "farmer" | "buyer" | null;
    ethPriceInINR: number;
  }) => {
    const formatPrice = useCallback(
      (amountEth: number) => {
        const amountInINR = amountEth * ethPriceInINR;
        return `₹${amountInINR.toLocaleString("en-IN")} (${amountEth.toFixed(
          4
        )} ETH)`;
      },
      [ethPriceInINR]
    );

    const transactionType = userRole === "buyer" ? "received" : "sent";
    const counterparty =
      userRole === "buyer"
        ? contract.farmer?.name || "Unknown Farmer"
        : contract.buyer?.contact_name || "Unknown Buyer";
    const counterpartyPhoto =
      userRole === "buyer"
        ? contract.farmer?.profile_photo_url
        : contract.buyer?.profile_photo_url;

    return (
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4 w-full">
            <div className="flex-shrink-0 relative">
              {contract.products?.image_url ? (
                <img
                  src={contract.products.image_url}
                  alt={contract.products.name}
                  className="w-20 h-20 object-cover rounded-lg shadow-md hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                  onError={(e) => {
                    console.error(
                      `Image failed to load: ${contract.products?.image_url}`
                    );
                    e.currentTarget.src = "https://via.placeholder.com/150";
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  No Image
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center gap-4">
              {transactionType === "received" ? (
                <ArrowDownLeft className="h-6 w-6 text-emerald-500 animate-pulse" />
              ) : (
                <ArrowUpRight className="h-6 w-6 text-red-500 animate-pulse" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {contract.products?.name || contract.crop_name}
                </h3>
                <p className="text-sm text-gray-500 truncate max-w-md">
                  {contract.products?.description || "No description"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusColors[contract.status]
              }`}
            >
              {contract.status.charAt(0).toUpperCase() +
                contract.status.slice(1).toLowerCase()}
            </span>
            <p className="text-sm text-gray-600">
              {new Date(contract.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Quantity:</span>
            <p className="font-medium text-gray-800">
              {contract.quantity} {contract.products?.unit || "units"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Price:</span>
            <p className="font-medium text-gray-800">
              {formatPrice(contract.amount_eth)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              {userRole === "farmer" ? "Buyer" : "Farmer"}:
            </span>
            {counterpartyPhoto ? (
              <img
                src={counterpartyPhoto}
                alt={counterparty}
                className="w-8 h-8 rounded-full object-cover shadow-sm hover:scale-110 transition-transform duration-200"
                loading="lazy"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                {counterparty[0]?.toUpperCase() || "?"}
              </div>
            )}
            <p className="font-medium text-gray-800 truncate max-w-[150px]">
              {counterparty}
            </p>
          </div>
        </div>
        {contract.blockchain_tx_hash && (
          <button
            className="mt-4 text-emerald-600 hover:text-emerald-800 font-medium transition-colors duration-200"
            onClick={() =>
              window.open(
                `https://sepolia.etherscan.io/tx/${contract.blockchain_tx_hash}`,
                "_blank"
              )
            }
          >
            View on Etherscan
          </button>
        )}
      </div>
    );
  }
);

const Transactions: React.FC = () => {
  const [contracts, setContracts] = useState<EnhancedSmartContract[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"farmer" | "buyer" | null>(null);
  const [summary, setSummary] = useState({
    totalDelivered: 0,
    totalValue: 0,
    pendingContracts: 0,
    totalTransactions: 0,
  });
  const [ethPriceInINR, setEthPriceInINR] = useState(0);

  useEffect(() => {
    let subscription: any;
    const initialize = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const role = await determineUserRole(user.id);
        setUserRole(role);

        const ethPrice = await WalletService.getEthPriceInINR();
        setEthPriceInINR(ethPrice);

        const orConditions = await buildOrConditions(user.id, role);
        const contractsData = await fetchContracts(orConditions);
        setContracts(contractsData);
        updateSummary(contractsData, role);

        subscription = setupRealtimeSubscription(orConditions, role);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    };

    initialize();
    return () => subscription && supabase.removeChannel(subscription);
  }, []);

  const determineUserRole = async (userId: string) => {
    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (farmer) return "farmer";
    const { data: buyer } = await supabase
      .from("buyers")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (buyer) return "buyer";
    throw new Error("User role not found");
  };

  const buildOrConditions = async (userId: string, role: string) => {
    const conditions: string[] = [];
    if (role === "farmer") {
      const { data } = await supabase
        .from("farmers")
        .select("id")
        .eq("user_id", userId)
        .single();
      if (data?.id) conditions.push(`farmer_id.eq.${data.id}`);
    } else {
      const { data } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", userId)
        .single();
      if (data?.id) conditions.push(`buyer_id.eq.${data.id}`);
    }
    return conditions;
  };

  const fetchContracts = async (orConditions: string[]) => {
    // First get the matching products with their contract details
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select(
        `
        name,
        description,
        unit,
        image_url,
        contract_id
      `
      )
      .not("contract_id", "is", null);

    if (productsError) {
      console.error("Products fetch error:", productsError);
      throw productsError;
    }

    // Create a map of contract_id to product details
    const productsByContractId = productsData.reduce((acc, product) => {
      if (product.contract_id) {
        acc[product.contract_id] = product;
      }
      return acc;
    }, {} as Record<string, any>);

    // Now fetch contracts with farmer and buyer details
    const { data: contractsData, error: contractsError } = await supabase
      .from("smart_contracts")
      .select(
        `
        *,
        farmer:farmer_id (
          name,
          profile_photo_url
        ),
        buyer:buyer_id (
          contact_name,
          profile_photo_url
        )
      `
      )
      .or(orConditions.join(","))
      .order("created_at", { ascending: false });

    if (contractsError) {
      console.error("Contracts fetch error:", contractsError);
      throw contractsError;
    }

    // Combine contract data with product data
    const transformedData = contractsData.map((contract) => ({
      ...contract,
      products: productsByContractId[contract.contract_id] || null,
    }));

    console.log("Transformed contract data:", transformedData);
    return transformedData || [];
  };

  const setupRealtimeSubscription = (orConditions: string[], role: string) => {
    return supabase
      .channel("smart_contracts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "smart_contracts",
          filter: orConditions.join(","),
        },
        (payload) => {
          setContracts((prev) => {
            const updated = handleRealtimeUpdate(prev, payload);
            updateSummary(updated, role);
            return updated;
          });
        }
      )
      .subscribe();
  };

  const handleRealtimeUpdate = (
    prev: EnhancedSmartContract[],
    payload: any
  ) => {
    switch (payload.eventType) {
      case "INSERT":
        return [payload.new as EnhancedSmartContract, ...prev];
      case "UPDATE":
        return prev.map((c) =>
          c.contract_id === payload.new.contract_id
            ? (payload.new as EnhancedSmartContract)
            : c
        );
      case "DELETE":
        return prev.filter((c) => c.contract_id !== payload.old.contract_id);
      default:
        return prev;
    }
  };

  const updateSummary = useCallback(
    (contracts: EnhancedSmartContract[], role: string | null) => {
      if (!role) return;
      const deliveredContracts = contracts.filter(
        (c) => c.status === "DELIVERED"
      );
      const allCompletedContracts = contracts.filter(
        (c) => c.status === "DELIVERED" || c.status === "COMPLETED"
      );

      setSummary({
        totalDelivered: deliveredContracts.reduce(
          (sum, c) => sum + c.quantity,
          0
        ),
        totalValue: deliveredContracts.reduce(
          (sum, c) => sum + c.amount_eth,
          0
        ),
        pendingContracts: contracts.filter((c) =>
          ["PENDING", "FUNDED"].includes(c.status)
        ).length,
        totalTransactions: allCompletedContracts.reduce(
          (sum, c) => sum + c.amount_eth,
          0
        ),
      });
    },
    []
  );

  const filteredContracts = useMemo(
    () =>
      contracts.filter((c) => {
        const search = searchQuery.toLowerCase();
        return (
          (c.crop_name.toLowerCase().includes(search) ||
            (c.delivery_location?.toLowerCase() || "").includes(search) ||
            (c.additional_notes?.toLowerCase() || "").includes(search) ||
            (c.products?.name?.toLowerCase() || "").includes(search) ||
            (c.farmer?.name?.toLowerCase() || "").includes(search) ||
            (c.buyer?.contact_name?.toLowerCase() || "").includes(search)) &&
          (selectedStatus === "all" || c.status === selectedStatus)
        );
      }),
    [contracts, searchQuery, selectedStatus]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent animate-fade-in tracking-tight">
            {userRole === "farmer" ? "Sales Dashboard" : "Purchase Dashboard"}
          </h1>
          <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-emerald-500/25">
            Export History
          </button>
        </div>

        {error && (
          <div className="mb-8 bg-red-500/10 backdrop-blur-sm text-red-600 p-4 rounded-xl flex items-center animate-slide-down border border-red-200">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-emerald-100/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {userRole === "farmer" ? "Total Sold" : "Total Purchased"}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2 animate-count-up group-hover:scale-105 transition-transform">
                  {summary.totalDelivered} units
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
                <Box className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-emerald-600 mt-4 font-medium">
              ₹{(summary.totalValue * ethPriceInINR).toLocaleString("en-IN")} (
              {summary.totalValue.toFixed(4)} ETH)
            </p>
          </div>

          <div className="group bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-emerald-100/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {userRole === "farmer" ? "Total Sales" : "Total Purchases"}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2 animate-count-up group-hover:scale-105 transition-transform">
                  ₹
                  {(summary.totalTransactions * ethPriceInINR).toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-emerald-600 mt-4 font-medium">
              {summary.totalTransactions.toFixed(4)} ETH
            </p>
          </div>

          <div className="group bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 border border-emerald-100/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Contracts
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2 animate-count-up group-hover:scale-105 transition-transform">
                  {summary.pendingContracts}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-yellow-600 mt-4 font-medium">
              Awaiting Action
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-hover:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder={`Search ${
                userRole === "farmer" ? "sales" : "purchases"
              }...`}
              className="w-full pl-12 pr-4 py-4 bg-white/70 backdrop-blur-xl border border-emerald-100/50 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 shadow-lg hover:shadow-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-hover:text-emerald-500 transition-colors" />
            <select
              className="pl-12 pr-4 py-4 bg-white/70 backdrop-blur-xl border border-emerald-100/50 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 shadow-lg hover:shadow-xl appearance-none cursor-pointer"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              {Object.keys(statusColors).map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() +
                    status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Update the TransactionCard styles in the existing component */}
        <div className="grid gap-6">
          {filteredContracts.map((contract) => (
            <TransactionCard
              key={contract.contract_id}
              contract={contract}
              userRole={userRole}
              ethPriceInINR={ethPriceInINR}
            />
          ))}
          {filteredContracts.length === 0 && (
            <div className="text-center py-16 text-gray-500 animate-fade-in bg-white/50 backdrop-blur-xl rounded-2xl border border-gray-100">
              <div className="flex flex-col items-center gap-4">
                <Search className="h-12 w-12 text-gray-400" />
                <p className="text-lg">
                  No transactions found matching your criteria
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes countUp {
          from { transform: scale(0.95); opacity: 0.8; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        .animate-slide-down {
          animation: slideDown 0.5s ease-out;
        }
        .animate-count-up {
          animation: countUp 0.8s ease-out;
        }

        /* Add smooth scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #22c55e50;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #22c55e80;
        }
      `}</style>
    </div>
  );
};

export default Transactions;
