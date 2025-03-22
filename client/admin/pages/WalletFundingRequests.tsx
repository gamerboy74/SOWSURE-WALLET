import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, Eye, X, Trash2, Check } from "lucide-react";
import type { WalletFundingRequest } from "../../types/types";

export default function WalletFundingRequests() {
  const [requests, setRequests] = useState<WalletFundingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<WalletFundingRequest | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      // Fetch requests with user details
      const { data, error } = await supabase
        .from("wallet_funding_request_details")
        .select(
          `
          *,
          user_email,
          user_metadata,
          farmer_name,
          buyer_company_name,
          wallet_address,
          token_balance
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((request) => ({
        ...request,
        user_details: {
          email: request.user_email,
          user_metadata: request.user_metadata,
          name: request.farmer_name || request.buyer_company_name || "N/A",
        },
        wallet: {
          wallet_address: request.wallet_address,
          token_balance: request.token_balance,
        },
      }));

      setRequests(transformedData);
      setError(null);
    } catch (error) {
      console.error("Error loading requests:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load requests"
      );
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (id: string) => {
    try {
      setError(null);
      setLoading(true);

      // First check admin status and get request details
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.type !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get request details
      const { data: request, error: requestError } = await supabase
        .from("wallet_funding_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (requestError) throw requestError;
      if (!request) throw new Error("Request not found");

      // Add funds directly without intermediate state
      const { data: result, error: rpcError } = await supabase
        .rpc("add_wallet_funds", {
          p_wallet_id: request.wallet_id,
          p_amount: request.amount_usdt
        });

      if (rpcError) throw rpcError;
      if (!result) throw new Error("Failed to add funds");

      // Update to approved status
      await supabase
        .from("wallet_funding_requests")
        .update({ 
          status: "APPROVED",
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .throwOnError();

      // Refresh the requests list
      await loadRequests();

    } catch (error) {
      console.error("Error approving request:", error);
      setError(error instanceof Error ? error.message : "Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Are you sure you want to reject this request?"))
      return;

    try {
      const { error } = await supabase
        .from("wallet_funding_requests")
        .update({ status: "REJECTED" })
        .eq("id", id);

      if (error) throw error;
      loadRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      setError(
        error instanceof Error ? error.message : "Failed to reject request"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Wallet Funding Requests
      </h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Wallet Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.user_details?.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.user_metadata?.type === "farmer"
                      ? `Farmer - ${request.farmer_name || "N/A"}`
                      : `Buyer - ${request.buyer_company_name || "N/A"}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {request.wallet?.wallet_address
                      ? `${request.wallet.wallet_address.slice(
                          0,
                          6
                        )}...${request.wallet.wallet_address.slice(-4)}`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${request.amount_usdt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${
                        request.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : request.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {request.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Funding Request Details</h3>
              <button onClick={() => setSelectedRequest(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    User Details
                  </h4>
                  <p className="mt-1">
                    Email: {selectedRequest.user_details?.email}
                  </p>
                  <p className="mt-1">
                    Role: {selectedRequest.user_metadata?.type}
                  </p>
                  <p className="mt-1">
                    Name:{" "}
                    {selectedRequest.user_metadata?.type === "farmer"
                      ? selectedRequest.farmer_name
                      : selectedRequest.buyer_company_name}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Wallet Details
                  </h4>
                  <p className="mt-1 font-mono">
                    Address: {selectedRequest.wallet?.wallet_address}
                  </p>
                  <p className="mt-1">
                    Current Balance: {selectedRequest.wallet?.token_balance}{" "}
                    USDT
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Request Details
                  </h4>
                  <p className="mt-1">
                    Amount (USDT): ${selectedRequest.amount_usdt}
                  </p>
                  <p className="mt-1">
                    Amount (INR): ₹{selectedRequest.amount_inr}
                  </p>
                  <p className="mt-1">Transaction ID: {selectedRequest.txid}</p>
                  <p className="mt-1">Status: {selectedRequest.status}</p>
                  <p className="mt-1">
                    Date:{" "}
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Payment Proof
                </h4>
                {selectedRequest.payment_proof_url ? (
                  <div className="relative">
                    <img
                      src={selectedRequest.payment_proof_url}
                      alt="Payment proof"
                      className="w-full rounded-lg shadow-lg"
                    />
                    <a
                      href={selectedRequest.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                    >
                      View Full Image
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">
                    No payment proof uploaded
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
