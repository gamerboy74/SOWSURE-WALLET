import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ShoppingBag, TrendingUp, Package, Users } from 'lucide-react';

const purchaseHistory = [
  { month: 'Jan', spent: 82000, orders: 8 },
  { month: 'Feb', spent: 75000, orders: 7 },
  { month: 'Mar', spent: 93000, orders: 9 },
  { month: 'Apr', spent: 88000, orders: 8 },
  { month: 'May', spent: 102000, orders: 10 },
  { month: 'Jun', spent: 96000, orders: 9 }
];

const categorySpend = [
  { category: 'Grains', amount: 45000 },
  { category: 'Vegetables', amount: 32000 },
  { category: 'Fruits', amount: 28000 },
  { category: 'Pulses', amount: 18000 },
  { category: 'Others', amount: 12000 }
];

function BuyerAnalytics() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Purchase Analytics</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">₹5,36,000</p>
              <p className="text-sm text-emerald-600">+5.8% from last month</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">51</p>
              <p className="text-sm text-emerald-600">+3 from last month</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Orders</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
              <p className="text-sm text-emerald-600">2 arriving soon</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Farmer Network</p>
              <p className="text-2xl font-bold text-gray-900">15</p>
              <p className="text-sm text-emerald-600">+3 new connections</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase History</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={purchaseHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" orientation="left" stroke="#059669" />
              <YAxis yAxisId="right" orientation="right" stroke="#2563EB" />
              <Tooltip />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="spent" 
                stroke="#059669" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="orders" 
                stroke="#2563EB" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category-wise Spend */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Category-wise Spend</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categorySpend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default BuyerAnalytics;