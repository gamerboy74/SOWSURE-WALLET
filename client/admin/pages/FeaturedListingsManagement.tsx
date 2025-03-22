import React from 'react';
import FeaturedListingEditor from '../components/FeaturedListingEditor';

const initialListings = [
  {
    id: '1',
    title: 'Premium Organic Wheat',
    price: '₹2,500/quintal',
    location: 'Punjab',
    type: 'sell',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400'
  }
];

function FeaturedListingsManagement() {
  const handleSave = (listings: any) => {
    console.log('Saving listings:', listings);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Featured Listings Management</h1>
      <FeaturedListingEditor
        listings={initialListings}
        onSave={handleSave}
      />
    </div>
  );
}

export default FeaturedListingsManagement;