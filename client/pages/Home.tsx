import React from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingBag, TrendingUp, Users } from "lucide-react";
import ImageSlider from "../components/ImageSlider";

interface Stat {
  name: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Listing {
  id: number;
  title: string;
  price: string;
  location: string;
  type: "sell" | "buy";
  image: string;
}

const stats: Stat[] = [
  { name: "Active Listings", value: "2,500+", icon: Package },
  { name: "Registered Farmers", value: "1,200+", icon: Users },
  { name: "Daily Transactions", value: "₹5L+", icon: TrendingUp },
  { name: "Verified Buyers", value: "500+", icon: ShoppingBag },
];

const featuredListings: Listing[] = [
  {
    id: 1,
    title: "Premium Organic Wheat",
    price: "₹2,500/quintal",
    location: "Punjab",
    type: "sell",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: 2,
    title: "Bulk Rice Purchase",
    price: "₹3,000/quintal",
    location: "Gujarat",
    type: "buy",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: 3,
    title: "Fresh Vegetables",
    price: "₹40/kg",
    location: "Maharashtra",
    type: "sell",
    image: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&q=80&w=400",
  },
];

const AuthHome: React.FC = React.memo(() => {
  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden" aria-label="Featured images">
        <ImageSlider />
      </section>

      {/* Stats Section */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        aria-label="Platform statistics"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.name}
                className="group bg-white p-6 rounded-xl shadow-soft hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 border border-gray-100 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors duration-300">
                    <Icon className="h-8 w-8 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-extrabold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Listings */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        aria-label="Featured listings"
      >
        <h2 className="text-3xl font-extrabold text-gray-900 mb-10 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent animate-fade-in">
          Featured Listings
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featuredListings.map((listing, index) => (
            <Link
              to={`/product/${listing.id}`}
              key={listing.id}
              className="group bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-2xl transition-shadow-transform duration-300 opacity-0 animate-slide-in-right"
              style={{ animationDelay: `${index * 100}ms` }}
              aria-label={`${listing.type === "sell" ? "Sell" : "Buy"}: ${listing.title}`}
            >
              <div className="relative overflow-hidden">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="w-full h-56 object-cover transform group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => (e.currentTarget.src = "/fallback-image.jpg")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-white text-sm font-medium">
                    View Details
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200 line-clamp-1">
                    {listing.title}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium transform group-hover:scale-105 transition-transform duration-200 ${
                      listing.type === "sell"
                        ? "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                        : "bg-teal-100 text-teal-700 group-hover:bg-teal-200"
                    }`}
                  >
                    {listing.type === "sell" ? "Selling" : "Buying"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-600 flex items-center text-sm">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" aria-hidden="true"></span>
                    {listing.location}
                  </p>
                  <p className="text-xl font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors duration-200">
                    {listing.price}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
});

AuthHome.displayName = "AuthHome";

export default AuthHome;