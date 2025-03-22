import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  BarChart2,
  MessageSquare,
  Settings,
  Sprout,
  Truck,
  History,
  Wallet,
  Store,
  Users,
  Bell,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  userType?: "farmer" | "buyer";
}

function Sidebar({ className = "", userType }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  if (
    location.pathname.includes("/login") ||
    location.pathname.includes("/register")
  ) {
    return null;
  }

  const farmerMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/farmer/dashboard" },
    { icon: Store, label: "My Products", path: "/farmer/products" },
    { icon: Package, label: "Orders", path: "/farmer/orders" },
    { icon: Truck, label: "Shipments", path: "/farmer/shipments" },
    { icon: Wallet, label: "Wallet", path: "/farmer/wallet" },
    {
      icon: History,
      label: "Transaction History",
      path: "/farmer/transactions",
    },
    { icon: BarChart2, label: "Analytics", path: "/farmer/analytics" },
    { icon: MessageSquare, label: "Messages", path: "/farmer/messages" },
    { icon: Bell, label: "Notifications", path: "/farmer/notifications" },
    { icon: Settings, label: "Settings", path: "/farmer/settings" },
  ];

  const buyerMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/buyer/dashboard" },
    { icon: Store, label: "My Products", path: "/buyer/products" },
    { icon: Package, label: "My Orders", path: "/buyer/orders" },
    { icon: FileText, label: "Contracts", path: "/buyer/contracts" },
    { icon: Sprout, label: "Farmers", path: "/buyer/farmers" },
    { icon: Wallet, label: "Wallet", path: "/wallet/dashboard" }, // Updated path
    {
      icon: History,
      label: "Transaction History",
      path: "/buyer/transactions",
    },
    { icon: MessageSquare, label: "Messages", path: "/buyer/messages" },
    { icon: Bell, label: "Notifications", path: "/buyer/notifications" },
    { icon: Settings, label: "Settings", path: "/buyer/settings" },
  ];

  const menuItems = userType === "farmer" ? farmerMenuItems : buyerMenuItems;

  return (
    <div
      className={`fixed left-0 bg-white shadow-lg transition-all duration-300 z-40 ${
        isExpanded ? "w-64" : "w-16"
      } ${className}`}
      style={{
        top: "64px",
        height: "calc(100vh - 64px)",
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <nav className="mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-5 w-5 min-w-[20px]" />
              <span
                className={`ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default Sidebar;
