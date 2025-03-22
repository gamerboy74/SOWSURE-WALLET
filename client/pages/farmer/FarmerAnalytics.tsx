import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Package, TrendingUp, DollarSign, Users } from 'lucide-react';

const monthlyData = [
  { month: 'Jan', sales: 45000, orders: 12 },
  { month: 'Feb', sales: 52000, orders: 15 },
  { month: 'Mar', sales: 48000, orders: 14 },
  { month: 'Apr', sales: 61000, orders: 18 },
  { month: 'May', sales: 55000, orders: 16 },
  { month: 'Jun', sales: 67000, orders: 20 }
];

const productPerformance = [
  { name: 'Organic Wheat', quantity: 1200, revenue: 48000 },
  { name: 'Premium Rice', quantity: 800, revenue: 32000 },
  { name: 'Fresh Vegetables', quantity: 2000, revenue: 40000 },
  { name: 'Organic Pulses', quantity: 600, revenue: 24000 }
];

function FarmerAnalytics() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">₹3,28,000</p>
              <p className="text-sm text-emerald-600">+12.5% from last month</p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">95</p>
              <p className="text-sm text-emerald-600">+8.2% from last month</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-sm text-emerald-600">+2 new this month</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Buyers</p>
              <p className="text-2xl font-bold text-gray-900">28</p>
              <p className="text-sm text-emerald-600">+5 new relationships</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Trend */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#059669" 
                fill="#059669" 
                fillOpacity={0.1} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Performance */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Performance</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#059669" />
              <YAxis yAxisId="right" orientation="right" stroke="#2563EB" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="quantity" fill="#059669" />
              <Bar yAxisId="right" dataKey="revenue" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default FarmerAnalytics;