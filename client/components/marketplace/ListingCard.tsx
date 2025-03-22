import React, { useState } from "react";
import { Package, User, MapPin, Calendar } from "lucide-react";
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
}

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
}) => {
  const [productImgError, setProductImgError] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);
  const navigate = useNavigate();
  const defaultProductImage = "/images/default-product.png";
  const defaultProfileImage = "/images/default-profile.png";

  const handleProductImageError = () => setProductImgError(true);
  const handleProfileImageError = () => setProfileImgError(true);

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1">
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
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2 group-hover:text-gray-900 transition-colors duration-200">
          {description}
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
          className="mt-4 w-full bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md font-medium"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default ListingCard;