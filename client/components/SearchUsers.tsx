import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Constants
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const DEFAULT_RATING = 4.5;
const ANIMATION_DURATION = 300;

// Types
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

interface SearchUsersProps {
  excludeUserId?: string;
}

// Utility Functions
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
const normalizeString = (str: string) => str.toLowerCase().trim();

const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const SearchUsers: React.FC<SearchUsersProps> = React.memo(({ excludeUserId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Fetch users with error handling
  const fetchUsers = useCallback(async () => {
    console.log('fetchUsers called'); // Debug log
    try {
      const [{ data: farmers }, { data: buyers }] = await Promise.all([
        supabase.from('farmers').select('id, name, complete_address, profile_photo_url, created_at, land_type'),
        supabase.from('buyers').select('id, contact_name, business_address, profile_photo_url, created_at, business_type'),
      ]);

      console.log('Farmers:', farmers?.length, 'Buyers:', buyers?.length); // Debug log

      const mappedFarmers: User[] = (farmers || []).map(farmer => ({
        id: farmer.id,
        name: farmer.name,
        type: 'Farmer',
        image: farmer.profile_photo_url,
        location: farmer.complete_address || 'Unknown',
        rating: DEFAULT_RATING,
        description: 'Farmer specializing in agricultural produce',
        specialization: farmer.land_type || 'General Farming',
        productsListed: 0,
        totalSales: '0 ETH',
        memberSince: formatDate(farmer.created_at),
      }));

      const mappedBuyers: User[] = (buyers || []).map(buyer => ({
        id: buyer.id,
        name: buyer.contact_name,
        type: 'Buyer',
        image: buyer.profile_photo_url,
        location: buyer.business_address || 'Unknown',
        rating: DEFAULT_RATING,
        description: 'Buyer interested in agricultural products',
        specialization: buyer.business_type || 'General Buying',
        productsListed: 0,
        totalSales: '0 Orders',
        memberSince: formatDate(buyer.created_at),
      }));

      setUsers([...mappedFarmers, ...mappedBuyers]);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    console.log('useEffect triggered'); // Debug log
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      console.log('Debounced searchQuery set to:', value); // Debug log
      setSearchQuery(value);
    }, 300),
    []
  );

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return [];
    const query = normalizeString(searchQuery);
    return users.filter(user =>
      (normalizeString(user.name).includes(query) || normalizeString(user.type).includes(query)) &&
      user.id !== excludeUserId
    );
  }, [searchQuery, users, excludeUserId]);

  // Handlers
  const handleModalToggle = useCallback((user?: User) => {
    console.log('Modal toggle, user:', user?.name, 'isModalOpen:', !!user); // Debug log
    setSelectedUser(user || null);
    setIsModalOpen(!!user);
    if (!user) setSearchQuery('');
  }, []);

  const handleViewProfile = useCallback((user: User) => {
    setTimeout(() => navigate(`/profile/${user.type.toLowerCase()}/${user.id}`, { state: { scrollToTop: true } }), ANIMATION_DURATION);
    handleModalToggle();
  }, [navigate, handleModalToggle]);

  const handleImageError = useCallback((userId: string) => {
    setImageErrors(prev => new Set(prev).add(userId));
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Components
  const UserAvatar = React.memo(({ user }: { user: User }) => (
    <div className="avatar-container">
      {imageErrors.has(user.id) || !user.image ? (
        <div className="avatar-fallback">{user.name[0]}</div>
      ) : (
        <img
          src={user.image}
          alt={user.name}
          className="avatar-image"
          onError={() => handleImageError(user.id)}
        />
      )}
    </div>
  ));

  // Debug render
  console.log('Rendering SearchUsers, users:', users.length, 'searchQuery:', searchQuery);

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <Search className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleInputChange}
        />
      </div>

      {searchQuery && (
        <div className="search-results">
          {filteredUsers.length ? (
            filteredUsers.map(user => (
              <button key={user.id} className="result-item" onClick={() => handleModalToggle(user)}>
                <UserAvatar user={user} />
                <div className="result-info">
                  <span className="result-name">{user.name}</span>
                  <span className="result-type">{user.type}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="no-results">No users found</div>
          )}
        </div>
      )}

      {selectedUser && (
        <div className={`modal ${isModalOpen ? 'modal-open' : 'modal-close'}`}>
          <div className="modal-overlay" onClick={() => handleModalToggle()} />
          <div className="modal-content">
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="modal-close-btn" onClick={() => handleModalToggle()}>×</button>
            </div>
            <div className="modal-body">
              <div className="profile-header">
                <UserAvatar user={selectedUser} />
                <div className="profile-info">
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.type}</p>
                  <div className="rating">
                    <Star className="star-icon" />
                    <span>{selectedUser.rating}</span>
                  </div>
                </div>
              </div>
              <div className="profile-details">
                <div className="detail-item">
                  <h4>Location</h4>
                  <p>{selectedUser.location}</p>
                </div>
                <div className="detail-item">
                  <h4>Member Since</h4>
                  <p>{selectedUser.memberSince}</p>
                </div>
                <div className="detail-item full-width">
                  <h4>About</h4>
                  <p>{selectedUser.description}</p>
                </div>
                <div className="detail-item full-width">
                  <h4>Details</h4>
                  <div className="stats">
                    <p>Specialization: <span>{selectedUser.specialization}</span></p>
                    <p>Products Listed: <span>{selectedUser.productsListed}</span></p>
                    <p>Total Sales: <span>{selectedUser.totalSales}</span></p>
                  </div>
                </div>
              </div>
              <button className="view-profile-btn" onClick={() => handleViewProfile(selectedUser)}>
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SearchUsers.displayName = 'SearchUsers';
export default SearchUsers;