import React, { lazy, Suspense, memo, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  publicRoutes,
  farmerRoutes,
  buyerRoutes,
  sharedRoutes,
  adminRoutes,
} from "./routes";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import AdminProtectedRoute from "../client/admin/components/AdminProtectedRoute"; // Original path kept
import { ToastContainer } from "react-toastify"; // Kept as per your original
import "react-toastify/dist/ReactToastify.css";
import { NotificationProvider } from "./context/NotificationContext"; // Added notification provider

// Lazy-loaded components
const AuthHome = lazy(() => import("../client/pages/Home"));
const Navbar = lazy(() => import("../client/components/Navbar/Navbar"));
const Footer = lazy(() => import("../client/components/Footer"));
const Sidebar = lazy(() => import("../client/components/Sidebar"));
const AdminLayout = lazy(() => import("../client/admin/pages/AdminLayout"));

// Type definitions for MainLayout props
interface MainLayoutProps {
  isAuthenticated: boolean;
  userType: "farmer" | "buyer" | undefined;
}

// Memoized MainLayout with TypeScript
const MainLayout = memo(({ isAuthenticated, userType }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex transition-all duration-300 ease-in-out">
      {isAuthenticated && (
        <Suspense fallback={<LoadingSpinner />}>
          <div className="transition-all duration-300 ease-in-out">
            <Sidebar userType={userType} />
          </div>
        </Suspense>
      )}
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        <Suspense fallback={<LoadingSpinner />}>
          <div className="sticky top-0 z-50 backdrop-blur-sm bg-white/75 shadow-sm w-full">
            <Navbar isAuthenticated={isAuthenticated} />
          </div>
        </Suspense>
        <div
          className={`flex-grow p-4 md:p-6 lg:p-8 ${
            isAuthenticated ? "ml-12" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <div className="mt-auto">
            <Footer />
          </div>
        </Suspense>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
});

// Main App Component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider> {/* Added NotificationProvider */}
        <Router>
          <AppContent />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

// Separated content for cleaner rendering logic
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;
  const userType = user?.user_metadata?.type as "farmer" | "buyer" | undefined;

  const mainLayoutProps = useMemo<MainLayoutProps>(
    () => ({ isAuthenticated, userType }),
    [isAuthenticated, userType]
  );

  if (loading) {
    return <LoadingSpinner text="Initializing application..." />;
  }

  return (
    <Suspense fallback={<LoadingSpinner text="Loading page..." />}>
      <Routes>
        {/* Admin Routes */}
        {adminRoutes.map((route) =>
          route.path === "/admin/login" ? (
            <Route
              path={route.path}
              element={<route.element />}
              key={route.key}
            />
          ) : (
            <Route
              path="/admin/*"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
              key="admin"
            >
              {adminRoutes
                .filter((r) => r.path !== "/admin/login")
                .map((route) => (
                  <Route
                    path={route.path === "/" ? undefined : route.path}
                    index={route.isIndex}
                    element={<route.element />}
                    key={route.key}
                  />
                ))}
            </Route>
          )
        )}

        {/* Main App Routes */}
        <Route element={<MainLayout {...mainLayoutProps} />}>
          {/* Public Routes */}
          {publicRoutes.map((route) => (
            <Route
              path={route.path}
              element={
                route.path === "/" && isAuthenticated ? (
                  <AuthHome />
                ) : (
                  <route.element />
                )
              }
              key={route.key}
            />
          ))}

          {/* Farmer Routes */}
          {farmerRoutes.map((route) => (
            <Route
              path={route.path}
              element={
                <ProtectedRoute
                  userTypeRequired="farmer"
                  element={<route.element />}
                  redirectTo="/farmer/login"
                />
              }
              key={route.key}
            />
          ))}

          {/* Buyer Routes */}
          {buyerRoutes.map((route) => (
            <Route
              path={route.path}
              element={
                <ProtectedRoute
                  userTypeRequired="buyer"
                  element={<route.element />}
                  redirectTo="/buyer/login"
                />
              }
              key={route.key}
            />
          ))}

          {/* Shared Routes */}
          {sharedRoutes.map((route) => (
            <Route
              path={route.path}
              element={
                <ProtectedRoute
                  element={<route.element />}
                  redirectTo={userType ? `/${userType}/login` : "/farmer/login"}
                />
              }
              key={route.key}
            />
          ))}
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;