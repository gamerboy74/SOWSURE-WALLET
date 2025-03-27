import React from "react";
import { lazy, LazyExoticComponent, ComponentType } from "react";

// Define Route interface
interface Route {
  path: string;
  element: LazyExoticComponent<ComponentType<any>>;
  key: string;
  isIndex?: boolean;
}

// Helper function to create lazy-loaded placeholder components
const createPlaceholder = (name: string) =>
  lazy(() =>
    Promise.resolve({
      default: () => React.createElement("div", null, name),
    })
  );

// Public Routes
export const publicRoutes: Route[] = [
  { path: "/", element: lazy(() => import("../client/pages/AuthHome")), key: "home" },
  { path: "/farmer/register", element: lazy(() => import("../client/farmer/FarmerRegister")), key: "farmer-register" },
  { path: "/buyer/register", element: lazy(() => import("../client/buyer/BuyerRegister")), key: "buyer-register" },
  { path: "/farmer/login", element: lazy(() => import("../client/farmer/FarmerLogin")), key: "farmer-login" },
  { path: "/buyer/login", element: lazy(() => import("../client/buyer/BuyerLogin")), key: "buyer-login" },
];

// Farmer Routes
export const farmerRoutes: Route[] = [
  { path: "/farmer/dashboard", element: lazy(() => import("../client/farmer/FarmerDashboard")), key: "farmer-dashboard" },
  { path: "/farmer/products", element: lazy(() => import("../client/pages/farmer/Products")), key: "farmer-products" },
  { path: "/farmer/orders", element: lazy(() => import("../client/pages/Orders")), key: "farmer-orders" },
  { path: "/farmer/shipments", element: lazy(() => import("../client/pages/farmer/Shipments")), key: "farmer-shipments" },
  { path: "/farmer/analytics", element: lazy(() => import("../client/pages/farmer/FarmerAnalytics")), key: "farmer-analytics" },
];

// Buyer Routes
export const buyerRoutes: Route[] = [
  { path: "/buyer/dashboard", element: lazy(() => import("../client/buyer/BuyerDashboard")), key: "buyer-dashboard" },
  { path: "/buyer/products", element: lazy(() => import("../client/pages/buyer/Products")), key: "buyer-products" },
  { path: "/buyer/orders", element: lazy(() => import("../client/pages/Orders")), key: "buyer-orders" },
  { path: "/buyer/contracts", element: createPlaceholder("Contracts"), key: "buyer-contracts" },
  { path: "/buyer/farmers", element: createPlaceholder("Farmers"), key: "buyer-farmers" },
  { path: "/buyer/wallet", element: lazy(() => import("../client/pages/wallet/WalletDashboard")), key: "wallet" },
  { path: "/buyer/analytics", element: lazy(() => import("../client/pages/buyer/BuyerAnalytics")), key: "buyer-analytics" },
];

// Shared Routes
export const sharedRoutes: Route[] = [
  { path: "/marketplace", element: lazy(() => import("../client/pages/Marketplace")), key: "marketplace" },
  { path: "/profile/:type/:id", element: lazy(() => import("../client/pages/UserProfile")), key: "profile" },
  { path: "/product/:id", element: lazy(() => import("../client/pages/ProductDetails")), key: "product-details" },
  { path: "/:userType/wallet", element: lazy(() => import("../client/pages/wallet/WalletDashboard")), key: "wallet-dashboard" },
  { path: "/wallet/dashboard", element: lazy(() => import("../client/pages/wallet/WalletDashboard")), key: "wallet-dashboard-alt" },
  { path: "/settings", element: lazy(() => import("../client/pages/shared/Settings")), key: "settings" },
  { path: "/messages", element: lazy(() => import("../client/pages/shared/Messages")), key: "messages" },
  { path: "/notifications", element: lazy(() => import("../client/pages/shared/Notifications")), key: "notifications" },
  { path: "/transactions", element: lazy(() => import("../client/pages/shared/Transactions")), key: "transactions" },
  { path: "/contracts", element: lazy(() => import("../client/pages/shared/Contracts")), key: "contracts" },
];

// Admin Routes
export const adminRoutes: Route[] = [
  { path: "/admin/login", element: lazy(() => import("../client/admin/pages/AdminLogin")), key: "admin-login" },
  { path: "/", element: lazy(() => import("../client/admin/pages/AdminDashboard")), key: "admin-dashboard", isIndex: true },
  { path: "farmers", element: lazy(() => import("../client/admin/pages/FarmersManagement")), key: "admin-farmers" },
  { path: "buyers", element: lazy(() => import("../client/admin/pages/BuyersManagement")), key: "admin-buyers" },
  { path: "sliders", element: lazy(() => import("../client/admin/pages/ImageSlidersManagement")), key: "admin-sliders" },
  { path: "featured", element: lazy(() => import("../client/admin/pages/FeaturedListingsManagement")), key: "admin-featured" },
  { path: "analytics", element: lazy(() => import("../client/admin/pages/Analytics")), key: "admin-analytics" },
  { path: "notifications", element: lazy(() => import("../client/admin/pages/NotificationsManagement")), key: "admin-notifications" },
  { path: "settings", element: lazy(() => import("../client/admin/pages/Settings")), key: "admin-settings" },
  { path: "wallet/requests", element: lazy(() => import("../client/admin/pages/WalletFundingRequests")), key: "admin-wallet-requests" },
];