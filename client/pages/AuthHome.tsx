import React from "react";
import { Link } from "react-router-dom";
import { Sprout, ShoppingBag } from "lucide-react";

const Home: React.FC = React.memo(() => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 overflow-hidden">
      {/* Hero Section */}
      <section
        className="text-center animate-fade-in"
        aria-label="Welcome to FarmConnect"
      >
        <Sprout
          className="mx-auto h-16 w-16 text-emerald-600 transition-transform duration-300 ease-in-out hover:scale-110"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl transition-all duration-500 ease-in-out">
          Welcome to FarmConnect
        </h1>
        <p className="mt-2 text-lg text-gray-600 max-w-2xl mx-auto opacity-0 animate-fade-in-up animation-delay-200">
          Empowering farmers and buyers with digital tools to connect, trade,
          and grow together.
        </p>
      </section>

      {/* Call to Action Cards */}
      <section
        className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2"
        aria-label="User options"
      >
        {/* Farmer Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 transform-gpu opacity-0 animate-slide-in-left">
          <Sprout
            className="mx-auto h-12 w-12 text-emerald-600 transition-transform duration-300 ease-in-out hover:rotate-12"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-2xl font-semibold text-gray-900 transition-colors duration-200">
            For Farmers
          </h2>
          <p className="mt-2 text-gray-600 transition-opacity duration-300">
            Register your farm, manage crops, and connect directly with buyers.
          </p>
          <div className="mt-6 space-y-4">
            <Link
              to="/farmer/login"
              className="block w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium shadow-md hover:bg-emerald-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
              aria-label="Login as a farmer"
            >
              Farmer Login
            </Link>
            <Link
              to="/farmer/register"
              className="block w-full text-emerald-600 border-2 border-emerald-600 py-3 px-4 rounded-lg font-medium hover:bg-emerald-50 hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
              aria-label="Create a farmer account"
            >
              Create Farmer Account
            </Link>
          </div>
        </div>

        {/* Buyer Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 transform-gpu opacity-0 animate-slide-in-right animation-delay-100">
          <ShoppingBag
            className="mx-auto h-12 w-12 text-emerald-600 transition-transform duration-300 ease-in-out hover:scale-110"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-2xl font-semibold text-gray-900 transition-colors duration-200">
            For Buyers
          </h2>
          <p className="mt-2 text-gray-600 transition-opacity duration-300">
            Source quality produce directly from verified farmers.
          </p>
          <div className="mt-6 space-y-4">
            <Link
              to="/buyer/login"
              className="block w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium shadow-md hover:bg-emerald-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
              aria-label="Login as a buyer"
            >
              Buyer Login
            </Link>
            <Link
              to="/buyer/register"
              className="block w-full text-emerald-600 border-2 border-emerald-600 py-3 px-4 rounded-lg font-medium hover:bg-emerald-50 hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
              aria-label="Create a buyer account"
            >
              Create Buyer Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
});

Home.displayName = "Home";

export default Home;
