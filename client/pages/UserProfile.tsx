import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Search, ChevronDown, MapPin, Star, MessageCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import ProductCard from '../components/profile/ProductCard';
import { useChat } from '../hooks/useChat';
import ChatWindow from '../components/chat/ChatWindow';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface User {
  id: string;
  name: string;
  type: 'Farmer' | 'Buyer';
  image?: string;
  location: string;
  rating: number;
  totalProducts: number;
  totalSales: string;
  about: string;
  memberSince: string;
  userId: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  quantity: string;
  image?: string;
  rating: number;
  category: string;
  seller: { id: string; name: string; image?: string };
  currentUserId: string;
}

const categories = [
  'All Products',
  'Grains',
  'Vegetables',
  'Fruits',
  'Pulses',
  'Herbs',
  'Other',
];

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState('All Products');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserType, setCurrentUserType] = useState<'Farmer' | 'Buyer' | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (authUser) setCurrentUserId(authUser.id);
      console.log('Authenticated User:', authUser);

      let userData: User | null = null;
      let productsData: Product[] = [];

      // Fetch farmer data
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('id, name, complete_address, profile_photo_url, created_at, land_type, user_id')
        .eq('id', id)
        .single();

      if (farmerData && !farmerError) {
        userData = {
          id: farmerData.id,
          name: farmerData.name,
          type: 'Farmer',
          image: farmerData.profile_photo_url,
          location: farmerData.complete_address || 'Unknown',
          rating: 4.5,
          totalProducts: 0,
          totalSales: '0.00 ETH',
          about: `Farmer specializing in ${farmerData.land_type || 'general farming'}`,
          memberSince: new Date(farmerData.created_at).toISOString().split('T')[0],
          userId: farmerData.user_id,
        };

        const { data: farmerProducts, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, quantity, unit, image_url, status, farmer_id, category')
          .eq('farmer_id', id)
          .eq('type', 'sell');

        if (productsError) throw new Error(`Farmer products error: ${productsError.message}`);
        console.log('Farmer Products:', farmerProducts);

        productsData = (farmerProducts || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: `${p.price} INR`,
          quantity: `${p.quantity} ${p.unit}`,
          image: p.image_url,
          rating: 4.5,
          category: p.category,
          seller: {
            id: farmerData.id,
            name: farmerData.name,
            image: farmerData.profile_photo_url,
          },
          currentUserId: farmerData.user_id,
        }));
        userData.totalProducts = farmerProducts?.length || 0;
      } else {
        // Fetch buyer data
        const { data: buyerData, error: buyerError } = await supabase
          .from('buyers')
          .select('id, contact_name, business_address, profile_photo_url, created_at, business_type, user_id')
          .eq('id', id)
          .single();

        if (buyerData && !buyerError) {
          userData = {
            id: buyerData.id,
            name: buyerData.contact_name,
            type: 'Buyer',
            image: buyerData.profile_photo_url,
            location: buyerData.business_address || 'Unknown',
            rating: 4.5,
            totalProducts: 0,
            totalSales: '0 Orders',
            about: `Buyer specializing in ${buyerData.business_type || 'general buying'}`,
            memberSince: new Date(buyerData.created_at).toISOString().split('T')[0],
            userId: buyerData.user_id,
          };

          const { data: buyerProducts, error: productsError } = await supabase
            .from('products')
            .select('id, name, price, quantity, unit, image_url, status, buyer_id, category')
            .eq('buyer_id', id)
            .eq('type', 'buy');

          if (productsError) throw new Error(`Buyer products error: ${productsError.message}`);
          console.log('Buyer Products:', buyerProducts);

          productsData = (buyerProducts || []).map((p) => ({
            id: p.id,
            name: p.name,
            price: `${p.price} ETH`,
            quantity: `${p.quantity} ${p.unit}`,
            image: p.image_url,
            rating: 4.5,
            category: p.category,
            seller: {
              id: buyerData.id,
              name: buyerData.contact_name,
              image: buyerData.profile_photo_url,
            },
            currentUserId: buyerData.user_id,
          }));
          userData.totalProducts = buyerProducts?.length || 0;
        }
      }

      if (!userData) throw new Error('User not found');
      setUser(userData);
      setProducts(productsData);
      console.log('Products Set:', productsData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchUserData();

    const productSubscription = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          const isRelevant =
            (user?.type === 'Farmer' && (payload.new as { farmer_id?: string }).farmer_id === id) ||
            (user?.type === 'Buyer' && (payload.new as { buyer_id?: string }).buyer_id === id) ||
            (payload.eventType === 'DELETE' &&
              ((user?.type === 'Farmer' && (payload.old as { farmer_id?: string }).farmer_id === id) ||
               (user?.type === 'Buyer' && (payload.old as { buyer_id?: string }).buyer_id === id)));
          
          if (isRelevant) {
            console.log('Relevant product change detected:', payload);
            fetchUserData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productSubscription);
    };
  }, [id, fetchUserData, user?.type]);

  useEffect(() => {
    const fetchCurrentUserType = async () => {
      if (!currentUserId) return;
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (farmerData && !farmerError) {
        setCurrentUserType('Farmer');
      } else {
        const { data: buyerData, error: buyerError } = await supabase
          .from('buyers')
          .select('id')
          .eq('user_id', currentUserId)
          .single();

        if (buyerData && !buyerError) {
          setCurrentUserType('Buyer');
        }
      }
    };
    fetchCurrentUserType();
  }, [currentUserId]);

  const disableChat = Boolean(
    currentUserId === user?.userId ||
    (currentUserType && user?.type && currentUserType === user.type)
  );

  const { showChat, chatId, chatLoading, initiateChat, closeChat } = useChat({
    currentUserId,
    product: products.length > 0
      ? {
          id: products[0].id,
          type: user?.type === 'Farmer' ? 'sell' : 'buy',
          farmer: user?.type === 'Farmer' ? { id: user.id } : undefined,
          buyer: user?.type === 'Buyer' ? { id: user.id } : undefined,
        }
      : null,
    disableChat,
  });

  const handleInitiateChat = useCallback(() => {
    if (showChat) closeChat();
    initiateChat();
  }, [showChat, closeChat, initiateChat]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'All Products' ||
      product.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (!user) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 transition-all duration-300 hover:shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex items-center space-x-6 w-full sm:w-auto">
              <img
                src={user.image || 'https://via.placeholder.com/112'}
                alt={user.name}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-emerald-100 transition-transform duration-300 hover:scale-105"
              />
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                    {user.type}
                  </span>
                </div>
                <div className="flex items-center mt-2 text-gray-600">
                  <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                  <span>{user.location}</span>
                </div>
                <div className="flex items-center mt-2 text-yellow-400">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="ml-2 text-gray-900 font-medium">{user.rating}</span>
                </div>
                <p className="mt-4 text-gray-600 max-w-2xl">{user.about}</p>
              </div>
            </div>
            <button
              onClick={handleInitiateChat}
              disabled={disableChat || chatLoading}
              className={`flex items-center bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {chatLoading ? (
                <span className="animate-spin h-5 w-5 mr-2">⏳</span>
              ) : (
                <MessageCircle className="h-5 w-5 mr-2" />
              )}
              Contact
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Member Since', value: new Date(user.memberSince).toLocaleDateString() },
            { label: 'Total Products', value: user.totalProducts.toString() },
            { label: 'Total Sales', value: user.totalSales },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg hover:scale-105"
            >
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-2 text-xl font-bold text-emerald-600">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeCategory === category
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-200 rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  onChange={(e) => {
                    console.log('Sort by:', e.target.value);
                  }}
                >
                  <option value="latest">Latest</option>
                  <option value="priceLowToHigh">Price: Low to High</option>
                  <option value="priceHighToLow">Price: High to Low</option>
                  <option value="rating">Rating</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                quantity={product.quantity}
                image={product.image || 'https://via.placeholder.com/112'}
                rating={product.rating}
                seller={{
                  id: product.seller.id,
                  name: product.seller.name,
                  image: product.seller.image || 'https://via.placeholder.com/112',
                }}
                currentUserId={product.currentUserId}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">No products found.</p>
          )}
        </div>

        {showChat && currentUserId && chatId && (
          <ChatWindow
            chatId={chatId}
            currentUserId={currentUserId}
            otherUser={{ name: user.name, image: user.image || '' }}
            productId={products.length > 0 ? products[0].id : null}
            onClose={closeChat}
          />
        )}
      </div>
    </div>
  );
};

export default UserProfile;