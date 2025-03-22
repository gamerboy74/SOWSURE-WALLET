import React from 'react';
import { BarChart2, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import StatsCard from '../components/StatsCard';

const mockStats = [
  {
    title: 'Total Users',
    value: '2,345',
    change: '+12% from last month',
    trend: 'up',
    icon: Users
  },
  {
    title: 'Total Transactions',
    value: '₹15.2L',
    change: '+8% from last month',
    trend: 'up',
    icon: TrendingUp
  },
  {
    title: 'Active Listings',
    value: '892',
    change: '+5% from last month',
    trend: 'up',
    icon: ShoppingBag
  },
  {
    title: 'Average Order Value',
    value: '₹25,000',
    change: '+15% from last month',
    trend: 'up',
    icon: BarChart2
  }
];

const monthlyData = [
  { name: 'Jan', value: 150000 },
  { name: 'Feb', value: 180000 },
  { name: 'Mar', value: 220000 },
  { name: 'Apr', value: 280000 },
  { name: 'May', value: 320000 },
  { name: 'Jun', value: 400000 },
  { name: 'Jul', value: 450000 },
  { name: 'Aug', value: 480000 },
  { name: 'Sep', value: 520000 },
  { name: 'Oct', value: 580000 },
  { name: 'Nov', value: 620000 },
  { name: 'Dec', value: 700000 }
];

const topProducts = [
  { name: 'Organic Wheat', value: 120 },
  { name: 'Basmati Rice', value: 98 },
  { name: 'Fresh Vegetables', value: 86 },
  { name: 'Organic Pulses', value: 72 },
  { name: 'Fruits', value: 65 }
];

const userGrowth = [
  { name: 'Week 1', farmers: 45, buyers: 32 },
  { name: 'Week 2', farmers: 52, buyers: 38 },
  { name: 'Week 3', farmers: 61, buyers: 45 },
  { name: 'Week 4', farmers: 68, buyers: 51 }
];

function Analytics() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Transactions</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `₹${value.toLocaleString()}`}
                contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem' }}
                />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem' }}
                />
                <Bar dataKey="farmers" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="buyers" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;