import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with env variables
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface User {
  id: string;
  name: string;
  type: 'Farmer' | 'Buyer';
  image?: string;
  location: string;
  rating: number;
  description: string;
  specialization: string;
  productsListed: number;
  totalSales: string;
  memberSince: string;
}

const SearchUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: farmersData, error: farmersError } = await supabase
          .from('farmers')
          .select('id, name, complete_address, profile_photo_url, created_at, land_type');

        const { data: buyersData, error: buyersError } = await supabase
          .from('buyers')
          .select('id, contact_name, business_address, profile_photo_url, created_at, business_type');

        if (farmersError || buyersError) throw new Error('Error fetching users');

        const farmers: User[] = (farmersData || []).map((farmer) => ({
          id: farmer.id,
          name: farmer.name,
          type: 'Farmer' as const,
          image: farmer.profile_photo_url,
          location: farmer.complete_address || 'Unknown',
          rating: 4.5,
          description: 'Farmer specializing in agricultural produce',
          specialization: farmer.land_type || 'General Farming',
          productsListed: 0,
          totalSales: '0 ETH',
          memberSince: new Date(farmer.created_at).toISOString().split('T')[0],
        }));

        const buyers: User[] = (buyersData || []).map((buyer) => ({
          id: buyer.id,
          name: buyer.contact_name,
          type: 'Buyer' as const,
          image: buyer.profile_photo_url,
          location: buyer.business_address || 'Unknown',
          rating: 4.5,
          description: 'Buyer interested in agricultural products',
          specialization: buyer.business_type || 'General Buying',
          productsListed: 0,
          totalSales: '0 Orders',
          memberSince: new Date(buyer.created_at).toISOString().split('T')[0],
        }));

        setUsers([...farmers, ...buyers]);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchQuery, users]);

  const handleCloseModal = useCallback(() => {
    setIsModalClosing(true);
    setTimeout(() => {
      setSelectedUser(null);
      setIsModalClosing(false);
      setSearchQuery('');
      setShowResults(false);
    }, 300);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleCloseModal]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowResults(false);
  };

  const handleViewProfile = (user: User) => {
    setIsNavigating(true);
    // First transition: Button loading state
    setTimeout(() => {
      // Second transition: Modal fade out
      setIsModalClosing(true);
      setTimeout(() => {
        // Final navigation
        setSelectedUser(null);
        setIsModalClosing(false);
        setIsNavigating(false);
        navigate(`/profile/${user.type.toLowerCase()}/${user.id}`);
        window.scrollTo(0, 0);
      }, 300); // Matches modal closing animation
    }, 400); // Button loading animation duration
  };

  const handleImageError = (userId: string) => {
    setImageError((prev) => ({ ...prev, [userId]: true }));
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5 transition-colors duration-200" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 ease-in-out hover:border-gray-300 placeholder-gray-400"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
      </div>

      {showResults && searchQuery && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-100 max-h-[300px] overflow-y-auto ring-1 ring-black ring-opacity-5">
          {filteredUsers.length > 0 ? (
            <div className="py-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  className="w-full px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 transition-all duration-150 ease-in-out group"
                  onClick={() => handleUserSelect(user)}
                >
                  {user.image && !imageError[user.id] ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-100 transition-all duration-200 group-hover:ring-emerald-200"
                      onError={() => handleImageError(user.id)}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center transition-colors duration-200 group-hover:bg-emerald-50">
                      <span className="text-gray-600 text-sm font-medium group-hover:text-emerald-600">
                        {user.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-600 group-hover:text-gray-700">
                      {user.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 rounded-b-lg">
              No users found
            </div>
          )}
        </div>
      )}

      {selectedUser && (
        <div role="dialog" aria-labelledby="modal-title" aria-modal="true" className="fixed inset-0 z-[999]">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] transition-opacity duration-300 ease-in-out"
            onClick={handleCloseModal}
          />
          <div className="fixed inset-0 z-[999] pointer-events-none">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div
                className={`bg-white rounded-xl shadow-2xl w-[400px] max-w-full pointer-events-auto transition-all duration-300 ease-in-out transform ring-1 ring-gray-100 ${
                  isModalClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50 rounded-t-xl">
                  <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                    User Profile
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-500 hover:text-gray-700 text-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-full p-1 transition-all duration-200 hover:bg-gray-200"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-4 space-y-5">
                  <div className="flex items-center space-x-4">
                    {selectedUser.image && !imageError[selectedUser.id] ? (
                      <img
                        src={selectedUser.image}
                        alt={selectedUser.name}
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-100 transition-all duration-200 hover:ring-emerald-200"
                        onError={() => handleImageError(selectedUser.id)}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center transition-colors duration-200 hover:bg-emerald-50">
                        <span className="text-gray-600 text-xl font-semibold hover:text-emerald-600">
                          {selectedUser.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-emerald-600 transition-colors duration-200">
                        {selectedUser.name}
                      </h3>
                      <p className="text-sm text-gray-600">{selectedUser.type}</p>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current transition-colors duration-200 hover:text-yellow-500" />
                        <span className="ml-1 text-sm font-medium text-gray-700">
                          {selectedUser.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Location</h4>
                      <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                        {selectedUser.location}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Member Since</h4>
                      <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                        {selectedUser.memberSince}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">About</h4>
                    <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-md shadow-inner">
                      {selectedUser.description}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Farming Details</h4>
                    <div className="mt-2 space-y-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md shadow-inner">
                      <p>Specialization: <span className="font-medium">{selectedUser.specialization}</span></p>
                      <p>Products Listed: <span className="font-medium">{selectedUser.productsListed}</span></p>
                      <p>Total Sales: <span className="font-medium">{selectedUser.totalSales}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewProfile(selectedUser)}
                    className={`w-full bg-purple-600 text-white py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg ${
                      isNavigating 
                        ? 'cursor-not-allowed opacity-70 scale-95 bg-purple-500' 
                        : 'hover:bg-purple-700 active:scale-95'
                    }`}
                    disabled={isNavigating}
                  >
                    <span className="relative flex items-center justify-center">
                      <span className={`${isNavigating ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
                        View Profile
                      </span>
                      {isNavigating && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowResults(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
};

export default SearchUsers;