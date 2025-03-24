import React from "react";
import type { WalletFundingRequest } from "../../types/types";

interface FundingRequestsTableProps {
  fundingRequests: WalletFundingRequest[];
}

export const FundingRequestsTable = React.memo(
  ({ fundingRequests }: FundingRequestsTableProps) => {
    return (
      <div className="p-4 sm:p-6 hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-300 rounded-2xl">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Recent Funding Requests
        </h3>
        <div className="w-full">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {fundingRequests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-750 hover:scale-[1.005] hover:shadow-sm transition-all duration-200"
                >
                  <td className="px-2 sm:px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-normal break-words">
                    {new Date(request.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-normal break-words">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      ${request.amount_usdt}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ₹{request.amount_inr}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-normal break-words">
                    <span
                      className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full hover:scale-105 transition-all duration-200 ${
                        request.status === "APPROVED"
                          ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
                          : request.status === "REJECTED"
                          ? "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200"
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                </tr>
              ))}
              {fundingRequests.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 sm:px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                    No funding requests yet
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