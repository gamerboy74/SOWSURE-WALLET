// components/StatsCard.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  className?: string; // Optional prop
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, trend, icon: Icon, className }) => {
  const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-6 flex items-center space-x-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${className || ''}`}
    >
      <div className="p-3 bg-indigo-100 rounded-full">
        <Icon className="w-6 h-6 text-indigo-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className={`text-xs font-medium ${trendColor}`}>{change}</p>
      </div>
    </div>
  );
};

export default StatsCard;