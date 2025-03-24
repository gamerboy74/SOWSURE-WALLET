// components/wallet/WalletBalanceCard.tsx
import React from "react";
import { Plus } from "lucide-react";

interface WalletBalanceCardProps {
  address: string | null;
  balance: { eth: string; token: number };
  prices: { eth: number; usdt: number };
  onAddFunds: () => void;
}

export const WalletBalanceCard = React.memo(
  ({ address, balance, prices, onAddFunds }: WalletBalanceCardProps) => {
    const totalValueINR =
      parseFloat(balance.eth) * prices.eth + balance.token * prices.usdt;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Your Wallet
          </h3>
          <button
            onClick={onAddFunds}
            className="bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Funds
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Wallet Address</p>
            <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1 text-gray-800 dark:text-gray-200 break-all">
              {address || "Creating wallet..."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ETH Balance</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {parseFloat(balance.eth).toFixed(4)} ETH
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ≈ ₹{(parseFloat(balance.eth) * prices.eth).toLocaleString("en-IN")}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">USDT Balance</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {balance.token.toFixed(2)} USDT
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ≈ ₹{(balance.token * prices.usdt).toLocaleString("en-IN")}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value (INR)</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                ₹{totalValueINR.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);