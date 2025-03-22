import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link to="/" className="flex items-center">
              <Sprout className="h-8 w-8 text-emerald-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">FarmConnect</span>
            </Link>
            <p className="mt-4 text-gray-600">
              Empowering farmers and buyers with digital tools to connect, trade, and grow together.
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-emerald-600">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-600">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-600">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-600">
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Quick Links</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/marketplace" className="text-gray-600 hover:text-emerald-600">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-gray-600 hover:text-emerald-600">
                  Orders
                </Link>
              </li>
              <li>
                <Link to="/farmer/dashboard" className="text-gray-600 hover:text-emerald-600">
                  Farmer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/buyer/dashboard" className="text-gray-600 hover:text-emerald-600">
                  Buyer Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Support</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <a href="#" className="text-gray-600 hover:text-emerald-600">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-emerald-600">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-emerald-600">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-emerald-600">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Contact</h3>
            <ul className="mt-4 space-y-4">
              <li className="text-gray-600">
                123 Agriculture Road,<br />
                Farming District,<br />
                New Delhi, 110001
              </li>
              <li>
                <a href="tel:+911234567890" className="text-gray-600 hover:text-emerald-600">
                  +91 123 456 7890
                </a>
              </li>
              <li>
                <a href="mailto:info@farmconnect.com" className="text-gray-600 hover:text-emerald-600">
                  info@farmconnect.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-center text-gray-400">
            © {new Date().getFullYear()} FarmConnect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;