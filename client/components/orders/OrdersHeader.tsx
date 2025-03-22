import React from 'react';

interface OrdersHeaderProps {
  onFilterChange: (filter: string) => void;
  onExport: () => void;
}

function OrdersHeader({ onFilterChange, onExport }: OrdersHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      <div className="flex space-x-4">
        <select 
          className="rounded-md border-gray-300 text-sm"
          onChange={(e) => onFilterChange(e.target.value)}
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
        </select>
        <button 
          onClick={onExport}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
        >
          Export Orders
        </button>
      </div>
    </div>
  );
}

export default OrdersHeader;