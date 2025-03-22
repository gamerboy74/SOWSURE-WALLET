import React, { useState } from "react";
import { Star, MessageCircle } from "lucide-react";
import ChatWindow from "../chat/ChatWindow";

interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  fiatPrice: string;
  quantity: string;
  image: string;
  rating: number;
  seller: {
    id: string;
    name: string;
    image: string;
  };
  currentUserId: string;
}

function ProductCard({
  name,
  price,
  fiatPrice,
  quantity,
  image,
  rating,
  seller,
  currentUserId,
}: ProductCardProps) {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
        <img
          src={image}
          alt={name}
          className="w-full h-48 object-cover hover:opacity-90 transition-opacity duration-300"
        />
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold text-gray-900 hover:text-emerald-600 transition-colors duration-200">
              {name}
            </h3>
            <div className="flex items-center bg-emerald-50 px-2 py-1 rounded-full">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="ml-1 text-sm font-medium text-gray-700">
                {rating}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mb-5">
            <div>
              <p className="text-emerald-600 font-bold text-lg">{price}</p>
              <p className="text-sm text-gray-500 font-medium">{fiatPrice}</p>
            </div>
            <p className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
              {quantity}
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transform transition-all duration-200 hover:shadow-md active:scale-95">
              Purchase Now
            </button>
            <button
              onClick={() => setShowChat(true)}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transform transition-all duration-200 hover:shadow-md active:scale-95"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {showChat && (
        <ChatWindow
          chatId={`${currentUserId}-${seller.id}`}
          currentUserId={currentUserId}
          otherUser={seller}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}

export default ProductCard;
