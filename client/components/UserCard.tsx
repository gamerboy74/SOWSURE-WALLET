import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, User } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with env variables
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface UserCardProps {
  id: string;
  name: string;
  type: 'Farmer' | 'Buyer';
  image?: string;
  location: string;
  rating: number;
  description: string;
  stats: { label: string; value: string }[];
  userId?: string; // Optional for wallet linking
}

const UserCard: React.FC<UserCardProps> = ({
  id,
  name,
  type,
  image,
  location,
  rating,
  description,
  stats,
  userId,
}) => {
  const navigate = useNavigate();
  const [enhancedStats, setEnhancedStats] = useState(stats);

  // Optionally fetch additional data (e.g., wallet stats) if userId is provided
  useEffect(() => {
    const fetchWalletStats = async () => {
      if (!userId) return;

      try {
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id, token_balance')
          .eq('user_id', userId)
          .single();

        if (walletError) throw walletError;

        const { data: transactionsData, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('wallet_id', walletData?.id)
          .eq('status', 'COMPLETED')
          .in('type', type === 'Farmer' ? ['DEPOSIT'] : ['TRANSFER']);

        if (transactionsError) throw transactionsError;

        const totalSales = transactionsData
          ? transactionsData.reduce((sum, tx) => sum + Number(tx.amount), 0).toFixed(2)
          : '0.00';

        setEnhancedStats([
          ...stats.filter((stat) => stat.label !== 'Total Sales'), // Avoid duplication
          { label: 'Total Sales', value: `${totalSales} ${type === 'Farmer' ? 'ETH' : 'Orders'}` },
        ]);
      } catch (error) {
        console.error('Error fetching wallet stats:', error);
      }
    };

    fetchWalletStats();
  }, [userId, type, stats]);

  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <div className="p-6">
        <div className="flex items-center space-x-4">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-100 transition-transform duration-200 hover:scale-105"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                  type === 'Farmer'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {type}
              </span>
            </div>
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{location}</span>
              </div>
              <div className="flex items-center text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="ml-1 text-sm text-gray-700">{rating}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-gray-600 text-sm line-clamp-2">{description}</p>

        <div className="mt-6 grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-100">
          {enhancedStats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(`/profile/${type.toLowerCase()}/${id}`)}
          className="mt-6 w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 active:scale-95"
        >
          View Profile
        </button>
      </div>
    </div>
  );
};

export default UserCard;