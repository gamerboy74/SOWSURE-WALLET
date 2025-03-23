import React, { useState } from "react";
import { Package, User, MapPin, Calendar, Tag } from "lucide-react"; // Added Tag icon for category
import { useNavigate } from "react-router-dom";

interface ListingCardProps {
  id: string;
  type: "sell" | "buy";
  title: string;
  quantity: string;
  price: string;
  location: string;
  image_url: string | null;
  user: {
    name: string;
    type: string;
    rating: number;
    profileImage: string | null;
  };
  postedDate: string;
  description: string;
  category: string; // Added category prop
}

const customStyles = `
  .button-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .button-transition::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%);
    transform: translateX(-100%);
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .button-transition:hover::after {
    transform: translateX(0);
  }
`;

const ListingCard: React.FC<ListingCardProps> = ({
  id,
  title,
  quantity,
  price,
  location,
  image_url,
  user,
  postedDate,
  description,
  type,
  category, // Destructure the new category prop
}) => {
  const [productImgError, setProductImgError] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const navigate = useNavigate();

  const handleProductImageError = () => {
    setProductImgError(true);
    console.error("Failed to load product image:", image_url);
  };

  const handleProfileImageError = () => {
    setProfileImgError(true);
    console.error("Failed to load profile image:", user.profileImage);
  };

  // Capitalize the first letter of the category for display
  const formattedCategory = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "Not specified";

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1">
      <style>{customStyles}</style>
      <div
        className={`px-4 py-2 ${
          type === "sell" ? "bg-emerald-50" : "bg-blue-50"
        } transition-colors duration-300`}
      >
        <span
          className={`text-sm font-medium ${
            type === "sell" ? "text-emerald-700" : "text-blue-700"
          }`}
        >
          {type === "sell" ? "Selling" : "Buying"}
        </span>
      </div>

      {/* Product Image */}
      <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
        {productImgError || !image_url ? (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-400 transition-transform duration-300 group-hover:scale-110" />
          </div>
        ) : (
          <img
            src={image_url}
            alt={title}
            onError={handleProductImageError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors duration-200">
          {title}
        </h3>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors duration-200">
            <Package className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
            <span>{quantity}</span>
          </div>
          <div className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors duration-200">
            <MapPin className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
            <span>{location}</span>
          </div>
          <div className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors duration-200">
            <Calendar className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
            <span>{new Date(postedDate).toLocaleDateString()}</span>
          </div>
          {/* Added Category Display */}
          <div className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors duration-200">
            <Tag className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:scale-110" />
            <span>{formattedCategory}</span>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2 group-hover:text-gray-900 transition-colors duration-200">
          {description || "No description available"}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center group/user">
            <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden ring-2 ring-transparent group-hover/user:ring-emerald-500 transition-all duration-300">
              {profileImgError || !user.profileImage ? (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600 transition-transform duration-200 group-hover:scale-110" />
                </div>
              ) : (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  onError={handleProfileImageError}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/user:scale-110"
                  loading="lazy"
                />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 group-hover/user:text-emerald-600 transition-colors duration-200">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 flex items-center">
                {user.type}{" "}
                <span className="mx-1 text-yellow-400 transition-transform duration-200 group-hover:scale-110">
                  ⭐
                </span>{" "}
                {user.rating}
              </p>
            </div>
          </div>
          <p className="text-lg font-semibold text-emerald-600 group-hover:text-emerald-500 transition-colors duration-200">
            {price}
          </p>
        </div>

        <button
          onClick={() => navigate(`/product/${id}`)}
          className="button-transition mt-4 w-full bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md font-medium"
          aria-label={`View details for ${title}`}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default ListingCard;