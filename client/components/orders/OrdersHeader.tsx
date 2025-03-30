import React from 'react';
import { RefreshCw } from 'lucide-react';

interface OrdersHeaderProps {
  onFilterChange: (filter: string) => void;
  onExport: () => void;
  showFilters: boolean;
}

function OrdersHeader({ onFilterChange, onExport, showFilters }: OrdersHeaderProps) {
  const statuses = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Funded', value: 'funded' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Disputed', value: 'disputed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => onFilterChange(status.value)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-teal-50 hover:text-teal-600 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200"
              >
                {status.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onExport}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all duration-200"
          >
            Export Orders
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all duration-200 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrdersHeader;