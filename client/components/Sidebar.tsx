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
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  userType?: "farmer" | "buyer";
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = "", userType }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  // Hide sidebar on login/register pages or if userType is undefined
  if (
    !userType ||
    location.pathname.includes("/login") ||
    location.pathname.includes("/register")
  ) {
    return null;
  }

  const farmerMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/farmer/dashboard" },
    { icon: Store, label: "My Products", path: "/farmer/products" },
    { icon: Package, label: "Orders", path: "/farmer/orders" },
    { icon: Truck, label: "Shipments", path: "/farmer/shipments" },
    { icon: Wallet, label: "Wallet", path: "/farmer/wallet" },
    { icon: History, label: "Transaction History", path: "/transactions" },
    { icon: BarChart2, label: "Analytics", path: "/farmer/analytics" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const buyerMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/buyer/dashboard" },
    { icon: Store, label: "My Products", path: "/buyer/products" },
    { icon: Package, label: "My Orders", path: "/buyer/orders" },
    { icon: Wallet, label: "Wallet", path: "/buyer/wallet" },
    { icon: History, label: "Transaction History", path: "/transactions" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const menuItems = userType === "farmer" ? farmerMenuItems : buyerMenuItems;

  return (
    <aside
      className={`fixed left-0 bg-white shadow-md transition-all duration-300 z-50 ${
        isExpanded ? "w-52" : "w-12"
      } ${className} md:hover:w-52`}
      style={{
        top: "64px",
        height: "calc(100vh - 64px)",
      }}
      onMouseEnter={(e) => {
        if (window.innerWidth >= 768) setIsExpanded(true);
      }}
      onMouseLeave={(e) => {
        if (window.innerWidth >= 768) setIsExpanded(false);
      }}
    >
      <div className="flex justify-end p-2 md:hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-600 hover:text-emerald-600 p-1 rounded-full hover:bg-gray-100"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className="mt-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-5 w-5 min-w-[20px]" />
              <span
                className={`ml-3 text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                } md:opacity-100 md:w-auto`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;