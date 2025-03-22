// BackupInfoModal.tsx
import React from "react";

interface BackupInfoModalProps {
  backupInfo: { address: string; privateKey: string; mnemonic: string };
  onClose: () => void;
}

export const BackupInfoModal = React.memo(
  ({ backupInfo, onClose }: BackupInfoModalProps) => {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="card rounded-2xl p-6 w-full max-w-lg">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Important: Save Your New Wallet Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Wallet Address
              </label>
              <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm break-all text-gray-800 dark:text-gray-200">
                {backupInfo.address}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Private Key
              </label>
              <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm break-all text-gray-800 dark:text-gray-200">
                {backupInfo.privateKey}
              </div>
            </div>
            {backupInfo.mnemonic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recovery Phrase
                </label>
                <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm break-all text-gray-800 dark:text-gray-200">
                  {backupInfo.mnemonic}
                </div>
              </div>
            )}
            <div className="mt-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4">
                ⚠️ WARNING: Store these details safely - they cannot be
                recovered if lost!
              </p>
              <button
                onClick={onClose}
                className="btn-green w-full px-4 py-3 rounded-lg text-white font-medium"
              >
                I Have Saved These Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);