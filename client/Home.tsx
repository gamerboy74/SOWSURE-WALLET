import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShoppingBag } from 'lucide-react';

function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <Sprout className="mx-auto h-16 w-16 text-indigo-600" />
        <h1 className="mt-4 text-4xl font-bold text-gray-900">Welcome to FarmConnect</h1>
        <p className="mt-2 text-lg text-gray-600">
          Empowering farmers and buyers with digital tools to connect, trade, and grow together.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Sprout className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">For Farmers</h2>
          <p className="mt-2 text-gray-600">
            Register your farm, manage crops, and connect directly with buyers.
          </p>
          <div className="mt-6 space-y-4">
            <Link
              to="/farmer/login"
              className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              Farmer Login
            </Link>
            <Link
              to="/farmer/register"
              className="block w-full text-indigo-600 border border-indigo-600 py-2 px-4 rounded-md hover:bg-indigo-50"
            >
              Create Farmer Account
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">For Buyers</h2>
          <p className="mt-2 text-gray-600">
            Source quality produce directly from verified farmers.
          </p>
          <div className="mt-6 space-y-4">
            <Link
              to="/buyer/login"
              className="block w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700"
            >
              Buyer Login
            </Link>
            <Link
              to="/buyer/register"
              className="block w-full text-emerald-600 border border-emerald-600 py-2 px-4 rounded-md hover:bg-emerald-50"
            >
              Create Buyer Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;