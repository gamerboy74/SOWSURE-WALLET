import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import ImageSlider from "../components/ImageSlider";

interface Stat {
  name: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Product {
  id: string;
  type: "sell" | "buy";
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  location: string;
  category: string;
  created_at: string;
  status: "active" | "draft" | "sold_out" | "archived";
  featured: boolean;
}

const statIcons = {
  active_listings: Package,
  registered_farmers: Users,
  daily_transactions: TrendingUp,
  verified_buyers: ShoppingBag,
};

const AuthHome: React.FC = React.memo(() => {
  const [featuredListings, setFeaturedListings] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Featured Listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("products")
          .select("*")
          .eq("featured", true)
          .eq("status", "active")
          .limit(6);

        if (listingsError) throw listingsError;
        setFeaturedListings(listingsData || []);

        // Fetch Platform Stats
        const { data: statsData, error: statsError } = await supabase
          .from("platform_stats")
          .select("*")
          .single();

        if (statsError) throw statsError;
        if (statsData) {
          const formattedStats: Stat[] = [
            {
              name: "Active Listings",
              value: `${statsData.active_listings.toLocaleString("en-IN")}+`,
              icon: statIcons.active_listings,
            },
            {
              name: "Registered Farmers",
              value: `${statsData.registered_farmers.toLocaleString("en-IN")}+`,
              icon: statIcons.registered_farmers,
            },
            {
              name: "Daily Transactions",
              value: `₹${(statsData.daily_transactions / 100000).toFixed(1)}L+`,
              icon: statIcons.daily_transactions,
            },
            {
              name: "Verified Buyers",
              value: `${statsData.verified_buyers.toLocaleString("en-IN")}+`,
              icon: statIcons.verified_buyers,
            },
          ];
          setStats(formattedStats);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-gradient-to-b from-emerald-50 via-gray-50 to-white min-h-screen">
      {/* Hero Section with ImageSlider */}
      <section className="relative overflow-hidden" aria-label="Featured images">
        <ImageSlider />
      </section>

      {/* Stats Section */}
      <section
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16"
        aria-label="Platform statistics"
      >
        {loading ? (
          <div className="text-center text-gray-600">Loading stats...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className="group bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transform hover:-translate-y-2 transition-all duration-300 border border-emerald-100 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-100 rounded-full group-hover:bg-emerald-200 group-hover:scale-110 transition-all duration-300">
                      <Icon className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-emerald-700 group-hover:text-emerald-800 transition-colors duration-200">
                        {stat.value}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Listings Section */}
      <section
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16"
        aria-label="Featured listings"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-10 animate-fade-in bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Featured Listings
        </h2>
        {loading ? (
          <div className="text-center text-gray-600">Loading featured listings...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : featuredListings.length === 0 ? (
          <div className="text-center text-gray-600">No featured listings available.</div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((listing, index) => (
              <Link
                to={`/product/${listing.id}`}
                key={listing.id}
                className="group bg-white rounded-2xl shadow-md overflow-hidden transform hover:-translate-y-2 hover:shadow-xl transition-all duration-300 opacity-0 animate-slide-in-right border border-emerald-100"
                style={{ animationDelay: `${index * 150}ms` }}
                aria-label={`${listing.type === "sell" ? "Sell" : "Buy"}: ${listing.name}`}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={listing.image_url || "/fallback-image.jpg"}
                    alt={listing.name}
                    className="w-full h-56 object-cover transform group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => (e.currentTarget.src = "/fallback-image.jpg")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                    <span className="text-white text-sm font-semibold bg-emerald-500/80 px-3 py-1 rounded-full shadow-md transform group-hover:scale-105 transition-transform duration-200">
                      View Details
                    </span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm transform group-hover:scale-105 transition-transform duration-200 ${
                        listing.type === "sell"
                          ? "bg-emerald-500 text-white group-hover:bg-emerald-600"
                          : "bg-teal-500 text-white group-hover:bg-teal-600"
                      }`}
                    >
                      {listing.type === "sell" ? "Selling" : "Buying"}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200 line-clamp-1 mb-2">
                    {listing.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {listing.description || "No description available"}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700 flex items-center text-sm">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" aria-hidden="true"></span>
                      {listing.location}
                    </p>
                    <p className="text-lg font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors duration-200">
                      ₹{listing.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                    <span>{listing.category.toUpperCase()}</span>
                    <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

AuthHome.displayName = "AuthHome";

export default AuthHome;