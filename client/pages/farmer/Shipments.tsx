import React, { useState } from 'react';
import { Truck, Search, Filter, AlertCircle, Package, MapPin, Calendar } from 'lucide-react';

const mockShipments = [
  {
    id: '1',
    orderId: 'ORD001',
    product: 'Organic Wheat',
    quantity: '200 kg',
    status: 'in-transit',
    buyer: 'ABC Trading Co.',
    destination: 'Mumbai, Maharashtra',
    dispatchDate: '2025-03-20',
    expectedDelivery: '2025-03-23',
    trackingId: 'TRK123456789'
  },
  {
    id: '2',
    orderId: 'ORD002',
    product: 'Fresh Tomatoes',
    quantity: '100 kg',
    status: 'delivered',
    buyer: 'XYZ Exports',
    destination: 'Delhi, NCR',
    dispatchDate: '2025-03-18',
    expectedDelivery: '2025-03-21',
    trackingId: 'TRK987654321'
  }
];

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'in-transit': 'bg-blue-100 text-blue-800',
  'delivered': 'bg-green-100 text-green-800',
  'cancelled': 'bg-red-100 text-red-800'
};

function Shipments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <div className="flex space-x-4">
          <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
            <Truck className="h-5 w-5 mr-2" />
            Create Shipment
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by order ID or tracking number..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {mockShipments.map((shipment) => (
          <div key={shipment.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{shipment.orderId}
                </h3>
                <p className="text-sm text-gray-500">
                  Tracking ID: {shipment.trackingId}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${statusColors[shipment.status]}`}>
                {shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center text-gray-600">
                <Package className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">{shipment.product}</p>
                  <p className="text-sm">{shipment.quantity}</p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">Destination</p>
                  <p className="text-sm">{shipment.destination}</p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">Expected Delivery</p>
                  <p className="text-sm">{new Date(shipment.expectedDelivery).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">Buyer</p>
                <p className="text-sm text-gray-600">{shipment.buyer}</p>
              </div>
              <div className="space-x-2">
                <button className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-md">
                  View Details
                </button>
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
                  Track Shipment
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Shipments;