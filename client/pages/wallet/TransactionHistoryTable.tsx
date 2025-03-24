// components/wallet/TransactionHistoryTable.tsx
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
    const [currentPage, setCurrentPage] = useState<number>(1);
    const transactionsPerPage = 10;

    const filteredTransactions = useMemo(() => {
      const filtered = transactions.filter(
        (tx) =>
          !tx.metadata?.note?.includes("Funding Request") &&
          !tx.metadata?.note?.includes("Adding Funds") &&
          (tx.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.amount.toString().includes(searchQuery) ||
            tx.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.token_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            Object.values(tx.metadata || {}).some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            ))
      );
      console.log("Filtered transactions length:", filtered.length);
      console.log("Filtered transactions:", filtered);
      return filtered;
    }, [transactions, searchQuery]);

    // Calculate pagination values
    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
    const startIndex = (currentPage - 1) * transactionsPerPage;
    const paginatedTransactions = filteredTransactions.slice(
      startIndex,
      startIndex + transactionsPerPage
    );

    console.log("Total pages:", totalPages);
    console.log("Current page:", currentPage);
    console.log("Start index:", startIndex);
    console.log("Paginated transactions length:", paginatedTransactions.length);

    const handlePageChange = (page: number) => {
      console.log("Changing to page:", page);
      setCurrentPage(page);
    };

    // Helper to display token type
    const getDisplayTokenType = (tx: WalletTransaction) => {
      return tx.token_type || "Unknown"; // No default to "USDT"; neutral fallback
    };

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
              <tr className="text-left border-b dark:border-gray-700">
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Token</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0 table-row-hover dark:border-gray-600">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                    {tx.type}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {getDisplayTokenType(tx)}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      tx.type === "DEPOSIT"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "DEPOSIT" ? "+" : "-"}
                    {tx.amount.toFixed(4)} {getDisplayTokenType(tx)}
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
              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1} -{" "}
              {Math.min(startIndex + transactionsPerPage, filteredTransactions.length)} of{" "}
              {filteredTransactions.length} transactions
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === page
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);