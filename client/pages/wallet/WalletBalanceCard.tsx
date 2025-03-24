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
    const totalValueINR = parseFloat(balance.eth) * prices.eth + balance.token * prices.usdt;

    return (
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-0">
            Your Wallet
          </h3>
          <button
            onClick={onAddFunds}
            className="bg-gradient-to-r from-green-500 to-teal-500 dark:from-green-600 dark:to-teal-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-medium flex items-center gap-2 hover:from-green-600 hover:to-teal-600 hover:scale-105 transition-all duration-300 shadow-md"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Add Funds
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Wallet Address</p>
            <p className="text-xs sm:text-sm font-mono bg-gray-100 dark:bg-gray-900 p-3 rounded-xl mt-1 text-gray-800 dark:text-gray-200 break-all shadow-inner hover:shadow-md hover:scale-[1.01] transition-all duration-200">
              {address || "Creating wallet..."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="group hover:-translate-y-1 hover:shadow-sm transition-all duration-200">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">ETH Balance</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                {parseFloat(balance.eth).toFixed(4)} ETH
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                ≈ ₹{(parseFloat(balance.eth) * prices.eth).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="group hover:-translate-y-1 hover:shadow-sm transition-all duration-200">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">USDT Balance</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                {balance.token.toFixed(2)} USDT
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                ≈ ₹{(balance.token * prices.usdt).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="group hover:-translate-y-1 hover:shadow-sm transition-all duration-200">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Value (INR)</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                ₹{totalValueINR.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);