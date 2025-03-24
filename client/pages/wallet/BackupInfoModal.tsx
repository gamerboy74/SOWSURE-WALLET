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
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 transform scale-100 animate-fade-in">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Save Your Wallet Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Wallet Address
            </label>
            <div className="mt-1 relative">
              <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-xl font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all shadow-inner hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                {backupInfo.address}
              </div>
              <button
                onClick={() => copyToClipboard(backupInfo.address, "address")}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:scale-110 transition-all duration-200"
                aria-label="Copy wallet address"
              >
                {copiedField === "address" ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Clipboard className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Private Key
            </label>
            <div className="mt-1 relative">
              <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-xl font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all shadow-inner hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                {backupInfo.privateKey}
              </div>
              <button
                onClick={() => copyToClipboard(backupInfo.privateKey, "privateKey")}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:scale-110 transition-all duration-200"
                aria-label="Copy private key"
              >
                {copiedField === "privateKey" ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Clipboard className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          {backupInfo.mnemonic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recovery Phrase
              </label>
              <div className="mt-1 relative">
                <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-xl font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-all shadow-inner hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                  {backupInfo.mnemonic}
                </div>
                <button
                  onClick={() => copyToClipboard(backupInfo.mnemonic, "mnemonic")}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:scale-110 transition-all duration-200"
                  aria-label="Copy recovery phrase"
                >
                  {copiedField === "mnemonic" ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clipboard className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              ⚠️ WARNING: Store these details securely—they cannot be recovered if lost!
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-600 text-white font-medium hover:from-indigo-600 hover:to-blue-600 hover:scale-105 transition-all duration-300 shadow-md"
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