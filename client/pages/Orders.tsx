import React, { useState } from 'react';
import OrdersHeader from '../components/orders/OrdersHeader';
import OrderCard from '../components/orders/OrderCard';

// Static data for demonstration
const mockOrders = [
  {
    id: 1,
    status: 'pending',
    product: 'Premium Quality Wheat',
    quantity: '500 kg',
    price: '₹25,000',
    location: 'Punjab, India',
    user: {
      name: 'Farmer Singh',
      type: 'Farmer',
      rating: 4.8
    },
    orderDate: '2025-03-20',
    deliveryDate: '2025-03-25'
  },
  // ... other orders
];

function Orders() {
  const [filter, setFilter] = useState('all');

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    // Apply filtering logic here
  };

  const handleExport = () => {
    // Handle orders export
    console.log('Export orders');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <OrdersHeader 
          onFilterChange={handleFilterChange}
          onExport={handleExport}
        />

        <div className="space-y-6">
          {mockOrders.map((order) => (
            <OrderCard key={order.id} {...order} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Orders;