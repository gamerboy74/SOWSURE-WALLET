import React from 'react';
import { Package, User, MapPin, Calendar, Truck, DollarSign } from 'lucide-react';

interface OrderCardProps {
  id: number;
  status: 'pending' | 'processing' | 'completed';
  product: string;
  quantity: string;
  price: string;
  location: string;
  user: {
    name: string;
    type: string;
    rating: number;
  };
  orderDate: string;
  deliveryDate: string;
}

const statusColors = {
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700'
};

function OrderCard({
  id,
  status,
  product,
  quantity,
  price,
  location,
  user,
  orderDate,
  deliveryDate
}: OrderCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{product}</h3>
            <p className="text-sm text-gray-500">Order #{id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center text-gray-600">
            <Package className="h-5 w-5 mr-2" />
            <span>{quantity}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <DollarSign className="h-5 w-5 mr-2" />
            <span>{price}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin className="h-5 w-5 mr-2" />
            <span>{location}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar className="h-5 w-5 mr-2" />
            <span>Ordered: {new Date(orderDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Truck className="h-5 w-5 mr-2" />
            <span>Delivery: {new Date(deliveryDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.type} • ⭐ {user.rating}</p>
            </div>
          </div>
          <div className="space-x-2">
            <button className="px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-md">
              View Details
            </button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
              Contact {user.type}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderCard;