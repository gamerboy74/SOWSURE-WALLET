// ProductDetails.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Package,
  MapPin,
  Calendar,
  User,
  ArrowLeft,
  Star,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ChatWindow from "../components/chat/ChatWindow";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useChat } from "../hooks/useChat"; // Import the new hook
import { useProductDetails } from "../hooks/useProductDetails"; // Assuming this is in a separate file

const customStyles = `
  /* ... (keep the existing styles) ... */
`;

const ROUTES = {
  MARKETPLACE: "/marketplace",
} as const;

function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    product,
    loading,
    error,
    currentUserId,
    isOwnListing,
    isFarmer,
    isBuyer,
    refetch,
  } = useProductDetails(id!);

  const disableButtons = useMemo(
    () =>
      isOwnListing ||
      (product?.type === "sell" && isFarmer) ||
      (product?.type === "buy" && isBuyer),
    [isOwnListing, product?.type, isFarmer, isBuyer]
  );

  const { showChat, chatId, chatLoading, initiateChat, closeChat } = useChat({
    currentUserId,
    product: product
      ? {
          id: product.id,
          type: product.type,
          farmer: product.farmer,
          buyer: product.buyer,
        }
      : null,
    disableChat: disableButtons,
  });

  const [productImgError, setProductImgError] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);

  const handleImageError = useCallback((type: "product" | "profile") => {
    if (type === "product") setProductImgError(true);
    else setProfileImgError(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-4 max-w-7xl mx-auto">
        <Skeleton width={150} height={40} className="mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton height={300} />
            <Skeleton count={4} className="mt-4" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton height={150} />
            <Skeleton height={200} />
            <Skeleton height={60} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || "Product not found"}</p>
          <div className="space-x-4">
            <button
              onClick={refetch}
              className="button-transition px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate(ROUTES.MARKETPLACE)}
              className="button-transition px-4 py-2 text-emerald-600 hover:text-emerald-700"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const seller = product.type === "sell" ? product.farmer : product.buyer;
  const sellerName =
    product.type === "sell"
      ? product.farmer?.name || "Unknown Farmer"
      : product.buyer?.company_name || "Unknown Buyer";

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style>{customStyles}</style>
      <div className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
        <button
          onClick={() => navigate(ROUTES.MARKETPLACE)}
          className="button-transition inline-flex items-center mb-6 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow transition-all duration-200 transform hover:scale-[1.02]"
          aria-label="Back to Marketplace"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] overflow-hidden">
            <div className="aspect-square relative">
              {productImgError || !product.image_url ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="h-20 w-20 text-gray-400" />
                </div>
              ) : (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => handleImageError("product")}
                />
              )}
              <div
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${
                  product.type === "sell" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {product.type === "sell" ? "Selling" : "Buying"}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center space-x-4 mb-6">
                <button
                  className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden ring-2 ring-emerald-500 ring-offset-2 transition-transform hover:scale-105"
                  aria-label={`View profile of ${sellerName}`}
                >
                  {profileImgError || !seller?.profile_photo_url ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  ) : (
                    <img
                      src={seller.profile_photo_url}
                      alt={sellerName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => handleImageError("profile")}
                    />
                  )}
                </button>
                <div>
                  <h3 className="font-medium text-gray-900 text-lg">{sellerName}</h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span>4.8</span>
                  </div>
                </div>
              </div>

              {product.type === "sell" && product.farmer ? (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-sm font-medium text-gray-900">{product.farmer.complete_address || "Not specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Land Type</p>
                    <p className="text-sm font-medium text-gray-900">{product.farmer.land_type || "Not specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Land Size</p>
                    <p className="text-sm font-medium text-gray-900">{product.farmer.land_size ? `${product.farmer.land_size} acres` : "Not specified"}</p>
                  </div>
                </div>
              ) : (
                product.type === "buy" && product.buyer && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Business Address</p>
                      <p className="text-sm font-medium text-gray-900">{product.buyer.business_address || "Not specified"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Business Type</p>
                      <p className="text-sm font-medium text-gray-900">{product.buyer.business_type || "Not specified"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Storage Capacity</p>
                      <p className="text-sm font-medium text-gray-900">{product.buyer.storage_capacity ? `${product.buyer.storage_capacity} units` : "Not specified"}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01]">
              <div className="flex items-start p-6 border-b border-gray-100">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h1>
                  <p className="text-sm text-gray-500">Contract ID: {id}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 px-3 py-1 bg-blue-50 rounded-full">
                    <User className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-blue-600">Verified {product.type === "sell" ? "Farmer" : "Buyer"}</span>
                  </div>
                  <button
                    onClick={initiateChat}
                    className="button-transition flex items-center space-x-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disableButtons}
                    title={disableButtons ? "You cannot message this listing" : undefined}
                    aria-label={`Message ${product.type === "sell" ? "Farmer" : "Buyer"}`}
                  >
                    {chatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    <span>Message {product.type === "sell" ? "Farmer" : "Buyer"}</span>
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Price</div>
                  <div className="text-2xl font-bold text-emerald-600">₹{product.price}/{product.unit}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Quantity</div>
                  <div className="text-2xl font-semibold text-gray-900">{product.quantity} {product.unit}</div>
                </div>
              </div>

              <div className="p-6 text-right border-t border-gray-100">
                <p className="text-gray-500">Total Contract Value</p>
                <p className="text-lg font-bold text-gray-900">₹{(product.price * product.quantity).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-md font-semibold text-gray-900 mb-3 transition-colors duration-300 hover:text-gray-700">Product Specifications</h2>
                  <ul className="space-y-2 text-gray-600 list-item-hover">
                    <li>Category: {product.category}</li>
                    <li>Moisture Content: {product.moisture_content || "Not specified"}</li>
                    <li>Protein Level: {product.protein_level || "Not specified"}</li>
                    <li>Origin: {product.origin || "Not specified"}</li>
                    <li>Harvest Year: {product.harvest_year || "Not specified"}</li>
                    <li>Certification: {product.certification || "Not specified"}</li>
                  </ul>
                </div>
                <div>
                  <h2 className="text-md font-semibold text-gray-900 mb-3 transition-colors duration-300 hover:text-gray-700">Delivery Terms</h2>
                  <ul className="space-y-2 text-gray-600 list-item-hover">
                    <li>Delivery Location: {product.location}</li>
                    <li>Shipping Terms: {product.shipping_terms || "Not specified"}</li>
                    <li>
                      Required Documentation:
                      <ul className="list-disc list-inside mt-1">
                        {product.required_docs?.length ? (
                          product.required_docs.map((doc, index) => <li key={index}>{doc}</li>)
                        ) : (
                          <li>None</li>
                        )}
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 p-6">
              <button
                className="button-transition w-full flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disableButtons}
                title={disableButtons ? "You cannot submit an offer for this listing" : undefined}
                aria-label="Submit Offer"
              >
                Submit Offer
              </button>
            </div>
          </div>
        </div>
      </div>

      {showChat && seller && currentUserId && chatId && (
        <ChatWindow
          chatId={chatId}
          currentUserId={currentUserId}
          otherUser={{ name: sellerName, image: seller.profile_photo_url || "" }}
          productId={id}
          onClose={closeChat} // Use the closeChat function from the hook
        />
      )}
    </div>
  );
}

export default ProductDetails;