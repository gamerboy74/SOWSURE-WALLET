import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Loader2, Package, User, MapPin, Calendar, Truck } from "lucide-react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../contract/AgriculturalContract";
import { WalletService } from "../services/wallet.service";
import OrdersHeader from "../components/orders/OrdersHeader";
import ChatWindow from "../components/chat/ChatWindow";
import { useChat } from "../hooks/useChat";

interface User {
  name: string;
  type: "Farmer" | "Buyer";
  rating: number;
  profilePhotoUrl: string | null;
  id: string;
}

interface Order {
  id: number;
  contract_id: string;
  status: string;
  product: string;
  quantity: string;
  price: string;
  location: string;
  user: User | null;
  orderDate: string;
  deliveryDate: string;
  amount_eth: string;
  image_url: string | null;
  farmer_id: string | null;
  buyer_id: string | null;
  is_buyer_initiated: boolean;
}

interface ProductData {
  id: number;
  name: string | null;
  quantity: number | null;
  unit: string | null;
  image_url: string | null;
  contract_id: string | null;
  farmer_id: string | null;
  buyer_id: string | null;
  smart_contracts: {
    contract_id: string;
    status: string;
    amount_eth: string;
    delivery_location: string | null;
    start_date: string | null;
    end_date: string | null;
    buyer_id: string | null;
    farmer_id: string | null;
    is_buyer_initiated: boolean;
  } | null;
  farmers: { name: string | null; profile_photo_url: string | null; id: string | null } | null;
  buyers: { company_name: string | null; profile_photo_url: string | null; id: string | null } | null;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"farmer" | "buyer" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"created" | "accepted" | "delivered">("created");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const chatParams = useMemo(() => {
    if (!userId || !userRole || !selectedOrder) {
      return { currentUserId: userId, product: null, disableChat: true };
    }
    return {
      currentUserId: userId,
      product: {
        id: selectedOrder.id.toString(),
        type: userRole === "farmer" ? ("sell" as const) : ("buy" as const),
        farmer: { id: selectedOrder.farmer_id || "" },
        buyer: { id: selectedOrder.buyer_id || "" },
      },
      disableChat: false,
    };
  }, [userId, userRole, selectedOrder]);
  const { showChat, chatId, chatLoading, error: chatError, initiateChat, closeChat } = useChat(chatParams);

  const provider = useMemo(() => WalletService.provider || new ethers.JsonRpcProvider("http://localhost:8545"), []);
  const blockchainContract = useMemo(() => new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider), [provider]);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("User not authenticated");

        const [farmerRes, buyerRes] = await Promise.all([
          supabase.from("farmers").select("id").eq("user_id", user.id).maybeSingle(), // Changed to maybeSingle
          supabase.from("buyers").select("id").eq("user_id", user.id).maybeSingle(),  // Changed to maybeSingle
        ]);

        if (farmerRes.error) console.error("Farmer fetch error:", farmerRes.error);
        if (buyerRes.error) console.error("Buyer fetch error:", buyerRes.error);

        if (farmerRes.data) {
          setUserRole("farmer");
          setUserId(farmerRes.data.id);
        } else if (buyerRes.data) {
          setUserRole("buyer");
          setUserId(buyerRes.data.id);
        } else {
          throw new Error("User is neither a farmer nor a buyer");
        }
      } catch (err) {
        console.error("Error determining user role:", err);
        setError("Unable to determine user role. Please log in again.");
      } finally {
        setLoading(false);
      }
    };

    void getUserRole();
  }, []);

  const loadOrders = useCallback(async () => {
    if (!userRole || !userId) return;

    setLoading(true);
    try {
      const queryBase = `
        id, name, quantity, unit, image_url, contract_id, farmer_id, buyer_id,
        smart_contracts!products_contract_id_fkey (
          contract_id, status, amount_eth, delivery_location, start_date, end_date, buyer_id, farmer_id, is_buyer_initiated
        ),
        farmers (name, profile_photo_url, id),
        buyers (company_name, profile_photo_url, id)
      `;

      const [createdRes, acceptedRes] = await Promise.all([
        supabase.from("products").select(queryBase).eq(userRole === "farmer" ? "farmer_id" : "buyer_id", userId),
        supabase.from("products").select(queryBase).eq(`smart_contracts.${userRole === "farmer" ? "farmer_id" : "buyer_id"}`, userId),
      ]);

      const allProducts = [
        ...(createdRes.data || []),
        ...(acceptedRes.data || []).filter((ap) => !createdRes.data?.some((cp) => cp.id === ap.id)),
      ];

      if (!allProducts.length) {
        setOrders([]);
        return;
      }

      const updatedOrders = await Promise.all(
        allProducts.map(async (product: ProductData) => {
          const contract = product.smart_contracts;
          if (!contract?.contract_id) return null;

          const contractDetails = await blockchainContract.getContractDetails(contract.contract_id);
          const statusMap = {
            "0": "PENDING",
            "1": "FUNDED",
            "2": "IN_PROGRESS",
            "3": "DELIVERED",
            "4": "COMPLETED",
            "5": "CANCELLED",
            "6": "DISPUTED",
            "7": "RESOLVED",
          };
          const mappedStatus = statusMap[contractDetails.status.status.toString() as keyof typeof statusMap] || contract.status;

          if (contract.status !== mappedStatus) {
            await supabase.from("smart_contracts").update({ status: mappedStatus }).eq("contract_id", contract.contract_id);
          }

          let user: User | null = null;
          if (mappedStatus !== "PENDING") {
            user = await (async () => {
              if (userRole === "buyer" && (!product.farmers?.name || !product.farmers?.id) && contract.farmer_id) {
                const { data: farmer } = await supabase.from("farmers").select("name, profile_photo_url, id").eq("id", contract.farmer_id).maybeSingle();
                return {
                  name: farmer?.name || "Unknown Farmer",
                  type: "Farmer",
                  rating: 4.5,
                  profilePhotoUrl: farmer?.profile_photo_url || null,
                  id: farmer?.id || contract.farmer_id || "",
                };
              } else if (userRole === "farmer" && (!product.buyers?.company_name || !product.buyers?.id) && contract.buyer_id) {
                const { data: buyer } = await supabase.from("buyers").select("company_name, profile_photo_url, id").eq("id", contract.buyer_id).maybeSingle();
                return {
                  name: buyer?.company_name || "Unknown Buyer",
                  type: "Buyer",
                  rating: 4.5,
                  profilePhotoUrl: buyer?.profile_photo_url || null,
                  id: buyer?.id || contract.buyer_id || "",
                };
              }
              return {
                name: userRole === "farmer" ? product.buyers?.company_name || "Unknown Buyer" : product.farmers?.name || "Unknown Farmer",
                type: userRole === "farmer" ? "Buyer" : "Farmer",
                rating: 4.5,
                profilePhotoUrl: userRole === "farmer" ? product.buyers?.profile_photo_url || null : product.farmers?.profile_photo_url || null,
                id: userRole === "farmer" ? product.buyers?.id || contract.buyer_id || "" : product.farmers?.id || contract.farmer_id || "",
              };
            })();
          }

          return {
            id: product.id,
            contract_id: contract.contract_id,
            status: mappedStatus,
            product: product.name || "Unknown Product",
            quantity: `${product.quantity || 0} ${product.unit || "unit"}`,
            price: `${contract.amount_eth || "0"} ETH`,
            location: contract.delivery_location || "Not specified",
            user,
            orderDate: contract.start_date || new Date().toISOString(),
            deliveryDate: contract.end_date || new Date().toISOString(),
            amount_eth: contract.amount_eth,
            image_url: product.image_url,
            farmer_id: contract.farmer_id,
            buyer_id: contract.buyer_id,
            is_buyer_initiated: contract.is_buyer_initiated,
          };
        })
      );

      setOrders(updatedOrders.filter((order): order is Order => order !== null));
    } catch (err) {
      setError("Failed to load orders. Please try again later.");
      console.error("Load Orders Error:", err);
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, blockchainContract]);

  const filteredOrders = useMemo(() => {
    const tabFilteredOrders = orders.filter((order) => {
      if (activeTab === "created") return userRole === "farmer" ? !order.is_buyer_initiated : order.is_buyer_initiated;
      if (activeTab === "accepted") return userRole === "farmer" ? order.is_buyer_initiated : !order.is_buyer_initiated;
      return order.status === "DELIVERED";
    });

    return activeTab === "delivered"
      ? tabFilteredOrders
      : statusFilter === "all"
      ? tabFilteredOrders.filter((order) => order.status !== "DELIVERED")
      : tabFilteredOrders.filter((order) => order.status.toLowerCase() === statusFilter);
  }, [orders, activeTab, statusFilter, userRole]);

  useEffect(() => {
    if (!userRole || !userId) return;

    void loadOrders();
    const subscription = supabase
      .channel("smart_contracts")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "smart_contracts" }, () => void loadOrders())
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, [userRole, userId, loadOrders]);

  useEffect(() => {
    if (selectedOrder && !showChat) {
      console.log("Initiating chat for:", selectedOrder);
      void initiateChat();
    }
  }, [selectedOrder, initiateChat, showChat]);

  const handleFilterChange = useCallback((filter: string) => setStatusFilter(filter), []);

  const handleExport = useCallback(() => {
    const csvContent = [
      ["Product ID", "Contract ID", "Status", "Product", "Quantity", "Price", "Location", "User", "Order Date", "Delivery Date"],
      ...filteredOrders.map((order) => [
        order.id,
        order.contract_id,
        order.status,
        order.product,
        order.quantity,
        order.price,
        order.location,
        order.user?.name || "N/A",
        new Date(order.orderDate).toLocaleDateString(),
        new Date(order.deliveryDate).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${activeTab}.csv`;
    link.click();
  }, [filteredOrders, activeTab]);

  const handleViewDetails = useCallback(
    (orderId: number) => {
      if (!userRole) {
        console.error("Cannot navigate: userRole is null");
        return;
      }
      console.log(`Navigating to /${userRole}/orders/${orderId}`);
      navigate(`/${userRole}/orders/${orderId}`);
    },
    [navigate, userRole]
  );

  const handleContact = useCallback((order: Order) => {
    console.log("handleContact:", { order, userId, userRole });
    setSelectedOrder(order);
  }, [userId, userRole]);

  const OrderCard = React.memo(({ order }: { order: Order }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <img
        src={order.image_url || "https://placehold.co/600x400?text=No+Image"}
        alt={order.product}
        className="w-full h-40 object-cover rounded-md mb-4"
        loading="lazy"
      />
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{order.product}</h3>
          <p className="text-sm text-gray-500">Contract #{order.contract_id}</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            order.status === "PENDING"
              ? "bg-yellow-100 text-yellow-700"
              : ["FUNDED", "IN_PROGRESS"].includes(order.status)
              ? "bg-blue-100 text-blue-700"
              : ["DELIVERED", "COMPLETED", "RESOLVED"].includes(order.status)
              ? "bg-green-100 text-green-700"
              : ["DISPUTED", "CANCELLED"].includes(order.status)
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {order.status}
        </span>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <p className="flex items-center">
          <Package className="w-4 h-4 mr-2 text-teal-500" /> {order.quantity}
        </p>
        <p className="flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-teal-500" /> {order.location}
        </p>
        <p className="flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-teal-500" /> Ordered: {new Date(order.orderDate).toLocaleDateString()}
        </p>
        {order.status === "DELIVERED" ? (
          <p className="flex items-center">
            <Truck className="w-4 h-4 mr-2 text-teal-500" /> Delivered: {new Date(order.deliveryDate).toLocaleDateString()}
          </p>
        ) : (
          <p className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-teal-500" /> Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
          </p>
        )}
      </div>
      {order.user ? (
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center">
          {order.user.profilePhotoUrl ? (
            <img
              src={order.user.profilePhotoUrl}
              alt={order.user.name}
              className="w-10 h-10 rounded-full mr-3"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
              <User className="w-6 h-6 text-gray-500" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-800">{order.user.name}</p>
            <p className="text-xs text-gray-500">
              {order.user.type} • ⭐ {order.user.rating}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-gray-200 text-gray-500 text-sm">
          No {userRole === "buyer" ? "Farmer" : "Buyer"} details available
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => handleViewDetails(order.id)}
          className="flex-1 px-4 py-2 text-sm text-teal-700 bg-teal-100 rounded-lg hover:bg-teal-200 transition-colors duration-200"
        >
          View Details
        </button>
        <button
          onClick={() => handleContact(order)}
          className="flex-1 px-4 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors duration-200 disabled:opacity-50"
          disabled={chatLoading || !order.user}
        >
          {chatLoading && selectedOrder?.id === order.id
            ? "Opening..."
            : `Contact ${order.user?.type || "Party"}`}
        </button>
      </div>
    </div>
  ));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600 bg-red-100 p-4 rounded-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {(["created", "accepted", "delivered"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "delivered") setStatusFilter("all");
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-teal-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-teal-50 hover:text-teal-600"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Orders
              </button>
            ))}
          </div>
          <OrdersHeader onFilterChange={handleFilterChange} onExport={handleExport} showFilters={activeTab !== "delivered"} />
        </div>

        {filteredOrders.length === 0 ? (
          <p className="text-center text-gray-500 text-lg">
            No {activeTab} orders found{statusFilter !== "all" && activeTab !== "delivered" ? ` with status "${statusFilter}"` : ""}.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {showChat && chatId && userId && selectedOrder && (
          <ChatWindow
            chatId={chatId}
            currentUserId={userId}
            otherUser={{ name: selectedOrder.user?.name || "", image: selectedOrder.user?.profilePhotoUrl || "" }}
            productId={selectedOrder.id.toString()}
            onClose={closeChat}
            className="z-50"
          />
        )}
        {chatError && (
          <p className="fixed bottom-4 right-4 text-red-600 bg-red-100 p-4 rounded-lg">{chatError}</p>
        )}
      </div>
    </div>
  );
};

export default Orders;