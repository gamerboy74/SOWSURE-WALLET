import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LuSprout, LuFacebook, LuTwitter, LuInstagram, LuLinkedin, LuLoader } from 'react-icons/lu';
import { supabase } from '../lib/supabase';

interface SiteSettings {
  site_name: string;
  support_email: string;
  contact_phone: string;
  contact_address: string;
  social_links: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
  };
}

function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('site_name, support_email, contact_phone, contact_address, social_links')
          .single();

        if (!isMounted) return;

        if (error && error.code !== 'PGRST116') {
          throw new Error('Failed to fetch site settings');
        }

        setSettings(
          data || {
            site_name: 'FarmConnect',
            support_email: 'info@farmconnect.com',
            contact_phone: '+91 123 456 7890',
            contact_address: '123 Agriculture Road, Farming District, New Delhi, 110001',
            social_links: { facebook: '', twitter: '', instagram: '', linkedin: '' }
          }
        );
      } catch (err) {
        if (!isMounted) return;

        setError('Unable to load footer information');
        setSettings({
          site_name: 'FarmConnect',
          support_email: 'info@farmconnect.com',
          contact_phone: '+91 123 456 7890',
          contact_address: '123 Agriculture Road, Farming District, New Delhi, 110001',
          social_links: { facebook: '', twitter: '', instagram: '', linkedin: '' }
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex justify-center items-center">
          <LuLoader className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {error && (
          <div className="mb-4 text-center text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}. Using default values.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link to="/" className="flex items-center">
              <LuSprout className="h-7 w-7 text-emerald-600" />
              <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900">{settings!.site_name}</span>
            </Link>
            <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
              Empowering farmers and buyers with digital tools to connect, trade, and grow together.
            </p>
            <div className="mt-4 flex space-x-3">
              {settings!.social_links.facebook && (
                <a
                  href={settings!.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-600 transition-colors duration-200"
                  aria-label="Facebook"
                >
                  <LuFacebook className="h-5 w-5 sm:h-6 sm:w-6" />
                </a>
              )}
              {settings!.social_links.twitter && (
                <a
                  href={settings!.social_links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-600 transition-colors duration-200"
                  aria-label="Twitter"
                >
                  <LuTwitter className="h-5 w-5 sm:h-6 sm:w-6" />
                </a>
              )}
              {settings!.social_links.instagram && (
                <a
                  href={settings!.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-600 transition-colors duration-200"
                  aria-label="Instagram"
                >
                  <LuInstagram className="h-5 w-5 sm:h-6 sm:w-6" />
                </a>
              )}
              {settings!.social_links.linkedin && (
                <a
                  href={settings!.social_links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-600 transition-colors duration-200"
                  aria-label="LinkedIn"
                >
                  <LuLinkedin className="h-5 w-5 sm:h-6 sm:w-6" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">Quick Links</h3>
            <ul className="mt-3 space-y-2 sm:space-y-3">
              <li>
                <Link
                  to="/marketplace"
                  className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  to="/orders"
                  className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200"
                >
                  Orders
                </Link>
              </li>
              <li>
                <Link
                  to="/farmer/dashboard"
                  className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200"
                >
                  Farmer Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/buyer/dashboard"
                  className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200"
                >
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
              <li className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                {settings!.contact_address}
              </li>
              <li>
                <a
                  href={`tel:${settings!.contact_phone}`}
                  className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200"
                >
                  {settings!.contact_phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings!.support_email}`}
                  className="text-sm sm:text-base text-gray-600 hover:text-emerald-600 transition-colors duration-200"
                >
                  {settings!.support_email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-center text-xs sm:text-sm text-gray-400">
            © {new Date().getFullYear()} {settings!.site_name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;