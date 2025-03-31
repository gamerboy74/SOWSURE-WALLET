import React from "react";
import { RefreshCw } from "lucide-react";

interface OrdersHeaderProps {
  onFilterChange: (filter: string) => void;
  onExport: () => void;
  showFilters: boolean;
}

function OrdersHeader({
  onFilterChange,
  onExport,
  showFilters,
}: OrdersHeaderProps) {
  const statuses = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Funded", value: "funded" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Disputed", value: "disputed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-emerald-100/50">
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
        My Orders
      </h1>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => onFilterChange(status.value)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/80 backdrop-blur-sm border border-emerald-100/50 rounded-xl
                hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-teal-500/10 hover:text-emerald-700
                focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all duration-300 shadow-sm hover:shadow-md"
              >
                {status.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onExport}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500
            rounded-xl hover:from-emerald-600 hover:to-teal-600 focus:ring-2 focus:ring-emerald-500/50
            focus:outline-none transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Export Orders
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500
            rounded-xl hover:from-emerald-600 hover:to-teal-600 focus:ring-2 focus:ring-emerald-500/50
            focus:outline-none transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105
            flex items-center group"
          >
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrdersHeader;
