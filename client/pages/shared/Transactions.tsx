import React, { useState } from 'react';
import { Search, Filter, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const mockTransactions = [
  {
    id: '1',
    type: 'received',
    amount: '₹25,000',
    tokenAmount: '250 TOK',
    from: 'ABC Trading Co.',
    to: 'Farmer Singh',
    date: '2025-03-20',
    status: 'completed',
    description: 'Payment for Organic Wheat Order #ORD001'
  },
  {
    id: '2',
    type: 'sent',
    amount: '₹18,000',
    tokenAmount: '180 TOK',
    from: 'Farmer Singh',
    to: 'XYZ Exports',
    date: '2025-03-18',
    status: 'pending',
    description: 'Refund for Cancelled Order #ORD002'
  }
];

const statusColors = {
  'completed': 'bg-green-100 text-green-800',
  'pending': 'bg-yellow-100 text-yellow-800',
  'failed': 'bg-red-100 text-red-800'
};

function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
          Export History
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Total Received</p>
          <p className="text-2xl font-bold text-gray-900">₹43,000</p>
          <p className="text-sm text-emerald-600">+12.5% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Total Sent</p>
          <p className="text-2xl font-bold text-gray-900">₹18,000</p>
          <p className="text-sm text-red-600">-5.2% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Token Balance</p>
          <p className="text-2xl font-bold text-gray-900">430 TOK</p>
          <p className="text-sm text-emerald-600">+25 TOK this month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Pending Transactions</p>
          <p className="text-2xl font-bold text-gray-900">2</p>
          <p className="text-sm text-yellow-600">₹15,000 total value</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From/To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {transaction.type === 'received' ? (
                        <ArrowDownLeft className="h-5 w-5 text-emerald-500 mr-2" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.type === 'received' ? 'Received' : 'Sent'}
                        </div>
                        <div className="text-sm text-gray-500">{transaction.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{transaction.amount}</div>
                    <div className="text-sm text-gray-500">{transaction.tokenAmount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {transaction.type === 'received' ? transaction.from : transaction.to}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[transaction.status]}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-emerald-600 hover:text-emerald-900">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Transactions;