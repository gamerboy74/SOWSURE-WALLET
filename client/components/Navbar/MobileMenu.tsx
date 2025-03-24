import React from "react";
import { Link } from "react-router-dom";
import { Sprout, ShoppingCart } from "lucide-react";
import SearchUsers from "./SearchUsers";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  address?: string;
  balance?: { eth: string };
}

const MobileMenu: React.FC<MobileMenuProps> = React.memo(({ isOpen, onClose, userId, address, balance }) => {
  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-white border-t border-gray-100 py-4 px-6 transition-all duration-300">
      <Link
        to="/"
        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-2"
        onClick={onClose}
        aria-label="Home"
      >
        <Sprout className="h-4 w-4 inline mr-2" />
        Home
      </Link>
      <Link
        to="/marketplace"
        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg mb-2"
        onClick={onClose}
        aria-label="Marketplace"
      >
        <ShoppingCart className="h-4 w-4 inline mr-2" />
        Marketplace
      </Link>
      <div className="mb-4">
        <SearchUsers excludeUserId={userId} />
      </div>
      {address && (
        <div className="mt-4 flex flex-col space-y-2">
          <div className="px-4 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <div className="px-4 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg">
            {parseFloat(balance?.eth || "0").toFixed(4)} ETH
          </div>
        </div>
      )}
    </div>
  );
});

MobileMenu.displayName = "MobileMenu";
export default MobileMenu;