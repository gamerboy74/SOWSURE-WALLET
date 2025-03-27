import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useWallet } from "../../hooks/useWallet";
import { WalletService } from "../../services/wallet.service";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/AgriculturalContract";
import { Loader2, AlertCircle, Truck, CheckCircle, Gavel, Package, UserCheck, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

interface Contract {
  amount: string;
  id: string;
  contract_id: string;
  farmer_id: string | null;
  buyer_id: string | null;
  product_id: string | null;
  crop_name: string;
  quantity: number;
  amount_eth: string;
  advance_amount_eth: string;
  start_date: string;
  end_date: string;
  delivery_method: string;
  delivery_location: string;
  additional_notes: string;
  status: string;
  escrow_balance_eth: string;
  farmer_confirmed_delivery: boolean;
  buyer_confirmed_receipt: boolean;
  is_buyer_initiated: boolean;
  blockchain_tx_hash: string;
  contract_address: string;
  confirmation_deadline: string | null;
}

interface ContractsState {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  userId: string | null;
  userRole: "farmer" | "buyer" | null;
  farmerId: string | null;
  buyerId: string | null;
}

const Contracts: React.FC = () => {
  const [state, setState] = useState<ContractsState>({
    contracts: [],
    loading: true,
    error: null,
    userId: null,
    userRole: null,
    farmerId: null,
    buyerId: null,
  });
  const { address, prices } = useWallet();

  // Fetch user ID and role (farmer or buyer)
  useEffect(() => {
    const fetchUserIdAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState((prev) => ({ ...prev, error: "No authenticated user", loading: false }));
        return;
      }

      const { data: farmer } = await supabase
        .from("farmers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: buyer } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setState((prev) => ({
        ...prev,
        userId: user.id,
        userRole: farmer ? "farmer" : buyer ? "buyer" : null,
        farmerId: farmer?.id || null,
        buyerId: buyer?.id || null,
      }));
    };
    fetchUserIdAndRole();
  }, []);

  // Load contracts and fetch their status dynamically from the blockchain
  const loadContracts = useCallback(async () => {
    if (!state.userId || !state.userRole) return;
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Build the query to fetch contracts
      let query = supabase.from("smart_contracts").select("*");
      if (state.userRole === "farmer" && state.farmerId) {
        query = query.or(`farmer_id.eq.${state.farmerId},buyer_id.eq.${state.farmerId}`);
      } else if (state.userRole === "buyer" && state.buyerId) {
        query = query.or(`buyer_id.eq.${state.buyerId},farmer_id.eq.${state.buyerId}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch the contract status dynamically from the blockchain
      const provider = WalletService.provider || new ethers.JsonRpcProvider("http://localhost:8545");
      const blockchainContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const updatedContracts = await Promise.all(
        data.map(async (contractData: Contract) => {
          try {
            const contractDetails = await blockchainContract.getContractDetails(contractData.contract_id);
            const onChainStatus = contractDetails.status.status.toString();
            const statusMap: { [key: string]: string } = {
              "0": "PENDING",
              "1": "FUNDED",
              "2": "IN_PROGRESS",
              "3": "DELIVERED",
              "4": "COMPLETED",
              "5": "CANCELLED",
              "6": "DISPUTED",
              "7": "RESOLVED",
            };
            const mappedStatus = statusMap[onChainStatus] || contractData.status;

            // Log contract details for debugging
            console.log(`Contract ID ${contractData.contract_id}:`, {
              onChainStatus,
              mappedStatus,
              databaseStatus: contractData.status,
              farmerId: contractData.farmer_id,
              buyerId: contractData.buyer_id,
              isBuyerInitiated: contractData.is_buyer_initiated,
            });

            // Update the contract status in Supabase if it has changed
            if (contractData.status !== mappedStatus) {
              const { error: updateError } = await supabase
                .from("smart_contracts")
                .update({ status: mappedStatus })
                .eq("contract_id", contractData.contract_id);
              if (updateError) {
                console.error(`Error updating contract status for ID ${contractData.contract_id}:`, updateError);
              }
            }

            return { ...contractData, status: mappedStatus };
          } catch (err) {
            console.error(`Error fetching contract details for ID ${contractData.contract_id}:`, err);
            return contractData;
          }
        })
      );

      setState((prev) => ({ ...prev, contracts: updatedContracts || [], loading: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load contracts",
        loading: false,
      }));
    }
  }, [state.userId, state.userRole, state.farmerId, state.buyerId]);

  // Load contracts initially and set up real-time subscription
  useEffect(() => {
    if (state.userId && state.userRole) {
      loadContracts();

      // Set up real-time subscription for smart_contracts updates
      const subscription = supabase
        .channel("smart_contracts")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "smart_contracts" },
          (payload) => {
            console.log("Smart contract updated:", payload);
            loadContracts();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [state.userId, state.userRole, loadContracts]);

  // Handle Confirm Delivery (Farmer action)
  const handleConfirmDelivery = async (contract: Contract) => {
    if (state.userRole !== "farmer" || contract.farmer_id !== state.farmerId) return;
    try {
      const walletInfo = await WalletService.getWalletInfo();
      if (!walletInfo) throw new Error("No wallet found");

      const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
      const ethersContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

      const tx = await ethersContract.confirmDelivery(contract.contract_id);
      await tx.wait();

      const { error: rpcError } = await supabase.rpc("sync_confirm_delivery", {
        p_contract_id: Number(contract.contract_id),
        p_tx_hash: tx.hash,
      });
      if (rpcError) throw new Error(`RPC sync_confirm_delivery error: ${rpcError.message}`);

      // Insert notification for the buyer
      const { data: buyerData } = await supabase
        .from("buyers")
        .select("user_id")
        .eq("id", contract.buyer_id)
        .single();
      if (buyerData) {
        await supabase.from("notifications").insert({
          user_id: buyerData.user_id,
          contract_id: Number(contract.contract_id),
          title: "Delivery Confirmed",
          message: `Farmer confirmed delivery for contract #${contract.contract_id}. Please confirm receipt within 7 days.`,
          type: "order",
          data: { contract_id: contract.contract_id },
          created_at: new Date().toISOString(),
        });
      }

      toast.success(`Delivery confirmed for contract #${contract.contract_id}`);
      await loadContracts();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to confirm delivery",
      }));
    }
  };

  // Handle Confirm Receipt (Buyer action)
  const handleConfirmReceipt = async (contract: Contract) => {
    if (state.userRole !== "buyer" || contract.buyer_id !== state.buyerId) return;
    try {
      const walletInfo = await WalletService.getWalletInfo();
      if (!walletInfo) throw new Error("No wallet found");

      const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
      const ethersContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

      const tx = await ethersContract.confirmReceipt(contract.contract_id);
      await tx.wait();

      const { error: rpcError } = await supabase.rpc("sync_confirm_receipt", {
        p_contract_id: Number(contract.contract_id),
        p_tx_hash: tx.hash,
      });
      if (rpcError) throw new Error(`RPC sync_confirm_receipt error: ${rpcError.message}`);

      // Update the product status based on the contract type
      if (contract.product_id) {
        const { data: product } = await supabase
          .from("products")
          .select("type")
          .eq("id", contract.product_id)
          .single();
        if (product) {
          const newStatus = product.type === "sell" ? "sold_out" : "fulfilled";
          await supabase
            .from("products")
            .update({ status: newStatus })
            .eq("id", contract.product_id);
        }
      }

      // Insert notifications for both farmer and buyer
      const { data: farmerData } = await supabase
        .from("farmers")
        .select("user_id")
        .eq("id", contract.farmer_id)
        .single();
      const { data: buyerData } = await supabase
        .from("buyers")
        .select("user_id")
        .eq("id", contract.buyer_id)
        .single();

      if (farmerData) {
        const amountEth = parseFloat(contract.amount_eth) - parseFloat(contract.amount_eth) * 0.05; // After 5% platform fee
        await supabase.from("notifications").insert({
          user_id: farmerData.user_id,
          contract_id: Number(contract.contract_id),
          title: "Payment Released",
          message: `Payment for contract #${contract.contract_id} has been released minus platform fee.`,
          type: "payment",
          data: { contract_id: contract.contract_id, amount_eth: amountEth.toString() },
          created_at: new Date().toISOString(),
        });
      }
      if (buyerData) {
        await supabase.from("notifications").insert({
          user_id: buyerData.user_id,
          contract_id: Number(contract.contract_id),
          title: "Receipt Confirmed",
          message: `You confirmed receipt for contract #${contract.contract_id}. Transaction completed.`,
          type: "order",
          data: { contract_id: contract.contract_id },
          created_at: new Date().toISOString(),
        });
      }

      toast.success(`Receipt confirmed for contract #${contract.contract_id}`);
      await loadContracts();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to confirm receipt",
      }));
    }
  };

  // Handle Claim Remaining (Farmer action after timeout)
  const handleClaimRemaining = async (contract: Contract) => {
    if (state.userRole !== "farmer" || contract.farmer_id !== state.farmerId) return;
    try {
      const walletInfo = await WalletService.getWalletInfo();
      if (!walletInfo) throw new Error("No wallet found");

      const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
      const ethersContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

      const tx = await ethersContract.claimRemainingAfterTimeout(contract.contract_id);
      await tx.wait();

      const { error: rpcError } = await supabase.rpc("sync_claim_remaining_after_timeout", {
        p_contract_id: Number(contract.contract_id),
        p_tx_hash: tx.hash,
      });
      if (rpcError) throw new Error(`RPC sync_claim_remaining_after_timeout error: ${rpcError.message}`);

      // Update the product status
      if (contract.product_id) {
        const { data: product } = await supabase
          .from("products")
          .select("type")
          .eq("id", contract.product_id)
          .single();
        if (product) {
          const newStatus = product.type === "sell" ? "sold_out" : "fulfilled";
          await supabase
            .from("products")
            .update({ status: newStatus })
            .eq("id", contract.product_id);
        }
      }

      // Insert notification for the farmer
      const { data: farmerData } = await supabase
        .from("farmers")
        .select("user_id")
        .eq("id", contract.farmer_id)
        .single();
      if (farmerData) {
        const amountEth = parseFloat(contract.escrow_balance_eth) - parseFloat(contract.amount_eth) * 0.05; // After 5% platform fee
        await supabase.from("notifications").insert({
          user_id: farmerData.user_id,
          contract_id: Number(contract.contract_id),
          title: "Funds Claimed",
          message: `Remaining funds for contract #${contract.contract_id} claimed after timeout.`,
          type: "payment",
          data: { contract_id: contract.contract_id, amount_eth: amountEth.toString() },
          created_at: new Date().toISOString(),
        });
      }

      toast.success(`Remaining funds claimed for contract #${contract.contract_id}`);
      await loadContracts();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to claim remaining funds",
      }));
    }
  };

  // Handle Raise Dispute (Available to both farmer and buyer)
  const handleRaiseDispute = async (contract: Contract) => {
    if (
      (state.userRole === "farmer" && contract.farmer_id !== state.farmerId) ||
      (state.userRole === "buyer" && contract.buyer_id !== state.buyerId)
    ) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const walletInfo = await WalletService.getWalletInfo();
      if (!walletInfo) throw new Error("No wallet found");

      const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
      const ethersContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

      const tx = await ethersContract.raiseDispute(contract.contract_id);
      await tx.wait();

      const { error: rpcError } = await supabase.rpc("sync_raise_dispute", {
        p_contract_id: Number(contract.contract_id),
        p_raised_by: user.id,
        p_reason: "Delivery issue", // Could be dynamic from UI
        p_tx_hash: tx.hash,
      });
      if (rpcError) throw new Error(`RPC sync_raise_dispute error: ${rpcError.message}`);

      // Insert notification for the user who raised the dispute
      await supabase.from("notifications").insert({
        user_id: user.id,
        contract_id: Number(contract.contract_id),
        title: "Dispute Raised",
        message: `You raised a dispute for contract #${contract.contract_id}.`,
        type: "dispute",
        data: { contract_id: contract.contract_id, reason: "Delivery issue" },
        created_at: new Date().toISOString(),
      });

      toast.success(`Dispute raised for contract #${contract.contract_id}`);
      await loadContracts();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to raise dispute",
      }));
    }
  };

  // Determine who accepted the contract
  const getAcceptanceStatus = (contract: Contract) => {
    if (contract.status === "FUNDED") {
      return contract.is_buyer_initiated ? "Accepted by Farmer" : "Accepted by Buyer";
    }
    if (contract.status === "PENDING") return "Awaiting Acceptance";
    if (contract.is_buyer_initiated) {
      return contract.farmer_id ? "Accepted by Farmer" : "Awaiting Farmer Acceptance";
    } else {
      return contract.buyer_id ? "Accepted by Buyer" : "Awaiting Buyer Acceptance";
    }
  };

  // Split contracts into two categories
  const createdContracts = state.contracts.filter((contract) =>
    state.userRole === "farmer"
      ? contract.farmer_id === state.farmerId && !contract.is_buyer_initiated
      : contract.buyer_id === state.buyerId && contract.is_buyer_initiated
  );

  const acceptedContracts = state.contracts.filter((contract) =>
    state.userRole === "farmer"
      ? contract.farmer_id === state.farmerId && contract.is_buyer_initiated
      : contract.buyer_id === state.buyerId && !contract.is_buyer_initiated
  );

  if (state.loading) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  if (!state.userRole) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          You must be registered as a farmer or buyer to view contracts.
        </div>
      </div>
    );
  }

  const renderContractCard = (contract: Contract) => (
    <div
      key={contract.id}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
    >
      {/* Card Header */}
      <div className="bg-gray-100 p-4 flex items-center space-x-3">
        <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
          <Package className="h-6 w-6 text-gray-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{contract.crop_name}</h2>
          <p className="text-sm text-gray-500">Contract #{contract.contract_id}</p>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-600">Quantity:</span>
          <span className="text-sm text-gray-800">{contract.quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-600">Amount:</span>
          <span className="text-sm text-gray-800">
            ₹{(parseFloat(contract.amount_eth) * prices.eth).toFixed(2)} ({contract.amount_eth} ETH)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-600">Advance:</span>
          <span className="text-sm text-gray-800">
            ₹{(parseFloat(contract.advance_amount_eth) * prices.eth).toFixed(2)} ({contract.advance_amount_eth} ETH)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-600">Escrow:</span>
          <span className="text-sm text-gray-800">
            ₹{(parseFloat(contract.escrow_balance_eth) * prices.eth).toFixed(2)} ({contract.escrow_balance_eth} ETH)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          <span
            className={`text-sm font-semibold ${
              contract.status === "COMPLETED"
                ? "text-green-600"
                : contract.status === "DISPUTED" || contract.status === "CANCELLED"
                ? "text-red-600"
                : "text-blue-600"
            }`}
          >
            {contract.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-600">Acceptance:</span>
          <span
            className={`text-sm font-semibold flex items-center ${
              contract.status === "PENDING" ? "text-gray-500" : "text-green-600"
            }`}
          >
            <UserCheck className="h-4 w-4 mr-1" />
            {getAcceptanceStatus(contract)}
          </span>
        </div>
        {contract.confirmation_deadline && (
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Confirmation Deadline:</span>
            <span className="text-sm text-gray-800">
              {new Date(contract.confirmation_deadline).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer (Action Buttons) */}
      <div className="p-4 bg-gray-50 border-t flex flex-wrap gap-2">
        {contract.status === "FUNDED" && state.userRole === "farmer" && contract.farmer_id === state.farmerId && (
          <button
            onClick={() => handleConfirmDelivery(contract)}
            className="flex items-center px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
          >
            <Truck className="h-4 w-4 mr-1" /> Confirm Delivery
          </button>
        )}
        {contract.status === "IN_PROGRESS" && state.userRole === "buyer" && contract.buyer_id === state.buyerId && (
          <button
            onClick={() => handleConfirmReceipt(contract)}
            className="flex items-center px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-sm"
          >
            <CheckCircle className="h-4 w-4 mr-1" /> Confirm Receipt
          </button>
        )}
        {contract.status === "IN_PROGRESS" &&
          state.userRole === "farmer" &&
          contract.farmer_id === state.farmerId &&
          contract.confirmation_deadline &&
          new Date(contract.confirmation_deadline) < new Date() && (
            <button
              onClick={() => handleClaimRemaining(contract)}
              className="flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Claim Remaining
            </button>
          )}
        {["FUNDED", "IN_PROGRESS"].includes(contract.status) &&
          ((state.userRole === "farmer" && contract.farmer_id === state.farmerId) ||
            (state.userRole === "buyer" && contract.buyer_id === state.buyerId)) && (
            <button
              onClick={() => handleRaiseDispute(contract)}
              className="flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
            >
              <Gavel className="h-4 w-4 mr-1" /> Raise Dispute
            </button>
          )}
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Contracts</h1>
        <button
          onClick={loadContracts}
          className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </button>
      </div>
      {state.error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {state.error}
          </div>
          <button
            onClick={() => {
              setState((prev) => ({ ...prev, error: null }));
              loadContracts();
            }}
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Contracts Created by Me */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Contracts Created by Me</h2>
        {createdContracts.length === 0 ? (
          <div className="text-center text-gray-500">No contracts created by you.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {createdContracts.map(renderContractCard)}
          </div>
        )}
      </div>

      {/* Contracts Accepted */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Contracts Accepted</h2>
        {acceptedContracts.length === 0 ? (
          <div className="text-center text-gray-500">No contracts accepted by you.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {acceptedContracts.map(renderContractCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contracts;