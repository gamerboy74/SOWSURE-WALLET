import React, { useState } from "react";
import { Clipboard, Check } from "lucide-react";

interface BackupInfoModalProps {
  backupInfo: { address: string; privateKey: string; mnemonic: string };
  onClose: () => void;
}

export const BackupInfoModal = React.memo(({ backupInfo, onClose }: BackupInfoModalProps) => {
  const [copiedField, setCopiedField] = useState<"address" | "privateKey" | "mnemonic" | null>(null);

  const copyToClipboard = (text: string, field: "address" | "privateKey" | "mnemonic") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-700 bg-opacity-50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Important: Save Your Wallet Details
        </h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Wallet Address
            </label>
            <div className="mt-1 relative">
              <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm break-all text-gray-800">
                {backupInfo.address}
              </div>
              <button
                onClick={() => copyToClipboard(backupInfo.address, "address")}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-emerald-600 transition-colors duration-200"
                aria-label="Copy wallet address"
              >
                {copiedField === "address" ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Clipboard className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Private Key
            </label>
            <div className="mt-1 relative">
              <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm break-all text-gray-800">
                {backupInfo.privateKey}
              </div>
              <button
                onClick={() => copyToClipboard(backupInfo.privateKey, "privateKey")}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-emerald-600 transition-colors duration-200"
                aria-label="Copy private key"
              >
                {copiedField === "privateKey" ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Clipboard className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          {backupInfo.mnemonic && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Recovery Phrase
              </label>
              <div className="mt-1 relative">
                <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm break-all text-gray-800">
                  {backupInfo.mnemonic}
                </div>
                <button
                  onClick={() => copyToClipboard(backupInfo.mnemonic, "mnemonic")}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-emerald-600 transition-colors duration-200"
                  aria-label="Copy recovery phrase"
              >
                  {copiedField === "mnemonic" ? (
                    <Check className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Clipboard className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">
              ⚠️ WARNING: Store these details securely—they cannot be recovered if lost!
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
            >
              I Have Saved These Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BackupInfoModal.displayName = "BackupInfoModal";