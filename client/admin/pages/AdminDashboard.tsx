import React from 'react';
import { Users, ShoppingBag, TrendingUp, Sprout } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';

const recentFarmers = [
  { name: 'John Doe', location: 'Punjab', products: 12, joined: '2025-03-20' },
  { name: 'Jane Smith', location: 'Gujarat', products: 8, joined: '2025-03-19' },
  // Add more mock data as needed
];

const recentBuyers = [
  { name: 'ABC Trading Co.', location: 'Mumbai', orders: 25, joined: '2025-03-20' },
  { name: 'XYZ Exports', location: 'Delhi', orders: 18, joined: '2025-03-19' },
  // Add more mock data as needed
];

function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Farmers"
          value="1,234"
          change="+12% from last month"
          trend="up"
          icon={Users}
        />
        <StatsCard
          title="Total Buyers"
          value="567"
          change="+8% from last month"
          trend="up"
          icon={ShoppingBag}
        />
        <StatsCard
          title="Total Revenue"
          value="₹15.2L"
          change="+15% from last month"
          trend="up"
          icon={TrendingUp}
        />
        <StatsCard
          title="Active Products"
          value="892"
          change="+5% from last month"
          trend="up"
          icon={Sprout}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Farmers</h2>
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'location', label: 'Location' },
              { key: 'products', label: 'Products' },
              { key: 'joined', label: 'Joined' },
            ]}
            data={recentFarmers}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Buyers</h2>
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'location', label: 'Location' },
              { key: 'orders', label: 'Orders' },
              { key: 'joined', label: 'Joined' },
            ]}
            data={recentBuyers}
          />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;