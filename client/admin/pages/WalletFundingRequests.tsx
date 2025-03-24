import React, { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, Eye, X, Trash2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExtendedWalletFundingRequest {
  id: string;
  user_id: string;
  wallet_id: string;
  amount_usdt: number;
  amount_inr: number;
  txid: string | null;
  payment_proof_url: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
  user_email: string;
  user_metadata: { type: "farmer" | "buyer" | "admin" | undefined };
  farmer_name?: string;
  buyer_company_name?: string;
  wallet_address: string;
  token_balance: number;
}

const STATUS_COLORS = {
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  PENDING: "bg-amber-100 text-amber-800",
} as const;

const formatWalletAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "N/A";

const formatRole = (request: ExtendedWalletFundingRequest) => {
  const { user_metadata, farmer_name, buyer_company_name } = request;
  switch (user_metadata.type) {
    case "farmer": return `Farmer - ${farmer_name || "N/A"}`;
    case "buyer": return `Buyer - ${buyer_company_name || "N/A"}`;
    case "admin": return "Admin";
    default: return "Unknown";
  }
};

const RequestTable = memo(({ 
  requests, 
  onView, 
  onApprove, 
  onReject, 
  showActions 
}: {
  requests: ExtendedWalletFundingRequest[];
  onView: (request: ExtendedWalletFundingRequest) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions: boolean;
}) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
        <tr>
          {["Date", "User", "Role", "Wallet Address", "Amount", "Status", "Actions"].map(header => (
            <th 
              key={header}
              className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider transition-all duration-300 hover:text-gray-900"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {requests.map((request) => (
          <motion.tr 
            key={request.id}
            className="hover:bg-gray-50 transition-all duration-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {new Date(request.created_at).toLocaleString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium group-hover:text-indigo-600 transition-colors">
              {request.user_email}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {formatRole(request)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 hover:text-gray-800 transition-colors">
              {formatWalletAddress(request.wallet_address)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
              ${request.amount_usdt} USDT
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.status]} transform transition-all hover:scale-105`}>
                {request.status}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onView(request)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Eye className="h-5 w-5" />
                </motion.button>
                {showActions && request.status === "PENDING" && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onApprove?.(request.id)}
                      className="text-emerald-600 hover:text-emerald-800 transition-colors"
                    >
                      <Check className="h-5 w-5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onReject?.(request.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </motion.button>
                  </>
                )}
              </div>
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  </div>
));

const DetailSection = memo(({ title, items }: { title: string; items: { label: string; value: string; mono?: boolean }[] }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
  >
    <h4 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
      {title}
    </h4>
    <div className="space-y-4">
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        >
          <span className="font-medium text-gray-900 text-sm mb-1 sm:mb-0">{item.label}:</span>
          <span 
            className={`text-sm ${item.mono 
              ? "font-mono bg-gray-200 px-2 py-1 rounded-md break-all w-full sm:w-auto max-w-full" 
              : "text-gray-700"}`}
          >
            {item.mono ? item.value : item.value}
          </span>
        </motion.div>
      ))}
    </div>
  </motion.div>
));

export default function WalletFundingRequests() {
  const [requests, setRequests] = useState<ExtendedWalletFundingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ExtendedWalletFundingRequest | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("wallet_funding_request_details")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((request) => ({
        ...request,
        user_email: request.user_email || "N/A",
        user_metadata: { type: request.user_metadata?.type || undefined },
        farmer_name: request.farmer_name,
        buyer_company_name: request.buyer_company_name,
        wallet_address: request.wallet_address || "N/A",
        token_balance: request.usdt_balance || 0,
      }));

      setRequests(transformedData);
      setError(null);
    } catch (error) {
      console.error("Error loading requests:", error);
      setError(error instanceof Error ? error.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    try {
      setError(null);
      const request = requests.find(r => r.id === id);
      if (!request || request.status !== "PENDING") {
        setError("Request already processed");
        return;
      }

      const { error: rpcError } = await supabase.rpc("approve_funding_request", {
        p_request_id: id,
        p_wallet_id: request.wallet_id,
        p_amount: request.amount_usdt,
        p_txid: request.txid,
      });

      if (rpcError) throw new Error(rpcError.message);

      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: "APPROVED", updated_at: new Date().toISOString() } : req
      ));
    } catch (error) {
      console.error("Approval Error:", error);
      setError(error instanceof Error ? error.message : "Failed to approve request");
    }
  }, [requests]);

  const handleReject = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to reject this request?")) return;

    try {
      setError(null);
      const { error } = await supabase
        .from("wallet_funding_requests")
        .update({ 
          status: "REJECTED",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: "REJECTED", updated_at: new Date().toISOString() } : req
      ));
    } catch (error) {
      console.error("Error rejecting request:", error);
      setError(error instanceof Error ? error.message : "Failed to reject request");
    }
  }, [requests]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const processedRequests = requests.filter(r => r.status !== "PENDING");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-gray-900 mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600"
        >
          Wallet Funding Dashboard
        </motion.h1>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 shadow-md"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Pending Requests</h2>
          <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <RequestTable 
              requests={pendingRequests}
              onView={setSelectedRequest}
              onApprove={handleApprove}
              onReject={handleReject}
              showActions={true}
            />
          </motion.div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Processed Requests</h2>
          <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <RequestTable 
              requests={processedRequests}
              onView={setSelectedRequest}
              showActions={false}
            />
          </motion.div>
        </section>

        <AnimatePresence>
          {selectedRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto relative"
              >
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900">Request Details</h3>
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    onClick={() => setSelectedRequest(null)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-7 h-7" />
                  </motion.button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <DetailSection title="User Details" items={[
                      { label: "Email", value: selectedRequest.user_email },
                      { label: "Role", value: selectedRequest.user_metadata.type || "Unknown" },
                      { label: "Name", value: formatRole(selectedRequest) },
                    ]} />
                    <DetailSection title="Wallet Details" items={[
                      { label: "Address", value: selectedRequest.wallet_address, mono: true },
                      { label: "Balance", value: `${selectedRequest.token_balance} USDT` },
                    ]} />
                    <DetailSection title="Request Details" items={[
                      { label: "Amount (USDT)", value: `$${selectedRequest.amount_usdt}` },
                      { label: "Amount (INR)", value: `₹${selectedRequest.amount_inr}` },
                      { label: "Transaction ID", value: selectedRequest.txid || "N/A" },
                      { label: "Status", value: selectedRequest.status },
                      { label: "Date", value: new Date(selectedRequest.created_at).toLocaleString() },
                    ]} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Payment Proof</h4>
                    {selectedRequest.payment_proof_url ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <img
                          src={selectedRequest.payment_proof_url}
                          alt="Payment proof"
                          className="w-full rounded-xl shadow-lg object-contain max-h-96 hover:scale-105 transition-transform duration-300"
                        />
                        <a
                          href={selectedRequest.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          View Full Image
                        </a>
                      </motion.div>
                    ) : (
                      <p className="text-gray-500 italic">No payment proof uploaded</p>
                    )}
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedRequest(null)}
                    className="px-6 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all shadow-md"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}