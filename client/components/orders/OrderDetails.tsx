import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../../contract/AgriculturalContract';
import { WalletService } from '../../services/wallet.service';
import { Loader2, Package, User, MapPin, Calendar, Truck, DollarSign, AlertCircle, CheckCircle, Gavel, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

// Interfaces
interface User {
  name: string;
  type: 'Farmer' | 'Buyer';
  rating: number;
  profilePhotoUrl: string | null;
  id: string;
}

interface Order {
  id: number;
  contract_id: string;
  status: string;
  product: string;
  quantity: string;
  price: string;
  location: string;
  user: User;
  orderDate: string;
  deliveryDate: string;
  amount_eth: string;
  advance_amount_eth: string;
  escrow_balance_eth: string;
  farmer_id: string | null;
  buyer_id: string | null;
  farmer_confirmed_delivery: boolean;
  buyer_confirmed_receipt: boolean;
  confirmation_deadline: string | null;
  blockchain_tx_hash: string | null;
  additional_notes?: string | null;
}

// Define the exact shape of the Supabase response
interface ProductData {
  id: number;
  name: string | null;
  quantity: number | null;
  unit: string | null;
  contract_id: string | null;
  farmer_id: string | null;
  buyer_id: string | null;
  smart_contracts: {
    contract_id: string;
    status: string;
    amount_eth: string;
    advance_amount_eth: string;
    escrow_balance_eth: string;
    delivery_location: string | null;
    start_date: string | null;
    end_date: string | null;
    buyer_id: string | null;
    farmer_id: string | null;
    farmer_confirmed_delivery: boolean;
    buyer_confirmed_receipt: boolean;
    confirmation_deadline: string | null;
    blockchain_tx_hash: string | null;
    additional_notes: string | null;
  } | null;
  farmers: {
    name: string | null;
    profile_photo_url: string | null;
    id: string | null;
  } | null;
  buyers: {
    company_name: string | null;
    profile_photo_url: string | null;
    id: string | null;
  } | null;
}

const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'farmer' | 'buyer' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch user role and ID
  useEffect(() => {
    let mounted = true;

    const getUserRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('User not authenticated');

        const { data: farmer } = await supabase
          .from('farmers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (mounted) {
          if (farmer) {
            setUserRole('farmer');
            setUserId(farmer.id);
          } else {
            const { data: buyer } = await supabase
              .from('buyers')
              .select('id')
              .eq('user_id', user.id)
              .single();

            if (buyer) {
              setUserRole('buyer');
              setUserId(buyer.id);
            } else {
              throw new Error('User is neither a farmer nor a buyer');
            }
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Error determining user role:', err);
          setError('Unable to determine user role. Please log in again.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void getUserRole();
    return () => { mounted = false; };
  }, []);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    if (!userRole || !userId || !orderId) return;

    try {
      setLoading(true);
      const provider = WalletService.provider || new ethers.JsonRpcProvider('http://localhost:8545');
      const blockchainContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          quantity,
          unit,
          contract_id,
          farmer_id,
          buyer_id,
          smart_contracts!products_contract_id_fkey (
            contract_id,
            status,
            amount_eth,
            advance_amount_eth,
            escrow_balance_eth,
            delivery_location,
            start_date,
            end_date,
            buyer_id,
            farmer_id,
            farmer_confirmed_delivery,
            buyer_confirmed_receipt,
            confirmation_deadline,
            blockchain_tx_hash,
            additional_notes
          ),
          farmers (
            name,
            profile_photo_url,
            id
          ),
          buyers (
            company_name,
            profile_photo_url,
            id
          )
        `)
        .eq('id', orderId)
        .single() as { data: ProductData | null; error: any };

      if (productError) throw productError;
      if (!productData?.smart_contracts) throw new Error('Contract not found');

      const contract = productData.smart_contracts;

      // Fetch and sync blockchain status
      const contractDetails = await blockchainContract.getContractDetails(contract.contract_id);
      const onChainStatus = contractDetails.status.status.toString();
      const statusMap: { [key: string]: string } = {
        '0': 'PENDING',
        '1': 'FUNDED',
        '2': 'IN_PROGRESS',
        '3': 'DELIVERED',
        '4': 'COMPLETED',
        '5': 'CANCELLED',
        '6': 'DISPUTED',
        '7': 'RESOLVED',
      };
      const mappedStatus = statusMap[onChainStatus] || contract.status;

      // Log for debugging
      console.log(`Contract ID ${contract.contract_id}:`, {
        onChainStatus,
        mappedStatus,
        databaseStatus: contract.status,
        farmerConfirmed: contract.farmer_confirmed_delivery,
        buyerConfirmed: contract.buyer_confirmed_receipt,
        farmerData: productData.farmers,
        buyerData: productData.buyers,
      });

      // Sync database with blockchain
      if (contract.status !== mappedStatus || 
          (mappedStatus === 'IN_PROGRESS' && !contract.farmer_confirmed_delivery) || 
          (mappedStatus === 'COMPLETED' && !contract.buyer_confirmed_receipt)) {
        const { error: updateError } = await supabase
          .from('smart_contracts')
          .update({
            status: mappedStatus,
            farmer_confirmed_delivery: mappedStatus === 'IN_PROGRESS' || mappedStatus === 'COMPLETED' ? true : contract.farmer_confirmed_delivery,
            buyer_confirmed_receipt: mappedStatus === 'COMPLETED' ? true : contract.buyer_confirmed_receipt,
          })
          .eq('contract_id', contract.contract_id);
        if (updateError) throw updateError;
      }

      // Fetch farmer or buyer details if missing
      let user: User;
      if (userRole === 'farmer') {
        if (!productData.buyers?.company_name || !productData.buyers?.id) {
          const { data: buyer, error: buyerError } = await supabase
            .from('buyers')
            .select('company_name, profile_photo_url, id')
            .eq('id', contract.buyer_id)
            .single();
          if (buyerError) console.error('Error fetching buyer:', buyerError);
          user = {
            name: buyer?.company_name || 'Unknown Buyer',
            type: 'Buyer',
            rating: 4.5,
            profilePhotoUrl: buyer?.profile_photo_url || null,
            id: buyer?.id || contract.buyer_id || '',
          };
        } else {
          user = {
            name: productData.buyers.company_name || 'Unknown Buyer',
            type: 'Buyer',
            rating: 4.5,
            profilePhotoUrl: productData.buyers.profile_photo_url || null,
            id: productData.buyers.id || contract.buyer_id || '',
          };
        }
      } else { // userRole === 'buyer'
        if (!productData.farmers?.name || !productData.farmers?.id) {
          const { data: farmer, error: farmerError } = await supabase
            .from('farmers')
            .select('name, profile_photo_url, id')
            .eq('id', contract.farmer_id)
            .single();
          if (farmerError) console.error('Error fetching farmer:', farmerError);
          user = {
            name: farmer?.name || 'Unknown Farmer',
            type: 'Farmer',
            rating: 4.5,
            profilePhotoUrl: farmer?.profile_photo_url || null,
            id: farmer?.id || contract.farmer_id || '',
          };
        } else {
          user = {
            name: productData.farmers.name || 'Unknown Farmer',
            type: 'Farmer',
            rating: 4.5,
            profilePhotoUrl: productData.farmers.profile_photo_url || null,
            id: productData.farmers.id || contract.farmer_id || '',
          };
        }
      }

      const formattedOrder: Order = {
        id: productData.id,
        contract_id: contract.contract_id,
        status: mappedStatus,
        product: productData.name || 'Unknown Product',
        quantity: `${productData.quantity || 0} ${productData.unit || 'unit'}`,
        price: `${contract.amount_eth || '0'} ETH`,
        location: contract.delivery_location || 'Not specified',
        user,
        orderDate: contract.start_date || new Date().toISOString(),
        deliveryDate: contract.end_date || new Date().toISOString(),
        amount_eth: contract.amount_eth,
        advance_amount_eth: contract.advance_amount_eth,
        escrow_balance_eth: contract.escrow_balance_eth,
        farmer_id: contract.farmer_id,
        buyer_id: contract.buyer_id,
        farmer_confirmed_delivery: contract.farmer_confirmed_delivery,
        buyer_confirmed_receipt: contract.buyer_confirmed_receipt,
        confirmation_deadline: contract.confirmation_deadline,
        blockchain_tx_hash: contract.blockchain_tx_hash,
        additional_notes: contract.additional_notes,
      };

      setOrder(formattedOrder);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [orderId, userRole, userId]);

  // Setup real-time subscription and fetch initial data
  useEffect(() => {
    if (!userRole || !userId || !orderId) return;

    void fetchOrderDetails();

    const subscription = supabase
      .channel(`smart_contracts:contract_id=eq.${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'smart_contracts',
          filter: `contract_id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Contract updated in DB:', payload);
          void fetchOrderDetails();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [fetchOrderDetails, userRole, userId, orderId]);

  const handleBlockchainAction = async (
    action: () => Promise<void>,
    successMessage: string,
    notificationOptions?: { title: string; message: string; type: string; userId: string }
  ) => {
    try {
      setActionLoading(true);
      setError(null);
  
      if (!WalletService.provider) throw new Error('Blockchain provider not available');
      const walletInfo = await WalletService.getWalletInfo();
      
      if (!walletInfo?.privateKey) throw new Error('Private key not available');
      await action();
      await fetchOrderDetails();
  
      if (notificationOptions) {
        await supabase.from('notifications').insert({
          user_id: notificationOptions.userId,
          contract_id: Number(orderId),
          title: notificationOptions.title,
          message: notificationOptions.message,
          type: notificationOptions.type,
          data: { contract_id: orderId },
          created_at: new Date().toISOString(),
        });
      }
  
      toast.success(successMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Blockchain Action Error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelivery = () => {
    if (!order || userRole !== 'farmer' || order.farmer_id !== userId) return;

    handleBlockchainAction(
      async () => {
        const walletInfo = await WalletService.getWalletInfo();
        if (!walletInfo?.privateKey) throw new Error('Private key not available');
        const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
        const tx = await contract.confirmDelivery(order.contract_id);
        await tx.wait();

        const { error } = await supabase.rpc('sync_confirm_delivery', {
          p_contract_id: Number(order.contract_id),
          p_tx_hash: tx.hash,
        });
        if (error) throw error;
      },
      `Delivery confirmed for product #${order.contract_id}`,
      {
        title: 'Delivery Confirmed',
        message: `Farmer confirmed delivery for contract #${order.contract_id}. Please confirm receipt within 7 days.`,
        type: 'order',
        userId: order.buyer_id!,
      }
    );
  };

  const handleConfirmReceipt = () => {
    if (!order || userRole !== 'buyer' || order.buyer_id !== userId) return;

    handleBlockchainAction(
      async () => {
        const walletInfo = await WalletService.getWalletInfo();
        if (!walletInfo?.privateKey) throw new Error('Private key not available');
        const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
        const tx = await contract.confirmReceipt(order.contract_id);
        await tx.wait();

        const { error: rpcError } = await supabase.rpc('sync_confirm_receipt', {
          p_contract_id: Number(order.contract_id),
          p_tx_hash: tx.hash,
        });
        if (rpcError) throw rpcError;

        await supabase
          .from('products')
          .update({ status: 'fulfilled' })
          .eq('id', order.id);
      },
      `Receipt confirmed for product #${order.contract_id}`,
      {
        title: 'Receipt Confirmed',
        message: `You confirmed receipt for contract #${order.contract_id}. Transaction completed.`,
        type: 'order',
        userId: order.buyer_id!,
      }
    );
  };

  const handleClaimRemaining = () => {
    if (!order || userRole !== 'farmer' || order.farmer_id !== userId) return;

    handleBlockchainAction(
      async () => {
        const walletInfo = await WalletService.getWalletInfo();
        if (!walletInfo?.privateKey) throw new Error('Private key not available');
        const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
        const tx = await contract.claimRemainingAfterTimeout(order.contract_id);
        await tx.wait();

        const { error } = await supabase.rpc('sync_claim_remaining_after_timeout', {
          p_contract_id: Number(order.contract_id),
          p_tx_hash: tx.hash,
        });
        if (error) throw error;
      },
      `Remaining funds claimed for product #${order.contract_id}`,
      {
        title: 'Funds Claimed',
        message: `Remaining funds for contract #${order.contract_id} claimed after timeout.`,
        type: 'payment',
        userId: order.farmer_id!,
      }
    );
  };

  const handleRaiseDispute = () => {
    if (!order || (userRole === 'farmer' && order.farmer_id !== userId) || (userRole === 'buyer' && order.buyer_id !== userId)) return;

    handleBlockchainAction(
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const walletInfo = await WalletService.getWalletInfo();
        if (!walletInfo?.privateKey) throw new Error('Private key not available');
        const wallet = new ethers.Wallet(walletInfo.privateKey, WalletService.provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
        const tx = await contract.raiseDispute(order.contract_id);
        await tx.wait();

        const { error } = await supabase.rpc('sync_raise_dispute', {
          p_contract_id: Number(order.contract_id),
          p_raised_by: user!.id,
          p_reason: 'Delivery issue',
          p_tx_hash: tx.hash,
        });
        if (error) throw error;
      },
      `Dispute raised for product #${order.contract_id}`,
      {
        title: 'Dispute Raised',
        message: `You raised a dispute for contract #${order.contract_id}.`,
        type: 'dispute',
        userId: userId!,
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg shadow-lg flex items-center">
          <AlertCircle className="h-6 w-6 mr-2" />
          <p>{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`/${userRole}/orders`)}
          className="mb-6 flex items-center text-emerald-600 hover:text-emerald-800 transition-colors"
          disabled={actionLoading}
        >
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Orders
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-emerald-200">
          <div className="bg-emerald-600 text-white p-6">
            <h1 className="text-2xl font-bold">{order.product}</h1>
            <p className="text-sm">Contract #{order.contract_id}</p>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                order.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-700'
                  : order.status === 'FUNDED' || order.status === 'IN_PROGRESS' || order.status === 'DELIVERED'
                  ? 'bg-blue-100 text-blue-700'
                  : order.status === 'COMPLETED' || order.status === 'RESOLVED'
                  ? 'bg-green-100 text-green-700'
                  : order.status === 'DISPUTED' || order.status === 'CANCELLED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {order.status}
            </span>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-gray-600">
                <Package className="h-5 w-5 mr-2 text-emerald-500" />
                <span>Quantity: {order.quantity}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-5 w-5 mr-2 text-emerald-500" />
                <span>Total: {order.price}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-5 w-5 mr-2 text-emerald-500" />
                <span>Advance: {order.advance_amount_eth} ETH</span>
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-5 w-5 mr-2 text-emerald-500" />
                <span>Escrow: {order.escrow_balance_eth} ETH</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2 text-emerald-500" />
                <span>Location: {order.location}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-2 text-emerald-500" />
                <span>Order Date: {new Date(order.orderDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Truck className="h-5 w-5 mr-2 text-emerald-500" />
                <span>Delivery Date: {new Date(order.deliveryDate).toLocaleDateString()}</span>
              </div>
              {order.confirmation_deadline && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-2 text-red-500" />
                  <span>Deadline: {new Date(order.confirmation_deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{order.user.type} Information</h2>
              <div className="flex items-center">
                {order.user.profilePhotoUrl ? (
                  <img
                    src={order.user.profilePhotoUrl}
                    alt={order.user.name}
                    className="h-12 w-12 rounded-full mr-4 object-cover border-2 border-emerald-300"
                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image')}
                  />
                ) : (
                  <img
                    src="https://placehold.co/100x100?text=No+Image"
                    alt="Placeholder"
                    className="h-12 w-12 rounded-full mr-4 object-cover border-2 border-emerald-300"
                  />
                )}
                <div>
                  <p className="text-md font-medium text-gray-900">{order.user.name}</p>
                  <p className="text-sm text-gray-500">{order.user.type} • ⭐ {order.user.rating}</p>
                </div>
              </div>
            </div>

            {order.additional_notes && (
              <div className="border-t pt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes</h2>
                <p className="text-gray-600">{order.additional_notes}</p>
              </div>
            )}

            {order.blockchain_tx_hash && (
              <div className="border-t pt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Blockchain Transaction</h2>
                <p className="text-gray-600 break-all">
                  Transaction Hash:{' '}
                  <a
                    href={`https://etherscan.io/tx/${order.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    {order.blockchain_tx_hash}
                  </a>
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3">
            {order.status === 'FUNDED' && userRole === 'farmer' && order.farmer_id === userId && (
              <button
                onClick={handleConfirmDelivery}
                className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-orange-300"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4 mr-2" />
                )}
                Confirm Delivery
              </button>
            )}
            {order.status === 'IN_PROGRESS' && userRole === 'buyer' && order.buyer_id === userId && (
              <button
                onClick={handleConfirmReceipt}
                className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:bg-purple-300"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirm Receipt
              </button>
            )}
            {order.status === 'IN_PROGRESS' &&
              userRole === 'farmer' &&
              order.farmer_id === userId &&
              order.confirmation_deadline &&
              new Date(order.confirmation_deadline) < new Date() && (
                <button
                  onClick={handleClaimRemaining}
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-green-300"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Claim Remaining
                </button>
              )}
            {['FUNDED', 'IN_PROGRESS'].includes(order.status) &&
              ((userRole === 'farmer' && order.farmer_id === userId) || (userRole === 'buyer' && order.buyer_id === userId)) && (
                <button
                  onClick={handleRaiseDispute}
                  className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-red-300"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Gavel className="h-4 w-4 mr-2" />
                  )}
                  Raise Dispute
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;