import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link to="/" className="flex items-center">
              <Sprout className="h-7 w-7 text-emerald-600" />
              <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900">FarmConnect</span>
            </Link>
            <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
              Empowering farmers and buyers with digital tools to connect, trade, and grow together.
            </p>
            <div className="mt-4 flex space-x-3">
              <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors duration-200">
                <Facebook className="h-5 w-5 sm:h-6 sm:w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors duration-200">
                <Twitter className="h-5 w-5 sm:h-6 sm:w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors duration-200">
                <Instagram className="h-5 w-5 sm:h-6 sm:w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-600 transition-colors duration-200">
                <Linkedin className="h-5 w-5 sm:h-6 sm:w-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Quick Links</h3>
            <ul className="mt-3 space-y-2 sm:space-y-3">
              <li>
                <Link to="/marketplace" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Orders
                </Link>
              </li>
              <li>
                <Link to="/farmer/dashboard" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Farmer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/buyer/dashboard" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Buyer Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Support</h3>
            <ul className="mt-3 space-y-2 sm:space-y-3">
              <li>
                <a href="#" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Contact</h3>
            <ul className="mt-3 space-y-2 sm:space-y-3">
              <li className="text-sm sm:text-base text-gray-600 leading-relaxed">
                123 Agriculture Road,<br />
                Farming District,<br />
                New Delhi, 110001
              </li>
              <li>
                <a href="tel:+911234567890" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  +91 123 456 7890
                </a>
              </li>
              <li>
                <a href="mailto:info@farmconnect.com" className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200">
                  info@farmconnect.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-center text-xs sm:text-sm text-gray-400">
            © {new Date().getFullYear()} FarmConnect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;