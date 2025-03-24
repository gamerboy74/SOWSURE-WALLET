import React from "react";
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  farmer_id: string | null;
  buyer_id: string | null;
  type: "sell" | "buy";
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  image_url: string | null;
  status: string;
  location: string;
  created_at: string;
  featured: boolean;
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: () => void;
  deleting: string | null;
  handleImageError: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  deleting,
  handleImageError,
}) => {
  return (
    <div className="product-card bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-image w-full h-48 object-cover"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-48 bg-gray-50 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
      </div>
      <div className="product-card-content p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
            {product.name}
          </h3>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              product.status === "active"
                ? "bg-green-100 text-green-800"
                : product.status === "draft"
                ? "bg-gray-100 text-gray-800"
                : product.status === "sold_out"
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.description}</p>
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-emerald-600 font-semibold text-sm">
              ₹{product.price}/{product.unit}
            </p>
            <p className="text-xs text-gray-500">
              {product.quantity} {product.unit}
            </p>
          </div>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
            {product.category}
          </span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span
            className={`text-xs font-semibold ${
              product.featured ? "text-emerald-600" : "text-gray-500"
            }`}
          >
            {product.featured ? "Featured" : "Not Featured"}
          </span>
        </div>
        <div className="flex space-x-3 mt-4">
          <button
            onClick={() => onEdit(product)}
            className="button-transition flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            {product.featured ? "Unfeature" : "Feature"}
          </button>
          <button
            onClick={onDelete}
            className="button-transition flex-1 border-2 border-red-600 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm font-medium"
            disabled={deleting === product.id}
          >
            {deleting === product.id ? (
              <Loader2 className="h-4 w-4 animate-spin inline-block" />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;