import React, { useState, useEffect, useRef } from "react";
import { LogOut, User } from "lucide-react";

interface ProfileMenuProps {
  onLogout: () => void;
  profilePhoto: string | null;
  isLoading: boolean;
}

const ProfileMenu: React.FC<ProfileMenuProps> = React.memo(({ onLogout, profilePhoto, isLoading }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center text-gray-700 hover:text-emerald-600 p-1 rounded-full hover:bg-gray-100"
        aria-label="Profile menu"
        aria-expanded={showMenu}
      >
        <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="animate-pulse bg-emerald-200 h-full w-full" />
          ) : profilePhoto ? (
            <img
              src={profilePhoto}
              alt="Profile"
              className="h-full w-full object-cover"
              onError={(e) => (e.currentTarget.src = "")}
            />
          ) : (
            <User className="h-5 w-5 text-emerald-600" />
          )}
        </div>
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 border border-gray-100">
          <button
            onClick={onLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 inline mr-2" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
});

ProfileMenu.displayName = "ProfileMenu";
export default ProfileMenu;