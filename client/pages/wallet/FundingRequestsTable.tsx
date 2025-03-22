import React from "react";
import type { WalletFundingRequest } from "../../types/types";

interface FundingRequestsTableProps {
  fundingRequests: WalletFundingRequest[];
}

export const FundingRequestsTable = React.memo(
  ({ fundingRequests }: FundingRequestsTableProps) => {
    return (
      <div className="glass-card rounded-2xl p-6 animate-fade-in">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">
          Recent Funding Requests
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {fundingRequests.map((request) => (
                <tr key={request.id} className="table-row-hover">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {new Date(request.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      ${request.amount_usdt}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ₹{request.amount_inr}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full badge-active
                        ${request.status === "APPROVED" ? "badge-active" : request.status === "REJECTED" ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"}`}
                    >
                      {request.status}
                    </span>
                  </td>
                </tr>
              ))}
              {fundingRequests.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
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