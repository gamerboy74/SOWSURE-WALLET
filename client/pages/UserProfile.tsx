import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Search, ChevronDown, MapPin, Star, MessageCircle } from "lucide-react";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileStats from "../components/profile/ProfileStats";
import ProductCard from "../components/profile/ProductCard";

const categories = ["All Products", "Vegetables", "Fruits", "Grains", "Herbs"];

// Mock data for demonstration
const mockProducts = [
  {
    id: "1",
    name: "Organic Bell Peppers",
    price: "0.14 ETH",
    fiatPrice: "$420",
    quantity: "180 kg",
    image:
      "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&q=80&w=400",
    rating: 4.7,
    seller: {
      id: "1",
      name: "Isabella Thompson",
      image:
        "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400",
    },
    currentUserId: "1",
  },
  // ... other products
];

function UserProfile() {
  const { id } = useParams();
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock user data
  const user = {
    id: "1",
    name: "Isabella Thompson",
    type: "Farmer",
    image:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400",
    location: "Vermont, USA",
    rating: 4.9,
    totalProducts: 15,
    totalSales: "25.5 ETH",
    about:
      "Dedicated organic farmer with 10 years of experience in sustainable agriculture. Specializing in heirloom vegetables and regenerative farming practices.",
    memberSince: "2024-08-15",
  };

  const handleContact = () => {
    console.log("Contact user");
  };

  const filteredProducts = mockProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header with enhanced styling */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <img
                src={user.image}
                alt={user.name}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-emerald-50"
              />
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user.name}
                  </h1>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                    {user.type}
                  </span>
                </div>
                <div className="flex items-center mt-2 text-gray-600">
                  <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{user.location}</span>
                </div>
                <div className="flex items-center mt-2 text-yellow-400">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="ml-2 text-gray-900 font-medium">
                    {user.rating}
                  </span>
                </div>
                <p className="mt-4 text-gray-600 max-w-2xl">{user.about}</p>
              </div>
            </div>
            <button
              onClick={handleContact}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transform transition-all duration-200 hover:shadow-md active:scale-95 flex items-center"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Contact
            </button>
          </div>
        </div>

        {/* Stats Section with enhanced styling */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <p className="text-sm font-medium text-gray-500">Member Since</p>
            <p className="mt-2 text-xl font-bold text-gray-900">
              {new Date(user.memberSince).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <p className="text-sm font-medium text-gray-500">Total Products</p>
            <p className="mt-2 text-xl font-bold text-emerald-600">
              {user.totalProducts}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <p className="text-sm font-medium text-gray-500">Total Sales</p>
            <p className="mt-2 text-xl font-bold text-emerald-600">
              {user.totalSales}
            </p>
          </div>
        </div>

        {/* Categories and Search Section with enhanced styling */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeCategory === category
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 rounded-md pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option>Latest</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Rating</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid with enhanced gap */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              fiatPrice={product.fiatPrice}
              quantity={product.quantity}
              image={product.image}
              rating={product.rating}
              seller={product.seller}
              currentUserId={product.currentUserId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
