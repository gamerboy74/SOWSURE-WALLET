import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star } from "lucide-react";

interface User {
  id: string;
  name: string;
  type: string;
  image: string;
  location: string;
  rating: number;
  description: string;
  specialization: string;
  productsListed: number;
  totalSales: string;
  memberSince: string;
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Isabella Thompson",
    type: "Farmer",
    image:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=100",
    location: "Vermont, USA",
    rating: 4.9,
    description:
      "Dedicated organic farmer with 10 years of experience in sustainable agriculture. Specializing in heirloom vegetables and regenerative farming practices.",
    specialization: "Organic Vegetables",
    productsListed: 15,
    totalSales: "25.5 ETH",
    memberSince: "2024-08-15",
  },
  {
    id: "2",
    name: "Marcus Chen",
    type: "Buyer",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100",
    location: "California, USA",
    rating: 4.7,
    description:
      "Wholesale buyer for organic produce markets. Looking for reliable suppliers of premium quality organic fruits and vegetables.",
    specialization: "Organic Produce",
    productsListed: 0,
    totalSales: "50+ Orders",
    memberSince: "2024-07-20",
  },
  {
    id: "3",
    name: "Sarah Martinez",
    type: "Farmer",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
    location: "Texas, USA",
    rating: 4.8,
    description:
      "Third-generation farmer specializing in sustainable grain production. Certified organic farm with state-of-the-art storage facilities.",
    specialization: "Organic Grains",
    productsListed: 8,
    totalSales: "15.2 ETH",
    memberSince: "2024-06-10",
  },
];

function SearchUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const handleCloseModal = useCallback(() => {
    setIsModalClosing(true);
    const timeout = setTimeout(() => {
      setSelectedUser(null);
      setIsModalClosing(false);
      setSearchQuery("");
      setShowResults(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleCloseModal]);

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchQuery("");
    setShowResults(false);
  };

  const handleViewProfile = (user: User) => {
    setIsModalClosing(true);
    const timeout = setTimeout(() => {
      setSelectedUser(null);
      setIsModalClosing(false);
      setSearchQuery("");
      setShowResults(false);
      navigate(`/profile/${user.type.toLowerCase()}/${user.id}`);
      window.scrollTo(0, 0);
    }, 300);
    return () => clearTimeout(timeout);
  };

  const handleImageError = (userId: string) => {
    setImageError((prev) => ({ ...prev, [userId]: true }));
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[300px] overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <div className="py-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  className="w-full px-4 py-2 hover:bg-gray-50 flex items-center space-x-3"
                  onClick={() => handleUserSelect(user)}
                >
                  {user.image && !imageError[user.id] ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                      onError={() => handleImageError(user.id)}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        {user.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500">{user.type}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No users found
            </div>
          )}
        </div>
      )}

      {selectedUser && (
        <div
          role="dialog"
          aria-labelledby="modal-title"
          aria-modal="true"
          className="fixed inset-0 z-[999]"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[998]"
            onClick={handleCloseModal}
          />
          <div className="fixed inset-0 z-[999] pointer-events-none">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div
                className={`bg-white rounded-lg shadow-xl w-[400px] max-w-full pointer-events-auto transition-all duration-300 ease-in-out transform ${
                  isModalClosing
                    ? "scale-95 opacity-0"
                    : "scale-100 opacity-100"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 flex justify-between items-center border-b">
                  <h2 id="modal-title" className="text-lg font-semibold">
                    User Profile
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-500 text-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full p-1"
                    aria-label="Close"
                  >
                    <span className="sr-only">Close</span>×
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* User Info */}
                  <div className="flex items-center space-x-4">
                    {selectedUser.image && !imageError[selectedUser.id] ? (
                      <img
                        src={selectedUser.image}
                        alt={selectedUser.name}
                        className="h-16 w-16 rounded-full object-cover"
                        onError={() => handleImageError(selectedUser.id)}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-xl font-medium">
                          {selectedUser.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedUser.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedUser.type}
                      </p>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm font-medium">
                          {selectedUser.rating}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location and Member Since */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">
                        Location
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {selectedUser.location}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">
                        Member Since
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {selectedUser.memberSince}
                      </p>
                    </div>
                  </div>

                  {/* About */}
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">About</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      {selectedUser.description}
                    </p>
                  </div>

                  {/* Farming Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">
                      Farming Details
                    </h4>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      <p>Specialization: {selectedUser.specialization}</p>
                      <p>Products Listed: {selectedUser.productsListed}</p>
                      <p>Total Sales: {selectedUser.totalSales}</p>
                    </div>
                  </div>

                  {/* View Profile Button */}
                  <button
                    onClick={() => handleViewProfile(selectedUser)}
                    className="w-full bg-purple-600 text-white py-2.5 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                  >
                    View Profile
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
            setSearchQuery("");
          }}
        />
      )}
    </div>
  );
}

export default SearchUsers;
