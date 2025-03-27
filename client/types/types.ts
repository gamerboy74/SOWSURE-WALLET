export interface Farmer {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  email: string;
  aadhar_number: string;
  pan_number: string;
  farmer_id?: string;
  profile_photo_url?: string;
  complete_address: string;
  pincode: string;
  land_type: string;
  land_size: number;
  land_number: string;
  nominee_name?: string;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Buyer {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone_number: string;
  gstin: string;
  business_type: string;
  trade_license_url?: string;
  profile_photo_url?: string;
  purchase_capacity: number;
  storage_capacity: number;
  business_address: string;
  pincode: string;
  wallet_address: string | null;
  terms_accepted: boolean;
  created_at: string;
  updated_at: string;
  
}

export interface AuthState {
  user: {
    id: string;
    email: string;
  } | null;
  type: "farmer" | "buyer" | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  wallet_address: string | null;
  encrypted_private_key: string | null;
  encrypted_mnemonic: string | null;
  balance: number;
  token_balance: number;
  network: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  status: "PENDING" | "COMPLETED" | "FAILED";
  created_at: string;
  recipient_wallet_id?: string;
  description?: string;
  transaction_hash?: string;
  metadata?: {
    orderId?: string | null;
    productId?: string | null;
    recipientName?: string | null;
    txHash?: string | null;
    toAddress?: string | null;
    fromAddress?: string | null;
    network?: "sepolia" | "mainnet" | null;
    note?: string | null;
    blockNumber?: number | null;
    internalTransfer?: boolean;
    tokenType?: "ETH" | "USDT"; // Added tokenType
  };
  token_type?: "ETH" | "USDT"; // Already in schema
}

export interface WalletFundingRequest {
  id: string;
  user_id: string;
  wallet_id: string;
  amount_usdt: number;
  amount_inr: number;
  txid: string | null;
  payment_proof_url: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
  user_details: {
    email: string;
    user_metadata?: {
      type?: "farmer" | "buyer";
    };
  };
  user_email?: string;
  user_metadata?: {
    type?: "farmer" | "buyer";
  };
  farmer_name?: string;
  buyer_company_name?: string;
  wallet?: {
    wallet_address: string;
    token_balance: number;
  };
}

export interface FeaturedListing {
  id: string;
  title: string;
  price: string;
  location: string;
  type: 'sell' | 'buy';
  image: string;
  description: string;
  category: string;
  datePosted: string;
  image_url: string;
  status: 'active' | 'pending' | 'sold';
  featured: boolean;
  farmerProfile?: Farmer;
  buyerProfile?: Buyer;
  unsaved?: boolean; // Add this
}
