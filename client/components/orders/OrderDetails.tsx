import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../../contract/AgriculturalContract';
import { WalletService } from '../../services/wallet.service';
import { Loader2, Package, Scale, MapPin, Calendar, Truck, DollarSign, AlertCircle, CheckCircle, Gavel, ArrowLeft, Activity, CreditCard, Vault, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

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
  image_url?: string | null;
}

interface ProductData {
  id: number;
  name: string | null;
  quantity: number | null;
  unit: string | null;
  image_url: string | null;
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

  // Reset scroll position to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []); // Empty dependency array ensures this runs only on mount

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
          image_url,
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
      } else {
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
        image_url: productData.image_url,
      };

      setOrder(formattedOrder);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [orderId, userRole, userId]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-emerald-600" />
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent blur-xl"></div>
          </div>
          <p className="text-emerald-600 font-medium text-lg">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg shadow-lg flex items-center">
          <AlertCircle className="h-6 w-6 mr-2" />
          <p>{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-white to-teal-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <button
          onClick={() => navigate(`/${userRole}/orders`)}
          className="group flex items-center gap-2 text-emerald-600 hover:text-emerald-800 bg-white/60 backdrop-blur-xl 
          px-6 py-3 rounded-2xl hover:bg-white/80 border border-emerald-100/50 shadow-lg hover:shadow-xl
          transition-all duration-300 transform hover:-translate-y-0.5"
          disabled={actionLoading}
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Back to Orders</span>
        </button>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-emerald-100">
          <div className="relative h-96">
            <div className="absolute inset-0">
              {order.image_url ? (
                <img
                  src={order.image_url}
                  alt={order.product}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://placehold.co/800x400?text=No+Image";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-emerald-600 to-teal-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>

            <div className="relative h-full flex items-end p-8 text-white">
              <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-medium">
                    <Package className="h-5 w-5" />
                    <span>Contract #{order.contract_id}</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight [text-shadow:_0_1px_2px_rgb(0_0_0_/_20%)]">
                    {order.product}
                  </h1>
                  <div className="flex items-center gap-4 text-emerald-100">
                    <span className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      {order.quantity}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {order.location}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className={`
                    px-6 py-2 rounded-2xl text-sm font-medium shadow-lg backdrop-blur-md
                    transform hover:scale-105 transition-transform duration-300
                    ${getStatusStyles(order.status)}
                  `}>
                    {order.status}
                  </span>
                  {order.confirmation_deadline && (
                    <p className="text-sm bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl 
                      flex items-center gap-2 border border-white/10">
                      <Clock className="h-4 w-4" />
                      Deadline: {new Date(order.confirmation_deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/50 border-y border-emerald-100">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-emerald-100">
              <QuickStat
                label="Price"
                value={order.price}
                icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              />
              <QuickStat
                label="Order Date"
                value={new Date(order.orderDate).toLocaleDateString()}
                icon={<Calendar className="h-5 w-5 text-emerald-600" />}
              />
              <QuickStat
                label="Delivery Date"
                value={new Date(order.deliveryDate).toLocaleDateString()}
                icon={<Truck className="h-5 w-5 text-emerald-600" />}
              />
              <QuickStat
                label="Status"
                value={order.status}
                icon={<Activity className="h-5 w-5 text-emerald-600" />}
              />
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FinanceCard
                title="Total Amount"
                value={order.price}
                icon={<DollarSign className="h-6 w-6" />}
                gradient="from-emerald-500 to-teal-500"
              />
              <FinanceCard
                title="Advance Paid"
                value={`${order.advance_amount_eth} ETH`}
                icon={<CreditCard className="h-6 w-6" />}
                gradient="from-blue-500 to-cyan-500"
              />
              <FinanceCard
                title="Escrow Balance"
                value={`${order.escrow_balance_eth} ETH`}
                icon={<Vault className="h-6 w-6" />}
                gradient="from-purple-500 to-indigo-500"
              />
            </div>

            <div className="relative bg-gradient-to-b from-emerald-50 to-transparent p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-6">Order Timeline</h2>
              <OrderTimeline order={order} />
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-transparent p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-4">{order.user.type} Information</h2>
              <div className="flex items-center gap-4">
                <img
                  src={order.user.profilePhotoUrl || "https://placehold.co/100x100?text=No+Image"}
                  alt={order.user.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-emerald-300"
                  onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=No+Image")}
                />
                <div>
                  <p className="text-lg font-medium text-gray-900">{order.user.name}</p>
                  <p className="text-sm text-gray-500">{order.user.type} • ⭐ {order.user.rating}</p>
                </div>
              </div>
            </div>

            {order.additional_notes && (
              <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-emerald-50">
                <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
                <p className="text-gray-600">{order.additional_notes}</p>
              </div>
            )}

            {order.blockchain_tx_hash && (
              <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-emerald-50">
                <h2 className="text-xl font-semibold mb-4">Blockchain Transaction</h2>
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

            <div className="flex flex-wrap gap-4 pt-6 border-t border-emerald-100">
              {order.status === 'FUNDED' && userRole === 'farmer' && order.farmer_id === userId && (
                <button
                  onClick={handleConfirmDelivery}
                  className="flex items-center px-6 py-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 
                  transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-orange-300 shadow-lg"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="h-5 w-5 mr-2" />
                  )}
                  Confirm Delivery
                </button>
              )}
              {order.status === 'IN_PROGRESS' && userRole === 'buyer' && order.buyer_id === userId && (
                <button
                  onClick={handleConfirmReceipt}
                  className="flex items-center px-6 py-3 bg-purple-500 text-white rounded-2xl hover:bg-purple-600 
                  transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-purple-300 shadow-lg"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
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
                    className="flex items-center px-6 py-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 
                    transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-green-300 shadow-lg"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    )}
                    Claim Remaining
                  </button>
                )}
              {['FUNDED', 'IN_PROGRESS'].includes(order.status) &&
                ((userRole === 'farmer' && order.farmer_id === userId) || (userRole === 'buyer' && order.buyer_id === userId)) && (
                  <button
                    onClick={handleRaiseDispute}
                    className="flex items-center px-6 py-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 
                    transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-red-300 shadow-lg"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Gavel className="h-5 w-5 mr-2" />
                    )}
                    Raise Dispute
                  </button>
                )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
};

const QuickStat = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="p-4 flex items-center gap-3">
    <div className="p-2 bg-emerald-100/50 rounded-lg">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  </div>
);

const FinanceCard = ({ title, value, icon, gradient }: any) => (
  <div className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white 
      flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-sm text-gray-500">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const OrderTimeline = ({ order }: { order: Order }) => {
  const statusOrder = [
    { status: 'PENDING', title: 'Order Created', icon: <Package />, date: order.orderDate },
    { status: 'FUNDED', title: 'Funded', icon: <DollarSign />, date: order.orderDate },
    { status: 'IN_PROGRESS', title: 'In Progress', icon: <Truck />, date: order.deliveryDate },
    { status: 'DELIVERED', title: 'Delivered', icon: <Truck />, date: order.deliveryDate },
    { status: 'COMPLETED', title: 'Completed', icon: <CheckCircle />, date: order.deliveryDate },
  ];

  const statusSequence = ['PENDING', 'FUNDED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED'];
  const currentIndex = statusSequence.indexOf(order.status);

  const timelineItems = statusOrder.filter((item, index) => {
    if (order.status === 'CANCELLED') {
      return index <= statusSequence.indexOf('PENDING');
    }
    if (order.status === 'DISPUTED') {
      return index <= statusSequence.indexOf('IN_PROGRESS');
    }
    return index <= currentIndex;
  });

  if (order.status === 'DISPUTED') {
    timelineItems.push({
      status: 'DISPUTED',
      title: 'Dispute Raised',
      icon: <Gavel />,
      date: new Date().toISOString(),
    });
  } else if (order.status === 'CANCELLED') {
    timelineItems.push({
      status: 'CANCELLED',
      title: 'Cancelled',
      icon: <AlertCircle />,
      date: new Date().toISOString(),
    });
  } else if (order.status === 'RESOLVED') {
    timelineItems.push({
      status: 'RESOLVED',
      title: 'Resolved',
      icon: <CheckCircle />,
      date: new Date().toISOString(),
    });
  }

  return (
    <div className="relative pl-8 border-l-2 border-emerald-200 space-y-6">
      {timelineItems.map((item, index) => (
        <TimelineItem
          key={item.status}
          title={item.title}
          date={item.date}
          icon={item.icon}
          isCompleted={index < timelineItems.length - 1 || (index === timelineItems.length - 1 && ['COMPLETED', 'RESOLVED', 'CANCELLED', 'DELIVERED'].includes(order.status))}
        />
      ))}
    </div>
  );
};

const TimelineItem = ({ title, date, icon, isCompleted }: any) => (
  <div className="relative">
    <div className={`absolute -left-11 p-2 rounded-full 
      ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
      {icon}
    </div>
    <h4 className="font-medium text-gray-900">{title}</h4>
    <p className="text-sm text-gray-500">{new Date(date).toLocaleDateString()}</p>
  </div>
);

const getStatusStyles = (status: string) => {
  const styles: Record<string, string> = {
    PENDING: 'bg-gradient-to-r from-yellow-400 to-amber-500',
    FUNDED: 'bg-gradient-to-r from-blue-400 to-cyan-500',
    IN_PROGRESS: 'bg-gradient-to-r from-purple-400 to-indigo-500',
    DELIVERED: 'bg-gradient-to-r from-green-400 to-emerald-500',
    COMPLETED: 'bg-gradient-to-r from-teal-400 to-emerald-500',
    DISPUTED: 'bg-gradient-to-r from-red-400 to-rose-500',
    CANCELLED: 'bg-gradient-to-r from-gray-400 to-slate-500',
    RESOLVED: 'bg-gradient-to-r from-teal-400 to-emerald-500',
  };
  return `${styles[status] || styles.PENDING} text-white`;
};

export default OrderDetails;