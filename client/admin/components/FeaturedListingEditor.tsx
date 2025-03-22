import React, { useState } from 'react';
import { Plus, X, Upload } from 'lucide-react';

interface FeaturedListing {
  id: string;
  title: string;
  price: string;
  location: string;
  type: 'sell' | 'buy';
  image: string;
}

interface FeaturedListingEditorProps {
  listings: FeaturedListing[];
  onSave: (listings: FeaturedListing[]) => void;
}

function FeaturedListingEditor({ listings: initialListings, onSave }: FeaturedListingEditorProps) {
  const [listings, setListings] = useState<FeaturedListing[]>(initialListings);

  const addListing = () => {
    const newListing: FeaturedListing = {
      id: Date.now().toString(),
      title: '',
      price: '',
      location: '',
      type: 'sell',
      image: ''
    };
    setListings([...listings, newListing]);
  };

  const removeListing = (id: string) => {
    setListings(listings.filter(listing => listing.id !== id));
  };

  const updateListing = (id: string, field: string, value: string) => {
    setListings(listings.map(listing => {
      if (listing.id === id) {
        return { ...listing, [field]: value };
      }
      return listing;
    }));
  };

  const handleSave = () => {
    onSave(listings);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Featured Listings Editor</h2>
        <button
          onClick={addListing}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Listing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {listings.map((listing) => (
          <div key={listing.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Listing</h3>
              <button
                onClick={() => removeListing(listing.id)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={listing.title}
                  onChange={(e) => updateListing(listing.id, 'title', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <div className="mt-1 flex items-center space-x-4">
                  <input
                    type="text"
                    value={listing.image}
                    onChange={(e) => updateListing(listing.id, 'image', e.target.value)}
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    placeholder="Enter image URL"
                  />
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="text"
                    value={listing.price}
                    onChange={(e) => updateListing(listing.id, 'price', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={listing.location}
                    onChange={(e) => updateListing(listing.id, 'location', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={listing.type}
                  onChange={(e) => updateListing(listing.id, 'type', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                >
                  <option value="sell">Sell</option>
                  <option value="buy">Buy</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default FeaturedListingEditor;