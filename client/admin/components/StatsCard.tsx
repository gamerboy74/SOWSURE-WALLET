import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon: LucideIcon;
}

function StatsCard({ title, value, change, trend, icon: Icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p className={`mt-1 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="h-12 w-12 bg-emerald-50 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}

export default StatsCard;