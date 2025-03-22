import React, { useState } from "react";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { WalletService } from "../../services/wallet.service";
import { ethers } from "ethers";
import type { Wallet } from "../../types/types";

interface TransferSectionProps {
  wallet: Wallet & { ethBalance?: string; tokenBalance?: number } | null;
  onTransferComplete: () => Promise<void>;
  setError: (error: string | null) => void;
}

interface ConfirmModalProps {
  amount: string;
  recipient: string;
  isEth: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  amount,
  recipient,
  isEth,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Confirm Transfer
      </h3>
      <p className="text-gray-600 mb-2">
        Amount: {amount} {isEth ? "ETH" : "USDT"}
      </p>
      <p className="text-gray-600 mb-6 break-all">
        To: {recipient}
      </p>
      <div className="flex space-x-4">
        <button
          onClick={onCancel}
          className="flex-1 p-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 p-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

export const TransferSection = React.memo(
  ({ wallet, onTransferComplete, setError }: TransferSectionProps) => {
    const [transferAmount, setTransferAmount] = useState<string>("");
    const [recipientAddress, setRecipientAddress] = useState<string>("");
    const [isTransferring, setIsTransferring] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [transferType, setTransferType] = useState<boolean>(false); // false = USDT, true = ETH

    const validateTransfer = (isEth: boolean): boolean => {
      if (!wallet || !recipientAddress || !transferAmount) {
        setError("Please fill in all fields");
        return false;
      }

      const amount = parseFloat(transferAmount);
      if (isNaN(amount) || amount <= 0) {
        setError("Amount must be greater than 0");
        return false;
      }

      if (!ethers.isAddress(recipientAddress)) {
        setError("Please enter a valid Ethereum address (0x...)");
        return false;
      }

      if (isEth && wallet.ethBalance) {
        const ethBalance = parseFloat(ethers.formatEther(wallet.ethBalance));
        if (amount > ethBalance) {
          setError("Insufficient ETH balance");
          return false;
        }
      }

      if (!isEth && wallet.tokenBalance && amount > wallet.tokenBalance) {
        setError("Insufficient USDT balance");
        return false;
      }

      return true;
    };

    const handleTransfer = (isEth: boolean) => {
      if (validateTransfer(isEth)) {
        setTransferType(isEth);
        setShowConfirm(true);
      }
    };

    const executeTransfer = async () => {
      setShowConfirm(false); // Close the modal immediately after clicking Confirm
      setIsTransferring(true);
      setError(null);

      try {
        const result = await WalletService.transferTokens(
          wallet!.id,
          recipientAddress,
          transferAmount,
          transferType
        );
        setTransferAmount("");
        setRecipientAddress("");
        // No need to call onTransferComplete() since WebSocket will handle updates
        setError(null);
        alert(`${transferType ? "ETH" : "USDT"} transfer initiated! ${result.txHash ? `Tx: ${result.txHash}` : ""}`);
      } catch (error) {
        console.error(`${transferType ? "ETH" : "USDT"} transfer error:`, error);
        setError(error instanceof Error ? error.message : `Failed to transfer ${transferType ? "ETH" : "USDT"}`);
      } finally {
        setIsTransferring(false);
      }
    };

    const setMaxAmount = (isEth: boolean) => {
      if (isEth && wallet?.ethBalance) {
        setTransferAmount(ethers.formatEther(wallet.ethBalance));
      } else if (!isEth && wallet?.tokenBalance) {
        setTransferAmount(wallet.tokenBalance.toString());
      }
    };

    return (
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-600 mb-6">
          Transfer Funds
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value.trim())}
            placeholder="Recipient Address (0x...)"
            disabled={isTransferring}
            className="w-full p-3 rounded-lg bg-white text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0"
              value={transferAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setTransferAmount(value);
                }
              }}
              placeholder="Amount"
              disabled={isTransferring}
              className="w-full p-3 rounded-lg bg-white text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-2">
              <button
                onClick={() => setMaxAmount(false)}
                disabled={isTransferring}
                className="text-sm text-teal-400 hover:underline"
              >
                Max USDT
              </button>
              <button
                onClick={() => setMaxAmount(true)}
                disabled={isTransferring}
                className="text-sm text-teal-400 hover:underline"
              >
                Max ETH
              </button>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => handleTransfer(false)}
              disabled={isTransferring}
              className="flex-1 flex items-center justify-center p-3 rounded-lg bg-teal-500 text-white font-medium disabled:opacity-50 hover:bg-teal-600 transition-colors"
            >
              {isTransferring ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ArrowUpDown className="w-5 h-5 mr-2" />
                  Send USDT
                </>
              )}
            </button>
            <button
              onClick={() => handleTransfer(true)}
              disabled={isTransferring}
              className="flex-1 flex items-center justify-center p-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {isTransferring ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ArrowUpDown className="w-5 h-5 mr-2" />
                  Send ETH
                </>
              )}
            </button>
          </div>
        </div>

        {showConfirm && (
          <ConfirmModal
            amount={transferAmount}
            recipient={recipientAddress}
            isEth={transferType}
            onConfirm={executeTransfer}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    );
  }
);