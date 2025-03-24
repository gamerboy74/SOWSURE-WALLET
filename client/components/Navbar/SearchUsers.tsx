import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "../../lib/supabase";

// Assuming UserProfileModal is a separate component
import UserProfileModal from "./UserProfileModal";

interface User {
  id: string;
  name: string;
  type: "Farmer" | "Buyer";
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

const DEFAULT_RATING = 4.5;
const ANIMATION_DURATION = 300;

const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const SearchUsers: React.FC<SearchUsersProps> = React.memo(({ excludeUserId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState(""); // Immediate input feedback
  const [searchQuery, setSearchQuery] = useState(""); // Debounced filter value
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isNavigating, setIsNavigating] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch users from Supabase with a limit for performance
  const fetchUsers = useCallback(async () => {
    try {
      const [farmersResponse, buyersResponse] = await Promise.all([
        supabase.from("farmers").select("id, name, complete_address, profile_photo_url, created_at, land_type").limit(50),
        supabase.from("buyers").select("id, contact_name, business_address, profile_photo_url, created_at, business_type").limit(50),
      ]);

      const farmers: User[] = (farmersResponse.data || []).map((farmer) => ({
        id: farmer.id,
        name: farmer.name,
        type: "Farmer",
        image: farmer.profile_photo_url,
        location: farmer.complete_address || "Unknown",
        rating: DEFAULT_RATING,
        description: "Farmer specializing in agricultural produce",
        specialization: farmer.land_type || "General Farming",
        productsListed: 0,
        totalSales: "0 ETH",
        memberSince: new Date(farmer.created_at).toISOString().split("T")[0],
      }));

      const buyers: User[] = (buyersResponse.data || []).map((buyer) => ({
        id: buyer.id,
        name: buyer.contact_name,
        type: "Buyer",
        image: buyer.profile_photo_url,
        location: buyer.business_address || "Unknown",
        rating: DEFAULT_RATING,
        description: "Buyer interested in agricultural products",
        specialization: buyer.business_type || "General Buying",
        productsListed: 0,
        totalSales: "0 Orders",
        memberSince: new Date(buyer.created_at).toISOString().split("T")[0],
      }));

      setUsers([...farmers, ...buyers]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Memoized filtering of users
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    return users.filter(
      (user) =>
        (user.name.toLowerCase().includes(query) || user.type.toLowerCase().includes(query)) &&
        user.id !== excludeUserId
    );
  }, [searchQuery, users, excludeUserId]);

  const handleCloseModal = useCallback(() => {
    setIsModalClosing(true);
    setTimeout(() => {
      setSelectedUser(null);
      setIsModalClosing(false);
      setInputValue("");
      setSearchQuery("");
      setShowResults(false);
      setIsExpanded(false);
    }, ANIMATION_DURATION);
  }, []);

  const handleUserSelect = useCallback((user: User) => {
    setSelectedUser(user);
    setShowResults(false);
  }, []);

  const handleViewProfile = useCallback((user: User) => {
    setIsNavigating(true);
    setTimeout(() => {
      setIsModalClosing(true);
      setTimeout(() => {
        setSelectedUser(null);
        setIsModalClosing(false);
        setIsNavigating(false);
        navigate(`/profile/${user.type.toLowerCase()}/${user.id}`);
        window.scrollTo(0, 0);
      }, ANIMATION_DURATION);
    }, 400);
  }, [navigate]);

  const handleImageError = useCallback((userId: string) => {
    setImageErrors((prev) => new Set(prev).add(userId));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setInputValue("");
        setSearchQuery("");
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search handler with reduced delay
  const handleSearchChange = debounce((value: string) => {
    setSearchQuery(value);
    setShowResults(true);
  }, 150);

  // Memoized UserAvatar component
  const UserAvatar = React.memo(({ user }: { user: User }) => (
    imageErrors.has(user.id) || !user.image ? (
      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-emerald-50">
        <span className="text-gray-600 text-sm font-medium group-hover:text-emerald-600">{user.name[0]}</span>
      </div>
    ) : (
      <img
        src={user.image}
        alt={user.name}
        loading="lazy" // Lazy load images
        className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-emerald-200"
        onError={() => handleImageError(user.id)}
      />
    )
  ));
  UserAvatar.displayName = "UserAvatar";

  return (
    <div ref={searchRef} className={`relative flex items-center transition-all duration-300 ${isExpanded ? "w-48 md:w-64" : "w-10"}`}>
      <button
        onClick={() => setIsExpanded(true)}
        className={`p-2 rounded-full hover:bg-gray-100 ${isExpanded ? "hidden" : "block"}`}
        aria-label="Expand search"
      >
        <Search className="h-5 w-5 text-gray-600" />
      </button>
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search users..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleSearchChange(e.target.value);
          }}
          onFocus={() => setIsExpanded(true)}
          className={`w-full p-2 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isExpanded ? "block" : "hidden"}`}
        />
        {isExpanded && <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />}
        {showResults && searchQuery && (
          <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border max-h-[300px] overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  className="w-full px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 group"
                  onClick={() => handleUserSelect(user)}
                >
                  <UserAvatar user={user} />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-emerald-600">{user.name}</div>
                    <div className="text-xs text-gray-600 group-hover:text-gray-700">{user.type}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 rounded-b-lg">No users found</div>
            )}
          </div>
        )}
      </div>
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={handleCloseModal}
          onViewProfile={handleViewProfile}
          isClosing={isModalClosing}
          imageErrors={imageErrors}
          onImageError={handleImageError}
          isNavigating={isNavigating}
        />
      )}
    </div>
  );
});

SearchUsers.displayName = "SearchUsers";
export default SearchUsers;