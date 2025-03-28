import React, { useState, useEffect } from 'react';
import { Truck, Search, AlertCircle, Package, MapPin, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Adjust the import path
import DialogBox from '../DialogBox'; // Assuming you have a DialogBox component

// Define TypeScript interface for the shipment data
interface Shipment {
  id: string;
  orderId: string; // contract_id from smart_contracts
  productId: string; // id from products
  product: string; // name from products
  productImage: string | null; // image_url from products
  quantity: string; // quantity from smart_contracts with unit from products
  status: string; // status from smart_contracts
  buyer: string; // company_name from buyers
  destination: string; // delivery_location from smart_contracts
  dispatchDate: string; // start_date from smart_contracts
  expectedDelivery: string; // end_date from smart_contracts
  trackingId: string; // Placeholder or generated
  farmerLocation: string; // complete_address from farmers
  deliveryMethod: string; // delivery_method from smart_contracts
  additionalNotes: string; // additional_notes from smart_contracts
}

interface FormData {
  contractId: string;
  product: string;
  quantity: string;
  deliveryMethod: string;
  deliveryLocation: string;
  additionalNotes: string;
}

const statusColors: { [key: string]: string } = {
  FUNDED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-600 text-white',
  CANCELLED: 'bg-red-100 text-red-800',
  DISPUTED: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-gray-100 text-gray-800',
};

const Shipments: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [fundedContracts, setFundedContracts] = useState<any[]>([]); // For dropdown
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<'farmer' | 'buyer' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    contractId: '',
    product: '',
    quantity: '',
    deliveryMethod: '',
    deliveryLocation: '',
    additionalNotes: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Determine user role and ID
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: farmer } = await supabase
          .from('farmers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (farmer) {
          setUserRole('farmer');
          setUserId(farmer.id);
          return;
        }

        const { data: buyer } = await supabase
          .from('buyers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (buyer) {
          setUserRole('buyer');
          setUserId(buyer.id);
          return;
        }

        throw new Error('User is neither a farmer nor a buyer');
      } catch (err) {
        console.error('Error determining user role:', err);
        setError('Unable to determine user role. Please log in again.');
      }
    };

    getUserRole();
  }, []);

  // Fetch products with FUNDED contracts and join with smart_contracts
  useEffect(() => {
    if (!userRole || !userId) return;

    const fetchShipments = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            image_url,
            unit,
            quantity,
            farmer_id,
            buyer_id,
            contract_id,
            smart_contracts!contract_id (
              contract_id,
              status,
              delivery_location,
              start_date,
              end_date,
              delivery_method,
              additional_notes,
              buyer_id,
              farmer_id
            ),
            buyers (
              company_name
            ),
            farmers (
              complete_address
            )
          `);

        if (userRole === 'farmer') {
          query = query.eq('farmer_id', userId);
        } else if (userRole === 'buyer') {
          query = query.eq('buyer_id', userId);
        }

        const { data: productsData, error: productsError } = await query;

        if (productsError) throw productsError;

        // Filter for products with FUNDED contracts
        const fundedProducts = productsData.filter(
          (product) => product.contract_id && product.smart_contracts?.[0]?.status === 'FUNDED'
        );

        const formattedShipments: Shipment[] = fundedProducts.map((product: any) => ({
          id: product.contract_id.toString(),
          orderId: `ORD${product.contract_id.toString().padStart(3, '0')}`,
          productId: product.id,
          product: product.name || 'Unknown Product',
          productImage: product.image_url || null,
          quantity: `${product.smart_contracts?.quantity || product.quantity} ${product.unit || 'unit'}`,
          status: product.smart_contracts?.status || 'FUNDED',
          buyer: product.buyers?.company_name || 'Unknown Buyer',
          destination: product.smart_contracts?.delivery_location || 'Not specified',
          dispatchDate: product.smart_contracts?.start_date || new Date().toISOString(),
          expectedDelivery: product.smart_contracts?.end_date || new Date().toISOString(),
          trackingId: `TRK${product.contract_id.toString().padStart(9, '0')}`,
          farmerLocation: product.farmers?.complete_address || 'Not specified',
          deliveryMethod: product.smart_contracts?.delivery_method || 'Not specified',
          additionalNotes: product.smart_contracts?.additional_notes || 'None',
        }));

        setShipments(formattedShipments);
      } catch (err) {
        console.error('Error fetching shipments:', err);
        setError('Failed to load shipments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [userRole, userId]);

  // Fetch FUNDED contracts for dropdown (farmers only)
  useEffect(() => {
    if (!userRole || !userId || userRole !== 'farmer') return;

    const fetchFundedContracts = async () => {
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            unit,
            image_url,
            quantity,
            contract_id,
            smart_contracts!contract_id (
              contract_id,
              status,
              quantity,
              delivery_method,
              delivery_location,
              additional_notes
            )
          `)
          .eq('farmer_id', userId)
          .not('contract_id', 'is', null);

        if (productsError) throw productsError;

        const fundedContractsData = productsData.filter(
          (product) => product.smart_contracts?.[0]?.status === 'FUNDED'
        );

        setFundedContracts(fundedContractsData);
      } catch (err) {
        console.error('Error fetching funded contracts:', err);
        setError('Failed to load funded contracts.');
      }
    };

    fetchFundedContracts();
  }, [userRole, userId]);

  // Handle contract selection from dropdown
  const handleContractSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedContract = fundedContracts.find(
      (contract) => contract.contract_id.toString() === e.target.value
    );
    if (selectedContract) {
      setFormData({
        contractId: selectedContract.contract_id.toString(),
        product: selectedContract.name || '',
        quantity: `${selectedContract.smart_contracts?.quantity || selectedContract.quantity} ${selectedContract.unit || 'unit'}`,
        deliveryMethod: selectedContract.smart_contracts?.delivery_method || '',
        deliveryLocation: selectedContract.smart_contracts?.delivery_location || '',
        additionalNotes: selectedContract.smart_contracts?.additional_notes || '',
      });
    } else {
      setFormData({
        contractId: '',
        product: '',
        quantity: '',
        deliveryMethod: '',
        deliveryLocation: '',
        additionalNotes: '',
      });
    }
  };

  // Handle shipment creation (farmers only)
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractId) {
      setError('Please select a funded contract.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('smart_contracts')
        .update({
          status: 'IN_PROGRESS',
          delivery_method: formData.deliveryMethod,
          delivery_location: formData.deliveryLocation,
          additional_notes: formData.additionalNotes,
        })
        .eq('contract_id', formData.contractId);

      if (error) throw error;

      setShowForm(false);
      setFormData({
        contractId: '',
        product: '',
        quantity: '',
        deliveryMethod: '',
        deliveryLocation: '',
        additionalNotes: '',
      });
      fetchShipments(); // Re-fetch shipments
    } catch (err) {
      console.error('Error creating shipment:', err);
      setError('Failed to create shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchShipments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          image_url,
          unit,
          quantity,
          farmer_id,
          buyer_id,
          contract_id,
          smart_contracts!contract_id (
            contract_id,
            status,
            delivery_location,
            start_date,
            end_date,
            delivery_method,
            additional_notes,
            buyer_id,
            farmer_id
          ),
          buyers (
            company_name
          ),
          farmers (
            complete_address
          )
        `);

      if (userRole === 'farmer') {
        query = query.eq('farmer_id', userId);
      } else if (userRole === 'buyer') {
        query = query.eq('buyer_id', userId);
      }

      const { data: productsData, error: productsError } = await query;

      if (productsError) throw productsError;

      const fundedProducts = productsData.filter(
        (product) => product.contract_id && product.smart_contracts?.[0]?.status === 'FUNDED'
      );

      const formattedShipments: Shipment[] = fundedProducts.map((product: any) => ({
        id: product.contract_id.toString(),
        orderId: `ORD${product.contract_id.toString().padStart(3, '0')}`,
        productId: product.id,
        product: product.name || 'Unknown Product',
        productImage: product.image_url || null,
        quantity: `${product.smart_contracts?.quantity || product.quantity} ${product.unit || 'unit'}`,
        status: product.smart_contracts?.status || 'FUNDED',
        buyer: product.buyers?.company_name || 'Unknown Buyer',
        destination: product.smart_contracts?.delivery_location || 'Not specified',
        dispatchDate: product.smart_contracts?.start_date || new Date().toISOString(),
        expectedDelivery: product.smart_contracts?.end_date || new Date().toISOString(),
        trackingId: `TRK${product.contract_id.toString().padStart(9, '0')}`,
        farmerLocation: product.farmers?.complete_address || 'Not specified',
        deliveryMethod: product.smart_contracts?.delivery_method || 'Not specified',
        additionalNotes: product.smart_contracts?.additional_notes || 'None',
      }));

      setShipments(formattedShipments);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError('Failed to load shipments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Filter shipments based on search query
  const filteredShipments = shipments.filter(
    (shipment) =>
      shipment.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.trackingId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        {userRole === 'farmer' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            <Truck className="h-5 w-5 mr-2" />
            Create Shipment
          </button>
        )}
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
      </div>

      <DialogBox
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create Shipment"
        contentClassName=""
        footer={
          <>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateShipment}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Create Shipment
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateShipment} className="space-y-4">
          <div>
            <label htmlFor="contractId" className="block text-sm font-medium text-gray-700">
              Select Funded Contract
            </label>
            <select
              id="contractId"
              value={formData.contractId}
              onChange={handleContractSelect}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            >
              <option value="">Select a contract</option>
              {fundedContracts.map((contract) => (
                <option key={contract.contract_id} value={contract.contract_id}>
                  Contract #{contract.contract_id} - {contract.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="product" className="block text-sm font-medium text-gray-700">
              Product
            </label>
            <input
              type="text"
              id="product"
              value={formData.product}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="text"
              id="quantity"
              value={formData.quantity}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700">
              Delivery Method
            </label>
            <input
              type="text"
              id="deliveryMethod"
              value={formData.deliveryMethod}
              onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="deliveryLocation" className="block text-sm font-medium text-gray-700">
              Delivery Location
            </label>
            <input
              type="text"
              id="deliveryLocation"
              value={formData.deliveryLocation}
              onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700">
              Additional Notes
            </label>
            <textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              rows={3}
            />
          </div>
        </form>
      </DialogBox>

      {loading ? (
        <div className="text-center text-gray-600">Loading shipments...</div>
      ) : filteredShipments.length === 0 ? (
        <div className="text-center text-gray-600">
          {userRole === 'farmer' ? 'No funded shipments created yet.' : 'No funded shipments purchased yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredShipments.map((shipment) => (
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
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    statusColors[shipment.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1).toLowerCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center text-gray-600">
                  <Package className="h-5 w-5 mr-2" />
                  <div className="flex items-center">
                    {shipment.productImage ? (
                      <img
                        src={shipment.productImage}
                        alt={shipment.product}
                        className="h-10 w-10 object-cover rounded mr-2"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded mr-2 flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{shipment.product}</p>
                      <p className="text-sm">{shipment.quantity}</p>
                      <p className="text-xs text-gray-500">Product ID: {shipment.productId}</p>
                    </div>
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
                    <p className="text-sm">
                      {new Date(shipment.expectedDelivery).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2" />
                  <div>
                    <p className="text-sm font-medium">Farmer Location</p>
                    <p className="text-sm">{shipment.farmerLocation}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <Truck className="h-5 w-5 mr-2" />
                  <div>
                    <p className="text-sm font-medium">Delivery Method</p>
                    <p className="text-sm">{shipment.deliveryMethod}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <div>
                    <p className="text-sm font-medium">Additional Notes</p>
                    <p className="text-sm">{shipment.additionalNotes}</p>
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
      )}
    </div>
  );
};

export default Shipments;