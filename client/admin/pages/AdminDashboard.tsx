import React, { useEffect, useState, useCallback } from "react";
import { Users, ShoppingBag, TrendingUp, Sprout } from "lucide-react";
import { supabase } from "../../lib/supabase";
import StatsCard from "../components/StatsCard";
import DataTable from "../components/DataTable";
import { toast, Toaster } from "react-hot-toast";
import { useNotification } from "../../../src/context/NotificationContext";

interface Farmer {
  name: string;
  location: string;
  products: number;
  joined: string;
}

interface Buyer {
  name: string;
  location: string;
  orders: number;
  joined: string;
}

interface Stats {
  totalFarmers: number;
  totalBuyers: number;
  totalRevenue: string;
  activeProducts: number;
}

const AdminDashboard: React.FC = () => {
  const notification = useNotification();
  const [stats, setStats] = useState<Stats>({
    totalFarmers: 0,
    totalBuyers: 0,
    totalRevenue: "₹0",
    activeProducts: 0,
  });
  const [recentFarmers, setRecentFarmers] = useState<Farmer[]>([]);
  const [recentBuyers, setRecentBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Batch fetch counts and data
      const [
        { count: farmersCount },
        { count: buyersCount },
        { data: revenueData },
        { count: productsCount },
        { data: farmersData },
        { data: buyersData },
      ] = await Promise.all([
        supabase.from("farmers").select("*", { count: "exact", head: true }),
        supabase.from("buyers").select("*", { count: "exact", head: true }),
        supabase
          .from("products")
          .select("price, quantity")
          .eq("status", "sold_out"),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("farmers")
          .select("id, name, complete_address, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("buyers")
          .select("id, company_name, business_address, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Calculate farmer product counts
      const farmerProductCounts = await Promise.all(
        (farmersData || []).map(async (farmer: { id: string }) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("farmer_id", farmer.id);
          return count || 0;
        })
      );

      // Calculate buyer order counts
      const buyerOrderCounts = await Promise.all(
        (buyersData || []).map(async (buyer: { id: string }) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("buyer_id", buyer.id)
            .eq("type", "buy");
          return count || 0;
        })
      );

      // Calculate total revenue
      const totalRevenue = revenueData
        ? revenueData.reduce(
            (sum: number, product: { price: number; quantity: number }) =>
              sum + product.price * product.quantity,
            0
          )
        : 0;

      setStats({
        totalFarmers: farmersCount || 0,
        totalBuyers: buyersCount || 0,
        totalRevenue:
          totalRevenue > 0 ? `₹${(totalRevenue / 100000).toFixed(1)}L` : "₹0",
        activeProducts: productsCount || 0,
      });

      setRecentFarmers(
        (farmersData || []).map(
          (
            farmer: {
              name: string;
              complete_address: string;
              created_at: string;
            },
            index: number
          ) => ({
            name: farmer.name,
            location: farmer.complete_address || "N/A",
            products: farmerProductCounts[index],
            joined: new Date(farmer.created_at).toISOString().split("T")[0],
          })
        )
      );

      setRecentBuyers(
        (buyersData || []).map(
          (
            buyer: {
              company_name: string;
              business_address: string;
              created_at: string;
            },
            index: number
          ) => ({
            name: buyer.company_name,
            location: buyer.business_address || "N/A",
            orders: buyerOrderCounts[index],
            joined: new Date(buyer.created_at).toISOString().split("T")[0],
          })
        )
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
      toast.error("Error loading dashboard data", {
        position: "top-right",
        duration: 4000,
        style: { background: "#EF4444", color: "#fff", borderRadius: "8px" },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const farmerSubscription = supabase
      .channel("farmers-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "farmers" },
        (payload) => {
          notification.info(`New farmer: ${payload.new.name}`);
          fetchDashboardData();
        }
      )
      .subscribe();

    const buyerSubscription = supabase
      .channel("buyers-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "buyers" },
        (payload) => {
          notification.info(`New buyer: ${payload.new.company_name}`);
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(farmerSubscription);
      supabase.removeChannel(buyerSubscription);
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-indigo-500 border-gray-200 rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-700 animate-pulse">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-8">
      <Toaster />
      <h1 className="text-4xl font-extrabold text-gray-900 mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 animate-fade-in">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard
          title="Total Farmers"
          value={stats.totalFarmers.toLocaleString()}
          change="+12% from last month"
          trend="up"
          icon={Users}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-bounce-in bg-gradient-to-br from-green-50 to-green-100"
        />
        <StatsCard
          title="Total Buyers"
          value={stats.totalBuyers.toLocaleString()}
          change="+8% from last month"
          trend="up"
          icon={ShoppingBag}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-bounce-in bg-gradient-to-br from-blue-50 to-blue-100"
        />
        <StatsCard
          title="Total Revenue"
          value={stats.totalRevenue}
          change="+15% from last month"
          trend="up"
          icon={TrendingUp}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-bounce-in bg-gradient-to-br from-yellow-50 to-yellow-100"
        />
        <StatsCard
          title="Active Products"
          value={stats.activeProducts.toLocaleString()}
          change="+5% from last month"
          trend="up"
          icon={Sprout}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-bounce-in bg-gradient-to-br from-pink-50 to-pink-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 animate-fade-in-up">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-teal-500">
            Recent Farmers
          </h2>
          <DataTable
            columns={[
              { key: "name", label: "Name" },
              { key: "location", label: "Location" },
              { key: "products", label: "Products" },
              { key: "joined", label: "Joined" },
            ]}
            data={recentFarmers}
            className="text-gray-700"
          />
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 animate-fade-in-up">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500">
            Recent Buyers
          </h2>
          <DataTable
            columns={[
              { key: "name", label: "Name" },
              { key: "location", label: "Location" },
              { key: "orders", label: "Orders" },
              { key: "joined", label: "Joined" },
            ]}
            data={recentBuyers}
            className="text-gray-700"
          />
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.9); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes fadeInUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounceIn 0.6s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
