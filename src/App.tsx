import React, { useState, useEffect, memo, useRef, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { supabase } from "../client/lib/supabase";
import AuthHome from "../client/pages/AuthHome";
import Home from "../client/Home";
import Navbar from "../client/components/Navbar";
import Footer from "../client/components/Footer";
import Sidebar from "../client/components/Sidebar";
import FarmerRegister from "../client/farmer/FarmerRegister";
import BuyerRegister from "../client/buyer/BuyerRegister";
import FarmerLogin from "../client/farmer/FarmerLogin";
import BuyerLogin from "../client/buyer/BuyerLogin";
import FarmerDashboard from "../client/farmer/FarmerDashboard";
import BuyerDashboard from "../client/buyer/BuyerDashboard";
import BuyerProducts from "../client/pages/buyer/Products";
import FarmerAnalytics from "../client/pages/farmer/FarmerAnalytics";
import BuyerAnalytics from "../client/pages/buyer/BuyerAnalytics";
import Marketplace from "../client/pages/Marketplace";
import Orders from "../client/pages/Orders";
import UserProfile from "../client/pages/UserProfile";
import Products from "../client/pages/farmer/Products";
import Shipments from "../client/pages/farmer/Shipments";
import Transactions from "../client/pages/shared/Transactions";
import Messages from "../client/pages/shared/Messages";
import Settings from "../client/pages/shared/Settings";
import Notifications from "../client/pages/shared/Notifications";
import AdminLayout from "../client/admin/pages/AdminLayout";
import AdminDashboard from "../client/admin/pages/AdminDashboard";
import AdminLogin from "../client/admin/pages/AdminLogin";
import AdminProtectedRoute from "../client/admin/components/AdminProtectedRoute";
import FarmersManagement from "../client/admin/pages/FarmersManagement";
import BuyersManagement from "../client/admin/pages/BuyersManagement";
import ImageSlidersManagement from "../client/admin/pages/ImageSlidersManagement";
import FeaturedListingsManagement from "../client/admin/pages/FeaturedListingsManagement";
import Analytics from "../client/admin/pages/Analytics";
import NotificationsManagement from "../client/admin/pages/NotificationsManagement";
import AdminSettings from "../client/admin/pages/Settings";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ProductDetails from "../client/pages/ProductDetails";
import WalletDashboard from "../client/pages/wallet/WalletDashboard";
import WalletFundingRequests from "../client/admin/pages/WalletFundingRequests";

const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface MainLayoutProps {
  isAuthenticated: boolean;
  userType: "farmer" | "buyer" | undefined;
}

const MainLayout = memo(({ isAuthenticated, userType }: MainLayoutProps) => {
  const renderCount = useRef(0);
  const mountCount = useRef(0);

  useEffect(() => {
    mountCount.current += 1;
    console.log(
      `*** MainLayout mounted, mount count: ${mountCount.current} ***`
    );
    return () => {
      console.log(
        `*** MainLayout unmounted, mount count: ${mountCount.current} ***`
      );
    };
  }, []);

  renderCount.current += 1;
  console.log(
    `*** MainLayout rendered, render count: ${renderCount.current}, isAuthenticated: ${isAuthenticated}, userType: ${userType} ***`
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex transition-all duration-300 ease-in-out">
      {isAuthenticated && (
        <div className="transition-all duration-300 ease-in-out">
          <Sidebar userType={userType} />
        </div>
      )}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isAuthenticated ? "ml-16 lg:ml-20" : ""
        }`}
      >
        <div className="sticky top-0 z-50 backdrop-blur-sm bg-white/75 shadow-sm">
          <Navbar isAuthenticated={isAuthenticated} />
        </div>
        <div className="flex-grow p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"farmer" | "buyer" | undefined>(
    undefined
  );
  const renderCount = useRef(0);
  const mountCount = useRef(0);

  useEffect(() => {
    mountCount.current += 1;
    console.log(`*** App mounted, mount count: ${mountCount.current} ***`);
    return () => {
      console.log(`*** App unmounted, mount count: ${mountCount.current} ***`);
    };
  }, []);

  renderCount.current += 1;
  console.log(
    `*** App rendered, render count: ${renderCount.current}, isAuthenticated: ${isAuthenticated}, userType: ${userType} ***`
  );

  const debouncedSetAuthState = debounce((session) => {
    console.log("*** Debounced auth state update, session:", session, "***");
    const newIsAuthenticated = !!session;
    const newUserType = session?.user?.user_metadata?.type || undefined;

    if (newIsAuthenticated !== isAuthenticated || newUserType !== userType) {
      console.log(
        "*** Updating auth state:",
        { newIsAuthenticated, newUserType },
        "***"
      );
      setIsAuthenticated(newIsAuthenticated);
      setUserType(newUserType);
    } else {
      console.log(
        "*** No auth state update needed:",
        { newIsAuthenticated, newUserType },
        "***"
      );
    }
    setLoading(false);
  }, 1000);

  useEffect(() => {
    console.log("*** App useEffect triggered for session fetch ***");
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("*** Initial session fetch:", session, "***");
      debouncedSetAuthState(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("*** Auth state changed:", _event, session, "***");
      debouncedSetAuthState(session);
    });

    return () => {
      console.log("*** Cleaning up auth subscription ***");
      subscription.unsubscribe();
    };
  }, []);

  const mainLayoutProps = useMemo(
    () => ({
      isAuthenticated,
      userType,
    }),
    [isAuthenticated, userType]
  );

  if (loading) {
    return <LoadingSpinner text="Initializing application..." />;
  }

  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} key="admin-login" />
        <Route
          path="/admin/*"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
          key="admin"
        >
          <Route index element={<AdminDashboard />} key="admin-dashboard" />
          <Route
            path="farmers"
            element={<FarmersManagement />}
            key="admin-farmers"
          />
          <Route
            path="buyers"
            element={<BuyersManagement />}
            key="admin-buyers"
          />
          <Route
            path="sliders"
            element={<ImageSlidersManagement />}
            key="admin-sliders"
          />
          <Route
            path="featured"
            element={<FeaturedListingsManagement />}
            key="admin-featured"
          />
          <Route
            path="analytics"
            element={<Analytics />}
            key="admin-analytics"
          />
          <Route
            path="notifications"
            element={<NotificationsManagement />}
            key="admin-notifications"
          />
          <Route
            path="settings"
            element={<AdminSettings />}
            key="admin-settings"
          />
          <Route
            path="wallet/requests"
            element={<WalletFundingRequests />}
            key="admin-wallet-requests"
          />
        </Route>

        {/* Main App Routes */}
        <Route element={<MainLayout {...mainLayoutProps} />} key="main-layout">
          <Route
            path="/"
            element={isAuthenticated ? <AuthHome /> : <Home />}
            key="home"
          />
          <Route
            path="/farmer/register"
            element={<FarmerRegister />}
            key="farmer-register"
          />
          <Route
            path="/buyer/register"
            element={<BuyerRegister />}
            key="buyer-register"
          />
          <Route
            path="/farmer/login"
            element={<FarmerLogin />}
            key="farmer-login"
          />
          <Route
            path="/buyer/login"
            element={<BuyerLogin />}
            key="buyer-login"
          />

          {/* Marketplace Route - Accessible to all authenticated users */}
          <Route
            path="/marketplace"
            element={
              isAuthenticated ? <Marketplace /> : <Navigate to="/" replace />
            }
            key="marketplace"
          />

          {/* Farmer Routes */}
          <Route
            path="/farmer/dashboard"
            element={
              (console.log(
                "*** Evaluating farmer/dashboard route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <FarmerDashboard />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-dashboard"
          />
          <Route
            path="/farmer/products"
            element={
              (console.log(
                "*** Evaluating farmer/products route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <Products />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-products"
          />
          <Route
            path="/farmer/orders"
            element={
              (console.log(
                "*** Evaluating farmer/orders route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <Orders />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-orders"
          />
          <Route
            path="/farmer/shipments"
            element={
              (console.log(
                "*** Evaluating farmer/shipments route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <Shipments />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-shipments"
          />
          <Route
            path="/farmer/transactions"
            element={
              (console.log(
                "*** Evaluating farmer/transactions route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <Transactions />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-transactions"
          />
          <Route
            path="/farmer/analytics"
            element={
              (console.log(
                "*** Evaluating farmer/analytics route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <FarmerAnalytics />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-analytics"
          />
          <Route
            path="/farmer/messages"
            element={
              (console.log(
                "*** Evaluating farmer/messages route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <Messages />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-messages"
          />
          <Route
            path="/farmer/notifications"
            element={
              (console.log(
                "*** Evaluating farmer/notifications route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <Notifications />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-notifications"
          />
          <Route
            path="/farmer/settings"
            element={
              (console.log(
                "*** Evaluating farmer/settings route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "farmer" ? (
                <Settings />
              ) : (
                <Navigate to="/farmer/login" replace />
              ))
            }
            key="farmer-settings"
          />

          {/* Buyer Routes */}
          <Route
            path="/buyer/dashboard"
            element={
              (console.log(
                "*** Evaluating buyer/dashboard route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <BuyerDashboard />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-dashboard"
          />
          <Route
            path="/buyer/products"
            element={
              (console.log(
                "*** Evaluating buyer/products route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <BuyerProducts />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-products"
          />
          <Route
            path="/buyer/orders"
            element={
              (console.log(
                "*** Evaluating buyer/orders route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <Orders />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-orders"
          />
          <Route
            path="/buyer/contracts"
            element={
              (console.log(
                "*** Evaluating buyer/contracts route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <div>Contracts Page</div>
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-contracts"
          />
          <Route
            path="/buyer/farmers"
            element={
              (console.log(
                "*** Evaluating buyer/farmers route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <div>Farmers Page</div>
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-farmers"
          />
          <Route
            path="/buyer/wallet"
            element={
              (console.log(
                "*** Evaluating buyer/wallet route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <div>Wallet Page</div>
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-wallet"
          />
          <Route
            path="/buyer/transactions"
            element={
              (console.log(
                "*** Evaluating buyer/transactions route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <Transactions />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-transactions"
          />
          <Route
            path="/buyer/analytics"
            element={
              (console.log(
                "*** Evaluating buyer/analytics route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <BuyerAnalytics />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-analytics"
          />
          <Route
            path="/buyer/messages"
            element={
              (console.log(
                "*** Evaluating buyer/messages route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <Messages />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-messages"
          />
          <Route
            path="/buyer/notifications"
            element={
              (console.log(
                "*** Evaluating buyer/notifications route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <Notifications />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-notifications"
          />
          <Route
            path="/buyer/settings"
            element={
              (console.log(
                "*** Evaluating buyer/settings route:",
                { isAuthenticated, userType },
                "***"
              ),
              isAuthenticated && userType === "buyer" ? (
                <Settings />
              ) : (
                <Navigate to="/buyer/login" replace />
              ))
            }
            key="buyer-settings"
          />

          <Route
            path="/profile/:type/:id"
            element={
              isAuthenticated ? <UserProfile /> : <Navigate to="/" replace />
            }
            key="profile"
          />
          <Route
            path="/product/:id"
            element={
              isAuthenticated ? <ProductDetails /> : <Navigate to="/" replace />
            }
            key="product-details"
          />
          <Route
            path="/:userType/wallet"
            element={
              isAuthenticated ? (
                <WalletDashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            }
            key="wallet-dashboard"
          />
          <Route
            path="/wallet/dashboard"
            element={
              isAuthenticated ? (
                <WalletDashboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
            key="wallet-dashboard"
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
