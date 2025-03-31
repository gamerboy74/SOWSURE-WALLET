import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Package,
  MapPin,
  Calendar,
  User,
  ArrowLeft,
  Star,
  MessageSquare,
  Loader2,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ChatWindow from "../components/chat/ChatWindow";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useChat } from "../hooks/useChat";
import { useProductDetails } from "../hooks/useProductDetails";
import { WalletService } from "../services/wallet.service";
import { useWallet } from "../hooks/useWallet";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../contract/AgriculturalContract";
import DialogBox from "../pages/DialogBox";
import { toast } from "react-toastify";

const customStyles = `
  .button-transition {
    transition: all 0.2s ease-in-out;
  }
  .animate-fade-in {
    animation: fadeIn 0.3s ease-in;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .dialog-content {
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    padding: 1.5rem;
  }
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    margin-top: 1rem;
  }
`;

const ROUTES = {
  MARKETPLACE: "/marketplace",
} as const;

const STATUS_MAP: { [key: string]: string } = {
  "0": "PENDING",
  "1": "FUNDED",
  "2": "IN_PROGRESS",
  "3": "COMPLETED",
  "4": "DISPUTED",
  "5": "RESOLVED",
};

interface Product {
  id: string;
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
  farmer_id: string | null;
  buyer_id: string | null;
  contract_id?: string;
  moisture_content?: string;
  protein_level?: string;
  origin?: string;
  harvest_year?: string;
  certification?: string;
  shipping_terms?: string;
  required_docs?: string[];
  farmer?: { name: string; profile_photo_url: string; complete_address: string; land_type: string; land_size: number };
  buyer?: { company_name: string; profile_photo_url: string; business_address: string; business_type: string; storage_capacity: number };
}

interface ContractDetails {
  contract_id: string;
  status: string;
  amount_eth: string;
  escrow_balance_eth: string;
  farmer_confirmed_delivery: boolean;
  buyer_confirmed_receipt: boolean;
  is_buyer_initiated: boolean;
  delivery_method: string;
  delivery_location: string;
  start_date: string;
  end_date: string;
  additional_notes: string;
  buyer_id: string | null;
  farmer_id: string | null;
}

interface ActionFormData {
  delivery_method: string;
  delivery_location: string;
  additional_notes: string;
}

function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    product,
    loading,
    error: productError,
    currentUserId,
    isOwnListing,
    isFarmer,
    isBuyer,
    refetch,
  } = useProductDetails(id!);
  const { address, balance } = useWallet();

  const disableChat = useMemo(
    () => isOwnListing || (product?.type === "sell" && isFarmer) || (product?.type === "buy" && isBuyer),
    [isOwnListing, product?.type, isFarmer, isBuyer]
  );

  const { showChat, chatId, chatLoading, initiateChat, closeChat } = useChat({
    currentUserId,
    product: product
      ? {
          id: product.id,
          type: product.type,
          farmer: product.farmer,
          buyer: product.buyer,
        }
      : null,
    disableChat,
  });

  const [state, setState] = useState({
    productImgError: false,
    profileImgError: false,
    contractDetails: null as ContractDetails | null,
    actionLoading: false,
    showActionForm: false,
    actionFormData: { delivery_method: "pickup", delivery_location: "", additional_notes: "" } as ActionFormData,
    error: null as string | null,
    ethPriceInINR: 200000, // Fallback value
  });

  const handleImageError = useCallback((type: "product" | "profile") => {
    if (type === "product") setState((prev) => ({ ...prev, productImgError: true }));
    else setState((prev) => ({ ...prev, profileImgError: true }));
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const ethPrice = await WalletService.getEthPriceInINR();
        setState((prev) => ({ ...prev, ethPriceInINR: ethPrice || 200000 }));
      } catch (err) {
        console.error("Error fetching ETH price:", err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchContractDetails = async () => {
      if (!product?.contract_id) {
        setState((prev) => ({ ...prev, contractDetails: null }));
        return;
      }
      const contractId = product.contract_id;
      const provider = WalletService.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      try {
        const { data, error } = await supabase
          .from("smart_contracts")
          .select("contract_id, status, amount_eth, escrow_balance_eth, farmer_confirmed_delivery, buyer_confirmed_receipt, is_buyer_initiated, delivery_method, delivery_location, start_date, end_date, additional_notes, buyer_id, farmer_id")
          .eq("contract_id", contractId)
          .maybeSingle();

        if (error) throw new Error(`Supabase error: ${error.message}`);

        const details = await contract.getContractDetails(contractId);
        const onChainStatus = STATUS_MAP[details.status.status.toString()] || data?.status || "PENDING";

        if (data && data.status !== onChainStatus) {
          await supabase
            .from("smart_contracts")
            .update({ status: onChainStatus })
            .eq("contract_id", contractId);
        }

        setState((prev) => ({
          ...prev,
          contractDetails: data ? { ...data, status: onChainStatus, amount_eth: ethers.formatEther(details.basic.amount), escrow_balance_eth: ethers.formatEther(details.status.escrowBalance) } : null,
        }));
      } catch (err) {
        console.error("Error fetching contract details:", err);
        const details = await contract.getContractDetails(contractId);
        const formattedData: ContractDetails = {
          contract_id: contractId,
          status: STATUS_MAP[details.status.status.toString()] || "PENDING",
          amount_eth: ethers.formatEther(details.basic.amount),
          escrow_balance_eth: ethers.formatEther(details.status.escrowBalance),
          farmer_confirmed_delivery: details.status.farmerConfirmedDelivery,
          buyer_confirmed_receipt: details.status.buyerConfirmedReceipt,
          is_buyer_initiated: details.status.isBuyerInitiated,
          delivery_method: details.delivery.deliveryMethod,
          delivery_location: details.delivery.deliveryLocation,
          start_date: new Date(Number(details.time.startDate) * 1000).toISOString(),
          end_date: new Date(Number(details.time.endDate) * 1000).toISOString(),
          additional_notes: details.delivery.additionalNotes,
          buyer_id: details.basic.buyerWallet !== ethers.ZeroAddress ? details.basic.buyerWallet : null,
          farmer_id: details.basic.farmerWallet !== ethers.ZeroAddress ? details.basic.farmerWallet : null,
        };
        setState((prev) => ({ ...prev, contractDetails: formattedData }));
      }
    };
    fetchContractDetails();
  }, [product?.contract_id]);

  useEffect(() => {
    if (product?.contract_id) {
      const subscription = supabase
        .channel(`smart_contracts:${product.contract_id}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "smart_contracts", filter: `contract_id=eq.${product.contract_id}` }, () => {
          refetch();
        })
        .subscribe();
      return () => { subscription.unsubscribe(); };
    }
  }, [product?.contract_id, refetch]);

  const canTakeAction = useMemo(() => {
    if (!product || product.status !== "active" || isOwnListing) return false;
    if (state.contractDetails) {
      if (product.type === "sell" && isBuyer) {
        return state.contractDetails.status === "PENDING" && !state.contractDetails.buyer_id;
      }
      if (product.type === "buy" && isFarmer) {
        return state.contractDetails.status === "PENDING" && !state.contractDetails.farmer_id;
      }
      return false;
    }
    return (product.type === "sell" && isBuyer) || (product.type === "buy" && isFarmer);
  }, [product, isOwnListing, isFarmer, isBuyer, state.contractDetails]);

  const handleActionClick = () => {
    if (canTakeAction) {
      if (product?.type === "sell" && isBuyer) {
        setState((prev) => ({ ...prev, showActionForm: true }));
      } else if (product?.type === "buy" && isFarmer) {
        handleActionSubmit(new Event("submit") as any);
      }
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !product) return;
    setState((prev) => ({ ...prev, actionLoading: true, error: null }));

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const walletInfo = await WalletService.getWalletInfo();
      if (!walletInfo) throw new Error("No wallet found");

      const provider = WalletService.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const signer = new ethers.Wallet(walletInfo.privateKey, provider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      let txHash: string;
      if (product.type === "buy" && isFarmer) {
        const { data: farmer, error: farmerError } = await supabase
          .from("farmers")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (farmerError || !farmer) throw new Error("You must be a farmer");

        if (!product.contract_id) throw new Error("No contract ID associated with this buy request");

        const details = await contract.getContractDetails(product.contract_id);
        if (Number(details.status.status) !== 0 || details.basic.farmerWallet !== ethers.ZeroAddress) {
          throw new Error(`Contract ID ${product.contract_id} is not available for acceptance`);
        }

        const tx = await contract.acceptBuyContract(product.contract_id, { gasLimit: 300000 });
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
        txHash = tx.hash;

        const { error: rpcError } = await supabase.rpc("sync_farmer_acceptance", {
          p_contract_id: Number(product.contract_id),
          p_farmer_id: farmer.id,
          p_tx_hash: txHash,
        });
        if (rpcError) throw new Error(`RPC sync_farmer_acceptance error: ${rpcError.message}`);

        const { error: updateError } = await supabase
          .from("products")
          .update({ status: "funded", farmer_id: farmer.id })
          .eq("id", product.id);
        if (updateError) throw new Error(`Product update error: ${updateError.message}`);

        toast.success(`Buy contract accepted! Tx: ${txHash}`);
        navigate(ROUTES.MARKETPLACE);
      } else if (product.type === "sell" && isBuyer) {
        const { data: buyer, error: buyerError } = await supabase
          .from("buyers")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (buyerError || !buyer) throw new Error("You must be a buyer");

        if (!state.actionFormData.delivery_location) throw new Error("Delivery location is required");

        const totalEth = ethers.parseEther((product.price * product.quantity).toString());
        if (!balance.eth || ethers.parseEther(balance.eth) < totalEth) {
          throw new Error(`Insufficient ETH balance: ${balance.eth} ETH available, ${ethers.formatEther(totalEth)} ETH required`);
        }

        if (!product.contract_id) throw new Error("No contract ID associated with this sell listing");

        const details = await contract.getContractDetails(product.contract_id);
        if (Number(details.status.status) !== 0 || details.basic.buyerWallet !== ethers.ZeroAddress) {
          throw new Error(`Contract ID ${product.contract_id} is not available for purchase`);
        }

        const tx = await contract.acceptSellContract(
          product.contract_id,
          state.actionFormData.delivery_method,
          state.actionFormData.delivery_location,
          state.actionFormData.additional_notes || "",
          { value: totalEth, gasLimit: 300000 }
        );
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
        txHash = tx.hash;

        const { error: rpcError } = await supabase.rpc("sync_sell_contract_acceptance", {
          p_contract_id: Number(product.contract_id),
          p_buyer_id: buyer.id,
          p_amount_eth: parseFloat(ethers.formatEther(totalEth)),
          p_tx_hash: txHash,
          p_delivery_method: state.actionFormData.delivery_method,
          p_delivery_location: state.actionFormData.delivery_location,
          p_additional_notes: state.actionFormData.additional_notes || "",
        });
        if (rpcError) throw new Error(`RPC sync_sell_contract_acceptance error: ${rpcError.message}`);

        await supabase
          .from("products")
          .update({ status: "funded", buyer_id: buyer.id })
          .eq("id", product.id);

        toast.success(`Sell contract accepted! Tx: ${txHash}`);
        navigate(ROUTES.MARKETPLACE);
      } else {
        throw new Error("Invalid action for your role or product type");
      }

      setState((prev) => ({ ...prev, showActionForm: false }));
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process action";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        actionLoading: false,
      }));
      toast.error(errorMessage);
    } finally {
      setState((prev) => ({ ...prev, actionLoading: false }));
    }
  };

  const displayAmountInINR = (ethAmount: number) => {
    return (ethAmount * state.ethPriceInINR).toFixed(2);
  };

  const buttonText = useMemo(() => {
    if (product?.type === "sell" && isBuyer) return "Purchase Now";
    if (product?.type === "buy" && isFarmer) return "Fulfill Request";
    return "Action Not Available";
  }, [product?.type, isBuyer, isFarmer]);

  const buttonIcon = useMemo(() => {
    if (product?.type === "sell" && isBuyer) return <ShoppingCart className="h-4 w-4 mr-2" />;
    if (product?.type === "buy" && isFarmer) return <Check className="h-4 w-4 mr-2" />;
    return null;
  }, [product?.type, isBuyer, isFarmer]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <Skeleton width={150} height={40} className="mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton height={300} />
            <Skeleton count={4} className="mt-4" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton height={150} />
            <Skeleton height={200} />
            <Skeleton height={60} />
          </div>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{productError || "Product not found"}</p>
          <div className="space-x-4">
            <button
              onClick={refetch}
              className="button-transition px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate(ROUTES.MARKETPLACE)}
              className="button-transition px-4 py-2 text-emerald-600 hover:text-emerald-700"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const seller = product.type === "sell" ? product.farmer : product.buyer;
  const sellerName =
    product.type === "sell"
      ? product.farmer?.name || "Unknown Farmer"
      : product.buyer?.company_name || "Unknown Buyer";

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style>{customStyles}</style>
      <div className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
        {state.error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md flex items-center justify-between text-sm">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {state.error}
            </div>
            <button
              onClick={() => setState((prev) => ({ ...prev, error: null }))}
              className="text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        <button
          onClick={() => navigate(ROUTES.MARKETPLACE)}
          className="button-transition inline-flex items-center mb-6 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow transition-all duration-200 transform hover:scale-[1.02]"
          aria-label="Back to Marketplace"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] overflow-hidden">
            <div className="aspect-square relative">
              {state.productImgError || !product.image_url ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="h-20 w-20 text-gray-400" />
                </div>
              ) : (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => handleImageError("product")}
                />
              )}
              <div
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${
                  product.type === "sell" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {product.type === "sell" ? "Selling" : "Buying"}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center space-x-4 mb-6">
                <button
                  className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden ring-2 ring-emerald-500 ring-offset-2 transition-transform hover:scale-105"
                  aria-label={`View profile of ${sellerName}`}
                >
                  {state.profileImgError || !seller?.profile_photo_url ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  ) : (
                    <img
                      src={seller.profile_photo_url}
                      alt={sellerName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => handleImageError("profile")}
                    />
                  )}
                </button>
                <div>
                  <h3 className="font-medium text-gray-900 text-lg">{sellerName}</h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span>4.8</span>
                  </div>
                </div>
              </div>

              {product.type === "sell" && product.farmer ? (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.farmer.complete_address || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Land Type</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.farmer.land_type || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Land Size</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.farmer.land_size ? `${product.farmer.land_size} acres` : "Not specified"}
                    </p>
                  </div>
                </div>
              ) : (
                product.type === "buy" &&
                product.buyer && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Business Address</p>
                      <p className="text-sm font-medium text-gray-900">
                        {product.buyer.business_address || "Not specified"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Business Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {product.buyer.business_type || "Not specified"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Storage Capacity</p>
                      <p className="text-sm font-medium text-gray-900">
                        {product.buyer.storage_capacity
                          ? `${product.buyer.storage_capacity} units`
                          : "Not specified"}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01]">
              <div className="flex items-start p-6 border-b border-gray-100">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h1>
                  <p className="text-sm text-gray-500">Product ID: {id}</p>
                  {product.contract_id && (
                    <p className="text-sm text-gray-500">Contract ID: {product.contract_id}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 px-3 py-1 bg-blue-50 rounded-full">
                    <User className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-blue-600">
                      Verified {product.type === "sell" ? "Farmer" : "Buyer"}
                    </span>
                  </div>
                  <button
                    onClick={initiateChat}
                    className="button-transition flex items-center space-x-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disableChat}
                    title={disableChat ? "You cannot message this listing" : undefined}
                    aria-label={`Message ${product.type === "sell" ? "Farmer" : "Buyer"}`}
                  >
                    {chatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    <span>Message {product.type === "sell" ? "Farmer" : "Buyer"}</span>
                  </button>
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6 text-sm">
  <div className="space-y-2">
    <div className="text-sm text-gray-500">Price</div>
    <div className="text-2xl font-bold text-emerald-600">
      {product.type === "buy" ? (
        // For "buy" listings, price is in INR, convert to ETH for display
        `₹${product.price.toFixed(2)} (${(product.price / state.ethPriceInINR).toFixed(6)} ETH)/${product.unit}`
      ) : (
        // For "sell" listings, keep original logic (assuming price in ETH)
        `₹${displayAmountInINR(product.price)} (${product.price} ETH)/${product.unit}`
      )}
    </div>
  </div>
  <div className="space-y-2">
    <div className="text-sm text-gray-500">Quantity</div>
    <div className="text-2xl font-semibold text-gray-900">
      {product.quantity} {product.unit}
    </div>
  </div>
</div>

<div className="p-6 text-right border-t border-gray-100">
  <p className="text-gray-500">Total Contract Value</p>
  <p className="text-lg font-bold text-gray-900">
    {product.type === "buy" ? (
      // Total in INR for "buy"
      `₹${(product.price * product.quantity).toFixed(2)}`
    ) : (
      // Total in INR for "sell" (assuming price in ETH)
      `₹${displayAmountInINR(product.price * product.quantity)}`
    )}
  </p>
</div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-md font-semibold text-gray-900 mb-3 transition-colors duration-300 hover:text-gray-700">
                    Product Specifications
                  </h2>
                  <ul className="space-y-2 text-gray-600 list-item-hover">
                    <li>Category: {product.category}</li>
                    <li>Moisture Content: {product.moisture_content || "Not specified"}</li>
                    <li>Protein Level: {product.protein_level || "Not specified"}</li>
                    <li>Origin: {product.origin || "Not specified"}</li>
                    <li>Harvest Year: {product.harvest_year || "Not specified"}</li>
                    <li>Certification: {product.certification || "Not specified"}</li>
                  </ul>
                </div>
                <div>
                  <h2 className="text-md font-semibold text-gray-900 mb-3 transition-colors duration-300 hover:text-gray-700">
                    Delivery Terms
                  </h2>
                  <ul className="space-y-2 text-gray-600 list-item-hover">
                    <li>
                      Delivery Method:{" "}
                      {state.contractDetails?.delivery_method ||
                        (product.type === "sell" ? "To be set by buyer" : "Pickup")}
                    </li>
                    <li>
                      Delivery Location:{" "}
                      {state.contractDetails?.delivery_location || product.location}
                    </li>
                    <li>
                      Start Date:{" "}
                      {state.contractDetails?.start_date
                        ? new Date(state.contractDetails.start_date).toLocaleDateString()
                        : "Upon Agreement"}
                    </li>
                    <li>
                      End Date:{" "}
                      {state.contractDetails?.end_date
                        ? new Date(state.contractDetails.end_date).toLocaleDateString()
                        : "30 days from agreement"}
                    </li>
                    <li>
                      Additional Notes:{" "}
                      {state.contractDetails?.additional_notes || product.description || "None"}
                    </li>
                    <li>Shipping Terms: {product.shipping_terms || "Not specified"}</li>
                    <li>
                      Required Documentation:
                      <ul className="list-disc list-inside mt-1">
                        {product.required_docs?.length ? (
                          product.required_docs.map((doc, index) => (
                            <li key={index}>{doc}</li>
                          ))
                        ) : (
                          <li>None</li>
                        )}
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 p-6">
              <button
                onClick={handleActionClick}
                className="button-transition w-full flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canTakeAction || state.actionLoading}
                title={
                  !canTakeAction
                    ? "You cannot take action on this listing"
                    : state.actionLoading
                    ? "Processing..."
                    : undefined
                }
                aria-label={buttonText}
              >
                {state.actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  buttonIcon
                )}
                {buttonText}
              </button>
            </div>

            {state.contractDetails && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 p-6">
                <h2 className="text-md font-semibold text-gray-900 mb-3">Contract Status</h2>
                <ul className="space-y-2 text-gray-600">
                  <li>Status: {state.contractDetails.status}</li>
                  <li>Escrow Balance: {state.contractDetails.escrow_balance_eth} ETH</li>
                  <li>Farmer Confirmed Delivery: {state.contractDetails.farmer_confirmed_delivery ? "Yes" : "No"}</li>
                  <li>Buyer Confirmed Receipt: {state.contractDetails.buyer_confirmed_receipt ? "Yes" : "No"}</li>
                  <li>Buyer ID: {state.contractDetails.buyer_id || "Not yet accepted"}</li>
                  <li>Farmer ID: {state.contractDetails.farmer_id || "Not yet accepted"}</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogBox
          isOpen={state.showActionForm}
          onClose={() => setState((prev) => ({ ...prev, showActionForm: false }))}
          title="Confirm Purchase"
          contentClassName="dialog-content"
          loading={state.actionLoading}
          footer={
            <div className="dialog-footer">
              <button
                onClick={() => setState((prev) => ({ ...prev, showActionForm: false }))}
                className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                disabled={state.actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="action-form"
                className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm flex items-center"
                disabled={state.actionLoading}
              >
                {state.actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Confirm Purchase
              </button>
            </div>
          }
        >
          <form id="action-form" onSubmit={handleActionSubmit} className="space-y-4">
            <div>
              <label htmlFor="delivery_method" className="block text-sm font-medium text-gray-700">
                Delivery Method
              </label>
              <select
                id="delivery_method"
                name="delivery_method"
                value={state.actionFormData.delivery_method}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    actionFormData: { ...prev.actionFormData, delivery_method: e.target.value },
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
            <div>
              <label htmlFor="delivery_location" className="block text-sm font-medium text-gray-700">
                Delivery Location
              </label>
              <input
                type="text"
                id="delivery_location"
                name="delivery_location"
                value={state.actionFormData.delivery_location}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    actionFormData: { ...prev.actionFormData, delivery_location: e.target.value },
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="e.g., Your warehouse address"
                required
              />
            </div>
            <div>
              <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                id="additional_notes"
                name="additional_notes"
                value={state.actionFormData.additional_notes}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    actionFormData: { ...prev.actionFormData, additional_notes: e.target.value },
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="e.g., Preferred delivery time"
                rows={3}
              />
            </div>
          </form>
        </DialogBox>

        {showChat && seller && currentUserId && chatId && (
          <ChatWindow
            chatId={chatId}
            currentUserId={currentUserId}
            otherUser={{ name: sellerName, image: seller.profile_photo_url || "" }}
            productId={id}
            onClose={closeChat}
          />
        )}
      </div>
    </div>
  );
}

export default ProductDetails;