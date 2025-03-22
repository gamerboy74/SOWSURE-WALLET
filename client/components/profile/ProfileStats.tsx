import React from 'react';
import { Calendar } from 'lucide-react';

interface ProfileStatsProps {
  memberSince: string;
  totalProducts: number;
  totalSales: string;
}

function ProfileStats({ memberSince, totalProducts, totalSales }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t">
      <div>
        <p className="text-sm text-gray-500">Member Since</p>
        <p className="mt-1 font-medium flex items-center">
          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
          {new Date(memberSince).toLocaleDateString()}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Total Products</p>
        <p className="mt-1 font-medium">{totalProducts}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Total Sales</p>
        <p className="mt-1 font-medium">{totalSales}</p>
      </div>
    </div>
  );
}

export default ProfileStats;