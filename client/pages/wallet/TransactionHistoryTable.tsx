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
      return transactions.filter(
        (tx) =>
          !tx.metadata?.note?.includes("Funding Request") &&
          !tx.metadata?.note?.includes("Adding Funds") &&
          (tx.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.amount.toString().includes(searchQuery) ||
            tx.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tx.token_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            Object.values(tx.metadata || {}).some((value) =>
              String(value || "").toLowerCase().includes(searchQuery.toLowerCase())
            ))
      );
    }, [transactions, searchQuery]);

    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
    const startIndex = (currentPage - 1) * transactionsPerPage;
    const paginatedTransactions = filteredTransactions.slice(
      startIndex,
      startIndex + transactionsPerPage
    );

    const handlePageChange = (page: number) => setCurrentPage(page);

    const getDisplayTokenType = (tx: WalletTransaction) => tx.token_type || "Unknown";

    return (
      <div className="p-4 sm:p-6 hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-300 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Recent Transactions
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 sm:h-5 w-4 sm:w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 text-sm"
              />
            </div>
            <button
              onClick={onRefresh}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:scale-110 transition-all duration-300"
            >
              <RefreshCw className="w-5 h-5 animate-spin-on-hover" />
            </button>
          </div>
        </div>

        <div className="w-full">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="px-2 sm:px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                <th className="px-2 sm:px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Token</th>
                <th className="px-2 sm:px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                <th className="px-2 sm:px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-2 sm:px-4 py-2 font-semibold text-gray-600 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 hover:scale-[1.005] hover:shadow-sm transition-all duration-200"
                >
                  <td className="px-2 sm:px-4 py-3 text-gray-700 dark:text-gray-300 font-medium whitespace-normal break-words">
                    {tx.type}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-normal break-words">
                    {getDisplayTokenType(tx)}
                  </td>
                  <td
                    className={`px-2 sm:px-4 py-3 font-medium whitespace-normal break-words ${
                      tx.type === "DEPOSIT"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "DEPOSIT" ? "+" : "-"}
                    {tx.amount.toFixed(4)} {getDisplayTokenType(tx)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-normal break-words">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <span
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium hover:scale-105 transition-all duration-200 ${
                          tx.status === "COMPLETED"
                            ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
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
                          className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:scale-110 flex items-center transition-all duration-200 break-words"
                        >
                          <ExternalLink className="h-4 w-4 mr-1 flex-shrink-0" />
                          {tx.metadata.txHash.slice(0, 6)}...{tx.metadata.txHash.slice(-6)}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-normal break-words">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 sm:px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1} -{" "}
              {Math.min(startIndex + transactionsPerPage, filteredTransactions.length)} of{" "}
              {filteredTransactions.length} transactions
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105 transition-all duration-300"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-xl ${
                    currentPage === page
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105"
                  } transition-all duration-300`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-105 transition-all duration-300"
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