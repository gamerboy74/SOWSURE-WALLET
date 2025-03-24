import React, { useState } from "react";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { WalletService } from "../../services/wallet.service";
import { ethers } from "ethers";
import { toast } from "react-toastify";
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
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Confirm Transfer
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        Amount: {amount} {isEth ? "ETH" : "USDT"}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 break-all">
        To: {recipient}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105 transition-all duration-300"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-600 dark:to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-600 hover:scale-105 transition-all duration-300"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

export const TransferSection = React.memo(
  ({ wallet, setError, onTransferComplete }: TransferSectionProps) => {
    const [transferAmount, setTransferAmount] = useState<string>("");
    const [recipientAddress, setRecipientAddress] = useState<string>("");
    const [isTransferring, setIsTransferring] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [transferType, setTransferType] = useState<boolean>(false);
    const [isFetchingBalance, setIsFetchingBalance] = useState(false);

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
      setShowConfirm(false);
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
        toast.success(
          <div>
            {transferType ? "ETH" : "USDT"} transfer initiated!
            {result.txHash && (
              <>
                <br />
                Transaction Hash:{" "}
                <a
                  href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {result.txHash.slice(0, 8)}...{result.txHash.slice(-8)}
                </a>
              </>
            )}
          </div>,
          { autoClose: 10000 }
        );
        await onTransferComplete();
      } catch (error) {
        console.error(`${transferType ? "ETH" : "USDT"} transfer error:`, error);
        const errorMessage = error instanceof Error ? error.message : `Failed to transfer ${transferType ? "ETH" : "USDT"}`;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsTransferring(false);
      }
    };

    const setMaxAmount = async (isEth: boolean) => {
      if (!wallet?.wallet_address) return;

      setIsFetchingBalance(true);
      setError(null);

      try {
        if (isEth) {
          const ethResult = await WalletService.getWalletBalance(wallet.wallet_address, "onchain");
          setTransferAmount(String(ethResult.balance));
        } else {
          const usdtBalance = await WalletService.getUsdtBalance(wallet.wallet_address);
          setTransferAmount(usdtBalance);
        }
      } catch (error) {
        console.error(`Error fetching ${isEth ? "ETH" : "USDT"} balance:`, error);
        const errorMessage = error instanceof Error ? error.message : `Failed to fetch ${isEth ? "ETH" : "USDT"} balance`;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsFetchingBalance(false);
      }
    };

    return (
      <div className="p-4 sm:p-6 hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-300 rounded-2xl">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Transfer Funds
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value.trim())}
            placeholder="Recipient Address (0x...)"
            disabled={isTransferring || isFetchingBalance}
            className="w-full p-3 sm:p-4 rounded-xl bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 text-sm sm:text-base"
          />
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0"
              value={transferAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) setTransferAmount(value);
              }}
              placeholder="Amount"
              disabled={isTransferring || isFetchingBalance}
              className="w-full p-3 sm:p-4 rounded-xl bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
              <button
                onClick={() => setMaxAmount(false)}
                disabled={isTransferring || isFetchingBalance}
                className="text-xs sm:text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                {isFetchingBalance && !transferType ? "Fetching..." : "Max USDT"}
              </button>
              <button
                onClick={() => setMaxAmount(true)}
                disabled={isTransferring || isFetchingBalance}
                className="text-xs sm:text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                {isFetchingBalance && transferType ? "Fetching..." : "Max ETH"}
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleTransfer(false)}
              disabled={isTransferring || isFetchingBalance}
              className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-600 dark:to-cyan-600 text-white font-medium disabled:opacity-50 hover:from-teal-600 hover:to-cyan-600 hover:scale-105 transition-all duration-300 shadow-md"
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
              disabled={isTransferring || isFetchingBalance}
              className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 text-white font-medium disabled:opacity-50 hover:from-blue-600 hover:to-indigo-600 hover:scale-105 transition-all duration-300 shadow-md"
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