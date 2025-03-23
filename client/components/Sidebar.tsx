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

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = "", userType }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  if (
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
    { icon: History, label: "Transaction History", path: "/farmer/transactions" },
    { icon: BarChart2, label: "Analytics", path: "/farmer/analytics" },
    { icon: MessageSquare, label: "Messages", path: "/farmer/messages" },
    { icon: Bell, label: "Notifications", path: "/farmer/notifications" },
    { icon: Settings, label: "Settings", path: "/farmer/settings" },
  ];

  const buyerMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/buyer/dashboard" },
    { icon: Store, label: "My Products", path: "/buyer/products" },
    { icon: Package, label: "My Orders", path: "/buyer/orders" },
    { icon: FileText, label: "Contracts", path: "/buyer/contracts" },
    { icon: Sprout, label: "Farmers", path: "/buyer/farmers" },
    { icon: Wallet, label: "Wallet", path: "/buyer/wallet" }, // Fixed path to match routes
    { icon: History, label: "Transaction History", path: "/buyer/transactions" },
    { icon: MessageSquare, label: "Messages", path: "/buyer/messages" },
    { icon: Bell, label: "Notifications", path: "/buyer/notifications" },
    { icon: Settings, label: "Settings", path: "/buyer/settings" },
  ];

  const menuItems = userType === "farmer" ? farmerMenuItems : buyerMenuItems;

  return (
    <aside
      className={`fixed left-0 bg-white shadow-md transition-all duration-300 z-40 ${
        isExpanded ? "w-52" : "w-14"
      } ${className}`}
      style={{
        top: "56px",
        height: "calc(100vh - 56px)",
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
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
                }`}
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