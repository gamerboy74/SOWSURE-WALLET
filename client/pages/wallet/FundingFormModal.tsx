// FundingFormModal.tsx
import React, { useState } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { X, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Wallet } from "../../types/types";

interface FundingFormModalProps {
  wallet: Wallet;
  prices: { usdt: number };
  onClose: () => void;
  onSubmit: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const FundingFormModal = React.memo(
  ({ wallet, prices, onClose, onSubmit, setError }: FundingFormModalProps) => {
    const [formData, setFormData] = useState({
      amount_usdt: "",
      txid: "",
      payment_proof_url: "",
    });
    const [uploading, setUploading] = useState(false);
    const gpayUpiId = "omkr2355-2@oksbi";

    const handleFileUpload = async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      try {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split(".").pop();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        setUploading(true);
        setError(null);

        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);

        setFormData({ ...formData, payment_proof_url: publicUrl });
      } catch (err) {
        console.error("Error uploading proof:", err);
        setError(
          err instanceof Error ? err.message : "Failed to upload proof"
        );
      } finally {
        setUploading(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        const amount_usdt = parseFloat(formData.amount_usdt);
        if (isNaN(amount_usdt) || amount_usdt <= 0) {
          throw new Error("Please enter a valid amount");
        }

        const { error: fundingError } = await supabase
          .from("wallet_funding_requests")
          .insert([
            {
              user_id: user.id,
              wallet_id: wallet.id,
              amount_usdt,
              amount_inr: amount_usdt * prices.usdt,
              txid: formData.txid,
              payment_proof_url: formData.payment_proof_url,
              status: "PENDING",
            },
          ]);

        if (fundingError) throw fundingError;

        const { error: txError } = await supabase
          .from("wallet_transactions")
          .insert([
            {
              wallet_id: wallet.id,
              type: "DEPOSIT",
              amount: amount_usdt,
              status: "PENDING",
              metadata: {
                txid: formData.txid,
                note: "Adding Funds in Progress",
              },
            },
          ]);

        if (txError) throw txError;

        setFormData({ amount_usdt: "", txid: "", payment_proof_url: "" });
        await onSubmit();
        onClose();
      } catch (error) {
        console.error("Error submitting request:", error);
        setError(
          error instanceof Error ? error.message : "Failed to submit request"
        );
      }
    };

    return (
      <>
        {/* Custom styles scoped to this component */}
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          .modal-enter {
            animation: fadeIn 300ms ease forwards;
          }

          .modal-exit {
            animation: fadeIn 300ms ease reverse forwards;
          }

          .file-upload-area {
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 1.5rem;
            text-align: center;
            background: #f9fafb;
            transition: background-color 0.3s ease;
          }

          .dark .file-upload-area {
            border-color: #4b5563;
            background: #2d3748;
          }

          .file-upload-area:hover {
            background: #f1f5f9;
          }

          .dark .file-upload-area:hover {
            background: #374151;
          }
        `}</style>

        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md modal-enter">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Add Funds</h3>
              <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Send Payment via GPay
              </h4>
              <div className="flex justify-center">
                <QRCode
                  value={`upi://pay?pa=${gpayUpiId}&pn=YourName&cu=INR`}
                  size={120}
                  className="border p-2 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                Scan this QR code with Google Pay to send funds to{" "}
                <span className="font-mono">{gpayUpiId}</span>.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                After sending, enter the details below.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.amount_usdt}
                  onChange={(e) =>
                    setFormData({ ...formData, amount_usdt: e.target.value })
                  }
                  placeholder="Amount (USDT)"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 p-3"
                />
                {formData.amount_usdt && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ≈ ₹{(parseFloat(formData.amount_usdt) * prices.usdt).toFixed(2)} INR
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={formData.txid}
                  onChange={(e) =>
                    setFormData({ ...formData, txid: e.target.value })
                  }
                  placeholder="Transaction ID (from GPay)"
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 p-3"
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Proof (Optional)
                </p>
                <div className="file-upload-area">
                  {formData.payment_proof_url ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={formData.payment_proof_url}
                        alt="Payment proof"
                        className="h-24 w-24 object-cover rounded-lg shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            payment_proof_url: "",
                          })
                        }
                        className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                      <div className="flex text-xs text-gray-600 dark:text-gray-400 mt-2">
                        <label className="relative cursor-pointer rounded-md font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }
);