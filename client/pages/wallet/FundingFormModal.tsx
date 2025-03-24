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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split(".").pop();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        setUploading(true);
        setError(null);

        // Get signed URL for upload
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("payment-proofs")
          .createSignedUploadUrl(filePath);

        if (signedUrlError) throw signedUrlError;
        if (!signedUrlData?.signedUrl) throw new Error("Failed to get signed URL");

        // Upload file using fetch
        const response = await fetch(signedUrlData.signedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!response.ok) throw new Error("Upload failed");

        const { data: publicUrlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(filePath);

        setFormData({ ...formData, payment_proof_url: publicUrlData.publicUrl });
      } catch (err) {
        console.error("Error uploading proof:", err);
        setError(err instanceof Error ? err.message : "Failed to upload proof");
      } finally {
        setUploading(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");
        const amount_usdt = parseFloat(formData.amount_usdt);
        if (isNaN(amount_usdt) || amount_usdt <= 0) throw new Error("Please enter a valid amount");

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
              metadata: { txid: formData.txid, note: "Adding Funds in Progress" },
            },
          ]);

        if (txError) throw txError;

        setFormData({ amount_usdt: "", txid: "", payment_proof_url: "" });
        await onSubmit();
        onClose();
      } catch (error) {
        console.error("Error submitting request:", error);
        setError(error instanceof Error ? error.message : "Failed to submit request");
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add Funds</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
                className="p-2 rounded-xl bg-white shadow-md"
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
              Scan this QR code with Google Pay to send funds to{" "}
              <span className="font-mono text-indigo-500">{gpayUpiId}</span>.
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
                onChange={(e) => setFormData({ ...formData, amount_usdt: e.target.value })}
                placeholder="Amount (USDT)"
                className="w-full p-3 rounded-xl bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {formData.amount_usdt && (
                <p className="mt-1 text-xs text-gray-500">
                  ≈ ₹{(parseFloat(formData.amount_usdt) * prices.usdt).toFixed(2)} INR
                </p>
              )}
            </div>
            <div>
              <input
                type="text"
                required
                value={formData.txid}
                onChange={(e) => setFormData({ ...formData, txid: e.target.value })}
                placeholder="Transaction ID (from GPay)"
                className="w-full p-3 rounded-xl bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Proof (Optional)
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                {formData.payment_proof_url ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={formData.payment_proof_url}
                      alt="Payment proof"
                      className="h-20 w-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_proof_url: "" })}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                    <label className="cursor-pointer text-xs text-indigo-500 hover:text-indigo-600">
                      Upload a file
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 py-2 px-4 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
);