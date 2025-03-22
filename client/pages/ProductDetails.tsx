import React, { useState, useEffect } from "react";
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

interface ProductDetails {
  id: string;
  type: "sell" | "buy";
  name: string;
  description: string;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  image_url: string | null;
  location: string;
  created_at: string;
  deadline: string;
  moisture_content: string;
  protein_level: string;
  origin: string;
  harvest_year: string;
  certification: string;
  shipping_terms: string;
  required_docs: string[];
  farmer?: {
    id: string;
    name: string;
    profile_photo_url: string | null;
    complete_address: string;
    land_type: string;
    land_size: number;
    phone: string;
    email: string;
    wallet_address: string;
  };
  buyer?: {
    id: string;
    company_name: string;
    profile_photo_url: string | null;
    business_address: string;
    business_type: string;
    storage_capacity: number;
  };
}

function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        const { data, error: fetchError } = await supabase
          .from("products")
          .select(
            `
            *,
            farmer:farmer_id (*),
            buyer:buyer_id (*)
          `
          )
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Product not found");

        setProduct(data);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || "Product not found"}</p>
          <button
            onClick={() => navigate("/marketplace")}
            className="text-emerald-600 hover:text-emerald-700 transition-colors duration-300"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const seller = product.type === "sell" ? product.farmer : product.buyer;
  const sellerName =
    product.type === "sell"
      ? product.farmer?.name
      : product.buyer?.company_name;

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6 max-w-7xl animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center mb-6 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 
            bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow transition-all duration-200 
            transform hover:scale-[1.02]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Image and Basic Info */}
          <div
            className="lg:col-span-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg 
              transition-all duration-300 transform hover:scale-[1.01] overflow-hidden"
          >
            <div className="aspect-square relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="h-20 w-20 text-gray-400" />
                </div>
              )}
              <div
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${
                  product.type === "sell"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {product.type === "sell" ? "Selling" : "Buying"}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center space-x-4 mb-6">
                <button
                  onClick={() => {
                    /* Handle profile click */
                  }}
                  className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden ring-2 ring-emerald-500 ring-offset-2 transition-transform hover:scale-105"
                >
                  {seller?.profile_photo_url ? (
                    <img
                      src={seller.profile_photo_url}
                      alt={sellerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </button>
                <div>
                  <h3 className="font-medium text-gray-900 text-lg">
                    {sellerName}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span>4.8</span>
                  </div>
                </div>
              </div>

              {/* Farmer Details Section */}
              {product.type === "sell" && product.farmer && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.farmer.complete_address}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Land Size</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.farmer.land_size} acres
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Contact</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.farmer.phone}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.farmer.email}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Wallet</p>
                    <p
                      className="text-sm font-medium text-gray-900 truncate"
                      title={product.farmer.wallet_address}
                    >
                      {product.farmer.wallet_address.slice(0, 6)}...
                      {product.farmer.wallet_address.slice(-4)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg 
                transition-all duration-300 transform hover:scale-[1.01]"
            >
              <div className="flex items-start p-6 border-b border-gray-100">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {product.name}
                  </h1>
                  <p className="text-sm text-gray-500">Contract ID: {id}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 px-3 py-1 bg-blue-50 rounded-full">
                    <User className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-blue-600">
                      Verified Buyer
                    </span>
                  </div>
                  <button
                    onClick={() => setShowChat(true)}
                    className="flex items-center space-x-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-all duration-300 transform hover:scale-105"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Message Buyer</span>
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Price</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    ₹{product.price}/{product.unit}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Quantity</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {product.quantity} {product.unit}
                  </div>
                </div>
              </div>

              <div className="p-6 text-right border-t border-gray-100">
                <p className="text-gray-500">Total Contract Value</p>
                <p className="text-lg font-bold text-gray-900">
                  {(product.price * product.quantity).toLocaleString()} TOK
                </p>
              </div>
            </div>

            {/* Specifications and Requirements */}
            <div
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg 
                transition-all duration-300 transform hover:scale-[1.01] p-6"
            >
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h2 className="text-md font-semibold text-gray-900 mb-3 transition-colors duration-300 hover:text-gray-700">
                    Product Specifications
                  </h2>
                  <ul className="space-y-2 text-gray-600 list-item-hover">
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Grade: {product.category}
                    </li>
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Moisture Content: {product.moisture_content}
                    </li>
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Protein Level: {product.protein_level}
                    </li>
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Origin: {product.origin}
                    </li>
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Harvest Year: {product.harvest_year}
                    </li>
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Certification: {product.certification}
                    </li>
                  </ul>
                </div>
                <div>
                  <h2 className="text-md font-semibold text-gray-900 mb-3 transition-colors duration-300 hover:text-gray-700">
                    Delivery Terms
                  </h2>
                  <ul className="space-y-2 text-gray-600 list-item-hover">
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Delivery Location: {product.location}
                    </li>
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Shipping Terms: {product.shipping_terms}
                    </li>
                    <li className="transition-colors duration-300 hover:text-gray-800">
                      Required Documentation:
                      <ul className="list-disc list-inside mt-1">
                        {product.required_docs?.map((doc, index) => (
                          <li
                            key={index}
                            className="transition-colors duration-300 hover:text-gray-800"
                          >
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Offer Button */}
            <div
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-lg 
                transition-all duration-300 p-6"
            >
              <button
                className="w-full flex items-center justify-center px-6 py-3 bg-emerald-600 
                  text-white rounded-lg hover:bg-emerald-500 active:bg-emerald-700 transition-all 
                  duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md 
                  hover:shadow-xl font-medium"
              >
                Submit Offer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      {showChat && seller && currentUserId && (
        <ChatWindow
          chatId={`${currentUserId}-${seller.id}`}
          currentUserId={currentUserId}
          otherUser={{
            name: sellerName || "",
            image: seller.profile_photo_url || "",
          }}
          onClose={() => setShowChat(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .backdrop-blur-sm {
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
}

export default ProductDetails;
