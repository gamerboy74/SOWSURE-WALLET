import React, { useState, useMemo } from "react";
import { RefreshCw, Search, ExternalLink } from "lucide-react";
import type { WalletTransaction } from "../../types/types";

interface TransactionHistoryTableProps {
  transactions: WalletTransaction[];
  onRefresh: () => Promise<void>;
}

export const TransactionHistoryTable = React.memo(
  ({ transactions, onRefresh }: TransactionHistoryTableProps) => {
    const [searchQuery, setSearchQuery] = useState<string>("");

    const filteredTransactions = useMemo(() => {
      return transactions
        .filter(
          (tx) =>
            !tx.metadata?.note?.includes("Funding Request") &&
            !tx.metadata?.note?.includes("Adding Funds") &&
            (tx.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
              tx.amount.toString().includes(searchQuery) ||
              tx.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
              Object.values(tx.metadata || {}).some((value) =>
                String(value || "")
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              ))
        );
    }, [transactions, searchQuery]);

    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Recent Transactions
          </h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 input-focus"
              />
            </div>
            <button
              onClick={onRefresh}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
            >
              <RefreshCw className="w-5 h-5 animate-spin-on-hover" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0 table-row-hover dark:border-gray-600">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{tx.type}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      tx.type === "DEPOSIT"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "DEPOSIT" ? "+" : "-"}
                    {tx.amount}{" "}
                    {tx.metadata?.network === "sepolia" ? "ETH" : "USDT"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tx.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200"
                            : tx.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200"
                            : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200"
                        }`}
                      >
                        {tx.status}
                      </span>
                      {tx.metadata?.txHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${tx.metadata.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center transition-colors duration-200"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);