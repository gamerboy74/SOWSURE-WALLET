import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { Star } from "lucide-react";

interface User {
  id: string;
  name: string;
  type: "Farmer" | "Buyer";
  image?: string;
  location: string;
  rating: number;
  description: string;
  specialization: string;
  productsListed: number;
  totalSales: string;
  memberSince: string;
}

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onViewProfile: (user: User) => void;
  isClosing: boolean;
  imageErrors: Set<string>;
  onImageError: (userId: string) => void;
  isNavigating: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = React.memo(
  ({ user, onClose, onViewProfile, isClosing, imageErrors, onImageError, isNavigating }) => {
    // Memoized UserAvatar
    const UserAvatar = useMemo(
      () =>
        React.memo(({ user }: { user: User }) =>
          imageErrors.has(user.id) || !user.image ? (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center transition-all duration-300 hover:bg-emerald-50 hover:scale-105">
              <span className="text-gray-600 text-xl font-semibold hover:text-emerald-600">{user.name[0]}</span>
            </div>
          ) : (
            <img
              src={user.image}
              alt={user.name}
              loading="lazy"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-100 transition-all duration-300 hover:ring-emerald-300 hover:scale-105"
              onError={() => onImageError(user.id)}
            />
          )
        ),
      [imageErrors, onImageError, user.id, user.image, user.name]
    );
    UserAvatar.displayName = "UserAvatar";

    // Modal content with portal
    const modalContent = (
      <div
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
        className="fixed inset-0 z-[999] overflow-y-auto"
      >
        {/* Enhanced Backdrop */}
        <div
          className={`fixed inset-0 bg-gradient-to-b from-black/70 to-gray-900/70 backdrop-blur-md transition-opacity duration-500 ease-in-out ${
            isClosing || isNavigating ? "opacity-0" : "opacity-100"
          }`}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center min-h-screen p-4">
          <div
            className={`bg-white rounded-xl shadow-2xl w-[400px] max-w-full pointer-events-auto transform transition-all duration-500 ease-in-out ${
              isClosing || isNavigating
                ? "scale-90 opacity-0 translate-y-8"
                : "scale-100 opacity-100 translate-y-0"
            }`}
          >
            {/* Header */}
            <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gradient-to-r from-gray-50 to-emerald-50 rounded-t-xl">
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                User Profile
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl focus:outline-none rounded-full p-1 hover:bg-gray-200 transition-all duration-200 hover:scale-110"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-5">
              {/* User Info */}
              <div className="flex items-center space-x-4">
                <UserAvatar user={user} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-300 hover:text-emerald-600">
                    {user.name}
                  </h3>
                  <p className="text-sm text-gray-600">{user.type}</p>
                  <div className="flex items-center mt-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current transition-transform duration-300 hover:scale-125" />
                    <span className="ml-1 text-sm font-medium text-gray-700">{user.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Location & Member Since */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Location</h4>
                  <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded-md transition-all duration-300 hover:bg-emerald-50 hover:shadow-sm">
                    {user.location}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Member Since</h4>
                  <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded-md transition-all duration-300 hover:bg-emerald-50 hover:shadow-sm">
                    {user.memberSince}
                  </p>
                </div>
              </div>

              {/* About */}
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">About</h4>
                <p className="mt-1 text-sm text-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-md shadow-inner transition-all duration-300 hover:bg-emerald-50 hover:shadow-md">
                  {user.description}
                </p>
              </div>

              {/* Details */}
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Details</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-md shadow-inner transition-all duration-300 hover:bg-emerald-50 hover:shadow-md">
                  <p>
                    Specialization: <span className="font-medium">{user.specialization}</span>
                  </p>
                  <p>
                    Products Listed: <span className="font-medium">{user.productsListed}</span>
                  </p>
                  <p>
                    Total Sales: <span className="font-medium">{user.totalSales}</span>
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onViewProfile(user)}
                disabled={isNavigating}
                className={`w-full py-2.5 rounded-lg focus:outline-none text-white transition-all duration-300 flex items-center justify-center shadow-lg ${
                  isNavigating
                    ? "bg-purple-500 cursor-not-allowed opacity-70 scale-95"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 hover:shadow-xl"
                }`}
                aria-label={isNavigating ? "Navigating" : "View Profile"}
              >
                {isNavigating ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <span className="flex items-center space-x-2">
                    <span>View Profile</span>
                    <svg
                      className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

UserProfileModal.displayName = "UserProfileModal";
export default UserProfileModal;