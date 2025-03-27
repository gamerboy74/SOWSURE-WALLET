/*
  # Wallet-Related Schema for FarmConnect (Fully Updated)
*/

-- Ensure wallet_address columns exist in farmers and buyers tables
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD CONSTRAINT unique_wallet_address_farmers UNIQUE (wallet_address);

ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD CONSTRAINT unique_wallet_address_buyers UNIQUE (wallet_address);

-- Create wallets table with all required columns
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    wallet_address TEXT,
    encrypted_private_key TEXT,
    encrypted_mnemonic TEXT,
    balance DECIMAL(20,8) DEFAULT 0 CHECK (balance >= 0), -- ETH balance
    token_balance DECIMAL(20,8) DEFAULT 0 CHECK (token_balance >= 0), -- USDT balance
    network TEXT DEFAULT 'sepolia',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    wallet_type TEXT DEFAULT 'ETH',
    status TEXT DEFAULT 'ACTIVE',
    blockchain_network TEXT DEFAULT 'sepolia',
    token_type TEXT DEFAULT 'USDT' -- Specifies token_balance is USDT
);

-- Create wallet transactions table with token_type
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(20,8) NOT NULL,
    type TEXT CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    token_type TEXT DEFAULT 'USDT' -- Distinguishes ETH vs USDT transactions
);

-- Create wallet funding requests table
CREATE TABLE IF NOT EXISTS wallet_funding_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount_usdt DECIMAL(20,8) NOT NULL,
    amount_inr DECIMAL(20,8) NOT NULL,
    txid TEXT, -- On-chain transaction ID if applicable
    payment_proof_url TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row-Level Security (RLS)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_funding_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing objects to avoid conflicts
DROP TRIGGER IF EXISTS wallet_transaction_trigger ON wallet_transactions;
DROP TRIGGER IF EXISTS user_wallet_trigger ON auth.users;
DROP FUNCTION IF EXISTS update_wallet_balance();
DROP FUNCTION IF EXISTS create_user_wallet();

-- Function to update wallet balance based on token_type
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' THEN
    IF NEW.token_type = 'ETH' THEN
      IF NEW.type = 'DEPOSIT' THEN
        UPDATE wallets 
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
      ELSIF NEW.type IN ('WITHDRAWAL', 'TRANSFER') THEN
        IF (SELECT balance FROM wallets WHERE id = NEW.wallet_id) >= NEW.amount THEN
          UPDATE wallets 
          SET balance = balance - NEW.amount,
              updated_at = NOW()
          WHERE id = NEW.wallet_id;
        ELSE
          NEW.status := 'FAILED';
          NEW.metadata := NEW.metadata || jsonb_build_object('error', 'Insufficient ETH balance');
          RAISE NOTICE 'Insufficient ETH balance for transaction on wallet %', NEW.wallet_id;
        END IF;
      END IF;
    ELSIF NEW.token_type = 'USDT' OR NEW.token_type IS NULL THEN
      IF NEW.type = 'DEPOSIT' THEN
        UPDATE wallets 
        SET token_balance = token_balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
      ELSIF NEW.type IN ('WITHDRAWAL', 'TRANSFER') THEN
        IF (SELECT token_balance FROM wallets WHERE id = NEW.wallet_id) >= NEW.amount THEN
          UPDATE wallets 
          SET token_balance = token_balance - NEW.amount,
              updated_at = NOW()
          WHERE id = NEW.wallet_id;
        ELSE
          NEW.status := 'FAILED';
          NEW.metadata := NEW.metadata || jsonb_build_object('error', 'Insufficient USDT balance');
          RAISE NOTICE 'Insufficient USDT balance for transaction on wallet %', NEW.wallet_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    NEW.status := 'FAILED';
    NEW.metadata := NEW.metadata || jsonb_build_object('error', SQLERRM);
    RAISE NOTICE 'Transaction failed for wallet %: %', NEW.wallet_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create a user wallet with 0 initial balances
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
DECLARE 
    existing_wallet_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_wallet_count
    FROM wallets 
    WHERE user_id = NEW.id;

    IF existing_wallet_count = 0 THEN
        INSERT INTO wallets (
            user_id,
            balance,
            token_balance,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            0, -- Initial ETH balance
            0, -- Initial USDT balance
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint
ALTER TABLE wallets 
  ADD CONSTRAINT one_wallet_per_user UNIQUE (user_id);

-- Create triggers
CREATE TRIGGER wallet_transaction_trigger
    AFTER UPDATE ON wallet_transactions
    FOR EACH ROW
    WHEN (OLD.status <> 'COMPLETED' AND NEW.status = 'COMPLETED')
    EXECUTE FUNCTION update_wallet_balance();

CREATE TRIGGER user_wallet_trigger
    AFTER INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_wallet();

-- RLS Policies for wallets
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON wallets
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON wallets
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own wallet" ON wallets
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can insert own transactions" ON wallet_transactions
    FOR INSERT 
    TO authenticated
    WITH CHECK (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own transactions" ON wallet_transactions
    FOR SELECT
    TO authenticated
    USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all transactions" ON wallet_transactions
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- RLS Policies for wallet_funding_requests
CREATE POLICY "Users can view own funding requests" ON wallet_funding_requests
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own funding requests" ON wallet_funding_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own funding requests" ON wallet_funding_requests
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all funding requests" ON wallet_funding_requests
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_requests_user_id ON wallet_funding_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_requests_status ON wallet_funding_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_requests_created_at ON wallet_funding_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_id ON wallet_transactions(id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_txhash ON wallet_transactions ((metadata->>'txHash'));

-- Function to add funds with optional txid for on-chain tracking
CREATE OR REPLACE FUNCTION add_wallet_funds(p_wallet_id UUID, p_amount DECIMAL, p_txid TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE wallets 
  SET token_balance = token_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;
  
  INSERT INTO wallet_transactions (
    wallet_id,
    amount,
    type,
    status,
    metadata,
    token_type
  ) VALUES (
    p_wallet_id,
    p_amount,
    'DEPOSIT',
    'COMPLETED',
    jsonb_build_object('note', 'Funding Request Approved', 'txid', p_txid),
    'USDT'
  );
END;
$$ LANGUAGE plpgsql;

-- Foreign key constraints
ALTER TABLE wallet_funding_requests
  DROP CONSTRAINT IF EXISTS wallet_funding_requests_user_id_fkey,
  DROP CONSTRAINT IF EXISTS wallet_funding_requests_wallet_id_fkey,
  ADD CONSTRAINT wallet_funding_requests_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT wallet_funding_requests_wallet_id_fkey 
    FOREIGN KEY (wallet_id) 
    REFERENCES wallets(id) ON DELETE CASCADE;

-- Enhanced view for funding request details
DROP VIEW IF EXISTS public.wallet_funding_request_details;
CREATE OR REPLACE VIEW public.wallet_funding_request_details AS
SELECT 
    wfr.*,
    au.email AS user_email,
    au.raw_user_meta_data AS user_metadata,
    w.wallet_address,
    w.balance AS eth_balance,
    w.token_balance AS usdt_balance,
    f.name AS farmer_name,
    b.company_name AS buyer_company_name
FROM 
    wallet_funding_requests wfr
    LEFT JOIN auth.users au ON wfr.user_id = au.id
    LEFT JOIN wallets w ON wfr.wallet_id = w.id
    LEFT JOIN farmers f ON wfr.user_id = f.user_id
    LEFT JOIN buyers b ON wfr.user_id = b.user_id;

GRANT SELECT ON wallet_funding_request_details TO anon, authenticated;

-- Link buyers to wallets
ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;

UPDATE buyers b
SET wallet_id = w.id
FROM wallets w
WHERE b.user_id = w.user_id;

ALTER TABLE buyers
  ADD CONSTRAINT unique_wallet_per_buyer UNIQUE (wallet_id);

ALTER TABLE wallets
  ADD CONSTRAINT unique_user_id UNIQUE (user_id);

 ALTER TABLE wallets ADD COLUMN token_type TEXT;



 ALTER TABLE admin_users
  ADD CONSTRAINT unique_admin_user_id UNIQUE (user_id);

  /*
  FarmConnect Database Schema Additions for AgriculturalContract Integration
  - Uses existing wallets table to fetch wallet_address via user_id
  - Assumes existing tables: farmers, buyers, wallets, wallet_transactions, notifications, products, admin_users
*/
/*
  FarmConnect Database Schema Additions for AgriculturalContract Integration
  - Uses ETH for transactions (stored and processed in ETH in the backend)
  - Frontend renders ETH amounts as INR using conversion for display only
  - Uses existing wallets table to fetch wallet_address via user_id
  - Assumes existing tables: farmers, buyers, wallets, wallet_transactions, notifications, products, admin_users
*/

-- Ensure unique constraint on admin_users.user_id (fixes previous error)
ALTER TABLE admin_users
  ADD CONSTRAINT unique_admin_user_id UNIQUE (user_id);

-- Smart Contracts Table (Updated for ETH)
CREATE TABLE IF NOT EXISTS smart_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id BIGINT NOT NULL UNIQUE, -- Maps to contractCounter in smart contract
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES buyers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  crop_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  amount_eth DECIMAL(20,8) NOT NULL CHECK (amount_eth > 0), -- ETH instead of USDT
  advance_amount_eth DECIMAL(20,8) DEFAULT 0 CHECK (advance_amount_eth >= 0), -- ETH instead of USDT
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  delivery_method TEXT,
  delivery_location TEXT,
  additional_notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'FUNDED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
  escrow_balance_eth DECIMAL(20,8) DEFAULT 0 CHECK (escrow_balance_eth >= 0), -- ETH instead of USDT
  farmer_confirmed_delivery BOOLEAN DEFAULT false,
  buyer_confirmed_receipt BOOLEAN DEFAULT false,
  is_buyer_initiated BOOLEAN DEFAULT false,
  blockchain_tx_hash TEXT,
  contract_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE smart_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts" ON smart_contracts 
  FOR SELECT TO authenticated 
  USING (
    farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own contracts" ON smart_contracts 
  FOR INSERT TO authenticated 
  WITH CHECK (
    farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update own contracts" ON smart_contracts 
  FOR UPDATE TO authenticated 
  USING (
    farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can view all contracts" ON smart_contracts 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Contract Events Table (No monetary fields, unchanged)
CREATE TABLE IF NOT EXISTS contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id BIGINT REFERENCES smart_contracts(contract_id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK (event_name IN ('ContractCreated', 'ContractStatusUpdated', 'FundsDeposited', 'FundsReleased', 'DisputeRaised', 'PlatformFeesWithdrawn')),
  event_data JSONB NOT NULL,
  tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contract events" ON contract_events 
  FOR SELECT TO authenticated 
  USING (
    contract_id IN (
      SELECT contract_id FROM smart_contracts
      WHERE farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid())
         OR buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Admins can view all contract events" ON contract_events 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Platform Fees Table (Updated for ETH)
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id BIGINT REFERENCES smart_contracts(contract_id) ON DELETE SET NULL,
  amount_eth DECIMAL(20,8) NOT NULL CHECK (amount_eth > 0), -- ETH instead of USDT
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  withdrawn_to_wallet TEXT,
  tx_hash TEXT
);

ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform fees" ON platform_fees 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())) 
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Disputes Table (No monetary fields, unchanged)
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id BIGINT REFERENCES smart_contracts(contract_id) ON DELETE CASCADE UNIQUE,
  raised_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'REJECTED')),
  resolution TEXT,
  resolved_by UUID REFERENCES admin_users(user_id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disputes" ON disputes 
  FOR SELECT TO authenticated 
  USING (
    contract_id IN (
      SELECT contract_id FROM smart_contracts
      WHERE farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid())
         OR buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Users can raise own disputes" ON disputes 
  FOR INSERT TO authenticated 
  WITH CHECK (
    contract_id IN (
      SELECT contract_id FROM smart_contracts
      WHERE farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid())
         OR buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Admins can manage disputes" ON disputes 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())) 
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Alter Existing Tables (Minimal changes for ETH)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS contract_id BIGINT;

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS contract_id BIGINT;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS contract_id BIGINT;

-- Sync Functions Using Wallets Table (Updated for ETH, no INR in backend)
CREATE OR REPLACE FUNCTION sync_buyer_contract_creation(
  p_contract_id BIGINT,
  p_buyer_id UUID,
  p_crop_name TEXT,
  p_quantity NUMERIC,
  p_amount_eth DECIMAL, -- ETH stored in backend
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_delivery_method TEXT,
  p_delivery_location TEXT,
  p_additional_notes TEXT,
  p_tx_hash TEXT,
  p_contract_address TEXT
) RETURNS VOID AS $$
DECLARE
  v_advance_amount_eth DECIMAL(20,8) := (p_amount_eth * 0.20); -- 20% advance in ETH
BEGIN
  INSERT INTO smart_contracts (
    contract_id, buyer_id, crop_name, quantity, amount_eth, advance_amount_eth,
    start_date, end_date, delivery_method, delivery_location, additional_notes,
    status, escrow_balance_eth, is_buyer_initiated, blockchain_tx_hash, contract_address,
    created_at, updated_at
  ) VALUES (
    p_contract_id, p_buyer_id, p_crop_name, p_quantity, p_amount_eth, v_advance_amount_eth,
    p_start_date, p_end_date, p_delivery_method, p_delivery_location, p_additional_notes,
    'PENDING', p_amount_eth, true, p_tx_hash, p_contract_address, NOW(), NOW()
  );

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, p_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH', -- ETH
    jsonb_build_object('note', 'Buyer contract funding', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN buyers b ON b.user_id = w.user_id
  WHERE b.id = p_buyer_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    b.user_id, p_contract_id, 'Buy Contract Created',
    'Your contract #' || p_contract_id || ' for ' || p_crop_name || ' has been created and funded.', -- INR conversion on frontend
    'order', jsonb_build_object('contract_id', p_contract_id, 'amount_eth', p_amount_eth), NOW()
  FROM buyers b
  WHERE b.id = p_buyer_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_farmer_acceptance(
  p_contract_id BIGINT,
  p_farmer_id UUID,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_advance_amount_eth DECIMAL(20,8);
BEGIN
  SELECT advance_amount_eth INTO v_advance_amount_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  UPDATE smart_contracts
  SET farmer_id = p_farmer_id,
      status = 'FUNDED',
      escrow_balance_eth = escrow_balance_eth - v_advance_amount_eth, -- ETH
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, v_advance_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH', -- ETH
    jsonb_build_object('note', 'Advance payment for contract acceptance', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  WHERE f.id = p_farmer_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    f.user_id, p_contract_id, 'Contract Accepted',
    'You accepted contract #' || p_contract_id || ' and received an advance.', -- INR conversion on frontend
    'order', jsonb_build_object('contract_id', p_contract_id, 'advance_amount_eth', v_advance_amount_eth), NOW()
  FROM farmers f
  WHERE f.id = p_farmer_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    b.user_id, p_contract_id, 'Contract Accepted',
    'A farmer accepted your contract #' || p_contract_id || '.',
    'order', jsonb_build_object('contract_id', p_contract_id), NOW()
  FROM buyers b
  JOIN smart_contracts sc ON sc.buyer_id = b.id
  WHERE sc.contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_sell_contract_creation(
  p_contract_id BIGINT,
  p_farmer_id UUID,
  p_crop_name TEXT,
  p_quantity NUMERIC,
  p_amount_eth DECIMAL, -- ETH
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_delivery_method TEXT,
  p_delivery_location TEXT,
  p_additional_notes TEXT,
  p_tx_hash TEXT,
  p_contract_address TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO smart_contracts (
    contract_id, farmer_id, crop_name, quantity, amount_eth, start_date, end_date,
    delivery_method, delivery_location, additional_notes, status, escrow_balance_eth,
    is_buyer_initiated, blockchain_tx_hash, contract_address, created_at, updated_at
  ) VALUES (
    p_contract_id, p_farmer_id, p_crop_name, p_quantity, p_amount_eth, p_start_date, p_end_date,
    p_delivery_method, p_delivery_location, p_additional_notes, 'PENDING', 0,
    false, p_tx_hash, p_contract_address, NOW(), NOW()
  );

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    f.user_id, p_contract_id, 'Sell Contract Created',
    'Your contract #' || p_contract_id || ' for ' || p_crop_name || ' has been created.',
    'order', jsonb_build_object('contract_id', p_contract_id, 'amount_eth', p_amount_eth), NOW()
  FROM farmers f
  WHERE f.id = p_farmer_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_sell_contract_acceptance(
  p_contract_id BIGINT,
  p_buyer_id UUID,
  p_amount_eth DECIMAL, -- ETH
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE smart_contracts
  SET buyer_id = p_buyer_id,
      status = 'FUNDED',
      escrow_balance_eth = p_amount_eth, -- ETH
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, p_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH', -- ETH
    jsonb_build_object('note', 'Sell contract funding on acceptance', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN buyers b ON b.user_id = w.user_id
  WHERE b.id = p_buyer_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    b.user_id, p_contract_id, 'Contract Funded',
    'Your contract #' || p_contract_id || ' has been funded.', -- INR conversion on frontend
    'payment', jsonb_build_object('contract_id', p_contract_id, 'amount_eth', p_amount_eth), NOW()
  FROM buyers b
  WHERE b.id = p_buyer_id;
END;
$$ LANGUAGE plpgsql;

-- Update Wallet Balance Function for ETH
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND NEW.token_type = 'ETH' THEN
    IF NEW.type = 'DEPOSIT' THEN
      UPDATE wallets 
      SET balance = balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.wallet_id;
    ELSIF NEW.type IN ('WITHDRAWAL', 'TRANSFER') THEN
      IF (SELECT balance FROM wallets WHERE id = NEW.wallet_id) >= NEW.amount THEN
        UPDATE wallets 
        SET balance = balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
      ELSE
        NEW.status := 'FAILED';
        NEW.metadata := NEW.metadata || jsonb_build_object('error', 'Insufficient ETH balance');
        RAISE NOTICE 'Insufficient ETH balance for transaction on wallet %', NEW.wallet_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    NEW.status := 'FAILED';
    NEW.metadata := NEW.metadata || jsonb_build_object('error', SQLERRM);
    RAISE NOTICE 'Transaction failed for wallet %: %', NEW.wallet_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Timestamp Updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smart_contracts_timestamp
  BEFORE UPDATE ON smart_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_smart_contracts_contract_id ON smart_contracts(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_contract_id ON contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_contract_id ON wallet_transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contract_id ON notifications(contract_id);
CREATE INDEX IF NOT EXISTS idx_products_contract_id ON products(contract_id);


-- Add missing field to smart_contracts
ALTER TABLE smart_contracts
ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ;

-- Fix status CHECK constraint in smart_contracts
ALTER TABLE smart_contracts
ALTER COLUMN status
DROP CHECK,
ADD CONSTRAINT status_check CHECK (status IN ('PENDING', 'FUNDED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'RESOLVED'));

-- Fix event_name CHECK constraint in contract_events
ALTER TABLE contract_events
ALTER COLUMN event_name
DROP CHECK,
ADD CONSTRAINT event_name_check CHECK (event_name IN ('ContractCreated', 'ContractStatusUpdated', 'FundsDeposited', 'FundsReleased', 'DisputeRaised', 'DisputeResolved', 'PlatformFeesWithdrawn'));

-- Ensure foreign keys in products, wallet_transactions, notifications
ALTER TABLE products
DROP COLUMN IF EXISTS contract_id,
ADD COLUMN contract_id BIGINT REFERENCES smart_contracts(contract_id) ON DELETE SET NULL;

ALTER TABLE wallet_transactions
DROP COLUMN IF EXISTS contract_id,
ADD COLUMN contract_id BIGINT REFERENCES smart_contracts(contract_id) ON DELETE SET NULL;

ALTER TABLE notifications
DROP COLUMN IF EXISTS contract_id,
ADD COLUMN contract_id BIGINT REFERENCES smart_contracts(contract_id) ON DELETE SET NULL;

-- Create new sync functions (as shown above)


-- ... (paste the sync functions here)



-- Sync Confirm Delivery
CREATE OR REPLACE FUNCTION sync_confirm_delivery(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE smart_contracts
  SET status = 'IN_PROGRESS',
      farmer_confirmed_delivery = TRUE,
      confirmation_deadline = NOW() + INTERVAL '7 days', -- Matches contract's confirmationPeriod
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    b.user_id, p_contract_id, 'Delivery Confirmed',
    'Farmer confirmed delivery for contract #' || p_contract_id || '. Please confirm receipt within 7 days.',
    'order', jsonb_build_object('contract_id', p_contract_id), NOW()
  FROM buyers b
  JOIN smart_contracts sc ON sc.buyer_id = b.id
  WHERE sc.contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Sync Confirm Receipt
CREATE OR REPLACE FUNCTION sync_confirm_receipt(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_amount_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  SELECT amount_eth INTO v_amount_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  v_fee_eth := v_amount_eth * 0.05; -- 5% platform fee

  UPDATE smart_contracts
  SET status = 'COMPLETED',
      buyer_confirmed_receipt = TRUE,
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, (v_amount_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Final payment for contract', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  INSERT INTO platform_fees (
    contract_id, amount_eth, collected_at, tx_hash
  ) VALUES (
    p_contract_id, v_fee_eth, NOW(), p_tx_hash
  );

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    f.user_id, p_contract_id, 'Payment Released',
    'Payment for contract #' || p_contract_id || ' has been released minus platform fee.',
    'payment', jsonb_build_object('contract_id', p_contract_id, 'amount_eth', (v_amount_eth - v_fee_eth)), NOW()
  FROM farmers f
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    b.user_id, p_contract_id, 'Receipt Confirmed',
    'You confirmed receipt for contract #' || p_contract_id || '. Transaction completed.',
    'order', jsonb_build_object('contract_id', p_contract_id), NOW()
  FROM buyers b
  JOIN smart_contracts sc ON sc.buyer_id = b.id
  WHERE sc.contract_id = p_contract_id;

  UPDATE products
  SET status = CASE 
    WHEN type = 'sell' THEN 'sold_out'
    WHEN type = 'buy' THEN 'fulfilled'
    END
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Sync Pay Remaining Sell Contract
CREATE OR REPLACE FUNCTION sync_pay_remaining_sell_contract(
  p_contract_id BIGINT,
  p_amount_eth DECIMAL,
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE smart_contracts
  SET escrow_balance_eth = escrow_balance_eth + p_amount_eth,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, p_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Remaining payment for sell contract', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN buyers b ON b.user_id = w.user_id
  JOIN smart_contracts sc ON sc.buyer_id = b.id
  WHERE sc.contract_id = p_contract_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    b.user_id, p_contract_id, 'Remaining Payment Sent',
    'Remaining payment for contract #' || p_contract_id || ' has been sent.',
    'payment', jsonb_build_object('contract_id', p_contract_id, 'amount_eth', p_amount_eth), NOW()
  FROM buyers b
  JOIN smart_contracts sc ON sc.buyer_id = b.id
  WHERE sc.contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Sync Claim Remaining After Timeout
CREATE OR REPLACE FUNCTION sync_claim_remaining_after_timeout(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_escrow_balance_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  SELECT escrow_balance_eth, (amount_eth * 0.05) INTO v_escrow_balance_eth, v_fee_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  UPDATE smart_contracts
  SET status = 'COMPLETED',
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, (v_escrow_balance_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Claimed remaining after timeout', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  INSERT INTO platform_fees (
    contract_id, amount_eth, collected_at, tx_hash
  ) VALUES (
    p_contract_id, v_fee_eth, NOW(), p_tx_hash
  );

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    f.user_id, p_contract_id, 'Funds Claimed',
    'Remaining funds for contract #' || p_contract_id || ' claimed after timeout.',
    'payment', jsonb_build_object('contract_id', p_contract_id, 'amount_eth', (v_escrow_balance_eth - v_fee_eth)), NOW()
  FROM farmers f
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Sync Raise Dispute
CREATE OR REPLACE FUNCTION sync_raise_dispute(
  p_contract_id BIGINT,
  p_raised_by UUID,
  p_reason TEXT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO disputes (
    contract_id, raised_by, reason, status, created_at, updated_at
  ) VALUES (
    p_contract_id, p_raised_by, p_reason, 'PENDING', NOW(), NOW()
  );

  UPDATE smart_contracts
  SET status = 'DISPUTED',
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  ) VALUES (
    p_raised_by, p_contract_id, 'Dispute Raised',
    'You raised a dispute for contract #' || p_contract_id || '.',
    'dispute', jsonb_build_object('contract_id', p_contract_id, 'reason', p_reason), NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Sync Resolve Dispute
CREATE OR REPLACE FUNCTION sync_resolve_dispute(
  p_contract_id BIGINT,
  p_resolved_by UUID,
  p_pay_farmer BOOLEAN,
  p_resolution TEXT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_escrow_balance_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  SELECT escrow_balance_eth, (amount_eth * 0.05) INTO v_escrow_balance_eth, v_fee_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  UPDATE disputes
  SET status = 'RESOLVED',
      resolution = p_resolution,
      resolved_by = p_resolved_by,
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  UPDATE smart_contracts
  SET status = 'RESOLVED',
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  IF p_pay_farmer THEN
    INSERT INTO wallet_transactions (
      wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
    )
    SELECT 
      w.id, p_contract_id, (v_escrow_balance_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
      jsonb_build_object('note', 'Dispute resolved - paid to farmer', 'tx_hash', p_tx_hash), NOW()
    FROM wallets w
    JOIN farmers f ON f.user_id = w.user_id
    JOIN smart_contracts sc ON sc.farmer_id = f.id
    WHERE sc.contract_id = p_contract_id;

    INSERT INTO platform_fees (
      contract_id, amount_eth, collected_at, tx_hash
    ) VALUES (
      p_contract_id, v_fee_eth, NOW(), p_tx_hash
    );
  ELSE
    INSERT INTO wallet_transactions (
      wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
    )
    SELECT 
      w.id, p_contract_id, v_escrow_balance_eth, 'TRANSFER', 'COMPLETED', 'ETH',
      jsonb_build_object('note', 'Dispute resolved - refunded to buyer', 'tx_hash', p_tx_hash), NOW()
    FROM wallets w
    JOIN buyers b ON b.user_id = w.user_id
    JOIN smart_contracts sc ON sc.buyer_id = b.id
    WHERE sc.contract_id = p_contract_id;
  END IF;

  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    user_id, p_contract_id, 'Dispute Resolved',
    'Dispute for contract #' || p_contract_id || ' has been resolved: ' || p_resolution,
    'dispute', jsonb_build_object('contract_id', p_contract_id, 'resolution', p_resolution), NOW()
  FROM (
    SELECT f.user_id FROM farmers f JOIN smart_contracts sc ON sc.farmer_id = f.id WHERE sc.contract_id = p_contract_id
    UNION
    SELECT b.user_id FROM buyers b JOIN smart_contracts sc ON sc.buyer_id = b.id WHERE sc.contract_id = p_contract_id
  ) AS users;
END;
$$ LANGUAGE plpgsql;

CREATE POLICY "Allow authenticated users to read smart_contracts" ON smart_contracts
FOR SELECT TO authenticated
USING (true);


-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Recreate policies with admin access
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to insert notifications for any user
CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Allow admins to view all notifications
CREATE POLICY "Admins can view all notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

  -- Drop the existing function
DROP FUNCTION IF EXISTS sync_buyer_contract_creation;

-- Recreate the function with SECURITY DEFINER and logging
CREATE OR REPLACE FUNCTION sync_buyer_contract_creation(
  p_contract_id BIGINT,
  p_buyer_id UUID,
  p_crop_name TEXT,
  p_quantity NUMERIC,
  p_amount_eth DECIMAL, -- ETH stored in backend
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_delivery_method TEXT,
  p_delivery_location TEXT,
  p_additional_notes TEXT,
  p_tx_hash TEXT,
  p_contract_address TEXT
) RETURNS VOID AS $$
DECLARE
  v_advance_amount_eth DECIMAL(20,8) := (p_amount_eth * 0.20); -- 20% advance in ETH
  v_buyer_user_id UUID;
BEGIN
  -- Debug: Log the authenticated user and buyer user_id
  SELECT user_id INTO v_buyer_user_id
  FROM buyers
  WHERE id = p_buyer_id;

  RAISE NOTICE 'Authenticated user (auth.uid()): %, Buyer user_id: %', auth.uid(), v_buyer_user_id;

  -- Insert into smart_contracts
  INSERT INTO smart_contracts (
    contract_id, buyer_id, crop_name, quantity, amount_eth, advance_amount_eth,
    start_date, end_date, delivery_method, delivery_location, additional_notes,
    status, escrow_balance_eth, is_buyer_initiated, blockchain_tx_hash, contract_address,
    created_at, updated_at
  ) VALUES (
    p_contract_id, p_buyer_id, p_crop_name, p_quantity, p_amount_eth, v_advance_amount_eth,
    p_start_date, p_end_date, p_delivery_method, p_delivery_location, p_additional_notes,
    'PENDING', p_amount_eth, true, p_tx_hash, p_contract_address, NOW(), NOW()
  );

  -- Insert into wallet_transactions
  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, p_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH', -- ETH
    jsonb_build_object('note', 'Buyer contract funding', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN buyers b ON b.user_id = w.user_id
  WHERE b.id = p_buyer_id;

  -- Temporarily bypass RLS for notifications insert
  SET LOCAL row_security TO 'off';

  -- Insert into notifications
  INSERT INTO notifications (
    user_id, contract_id, title, message, type, data, created_at
  )
  SELECT 
    b.user_id, p_contract_id, 'Buy Contract Created',
    'Your contract #' || p_contract_id || ' for ' || p_crop_name || ' has been created and funded.',
    'order', jsonb_build_object('contract_id', p_contract_id, 'amount_eth', p_amount_eth), NOW()
  FROM buyers b
  WHERE b.id = p_buyer_id;

  -- Re-enable RLS
  SET LOCAL row_security TO 'on';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_buyer_contract_creation TO authenticated;

DROP POLICY IF EXISTS "Users can update own contracts" ON smart_contracts;

CREATE POLICY "Users can update own contracts" ON smart_contracts
FOR UPDATE
TO authenticated
USING (
  -- Allow updates if the user is the farmer and farmer_id is already set
  (farmer_id IS NOT NULL AND farmer_id = (SELECT id FROM farmers WHERE user_id = auth.uid()))
  OR
  -- Allow updates if the user is the buyer and buyer_id is already set
  (buyer_id IS NOT NULL AND buyer_id = (SELECT id FROM buyers WHERE user_id = auth.uid()))
  OR
  -- Allow a farmer to accept a buy contract (farmer_id is NULL, status is PENDING, is_buyer_initiated is true)
  (
    farmer_id IS NULL
    AND status = 'PENDING'
    AND is_buyer_initiated = true
    AND EXISTS (SELECT 1 FROM farmers WHERE user_id = auth.uid())
  )
);



-- Drop the existing function
DROP FUNCTION IF EXISTS sync_buyer_contract_creation;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_buyer_contract_creation(
  p_contract_id BIGINT,
  p_buyer_id UUID,
  p_crop_name TEXT,
  p_quantity NUMERIC,
  p_amount_eth DECIMAL,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_delivery_method TEXT,
  p_delivery_location TEXT,
  p_additional_notes TEXT,
  p_tx_hash TEXT,
  p_contract_address TEXT
) RETURNS VOID AS $$
DECLARE
  v_advance_amount_eth DECIMAL(20,8) := (p_amount_eth * 0.20); -- 20% advance in ETH
  v_buyer_user_id UUID;
BEGIN
  -- Debug: Log the authenticated user and buyer user_id
  SELECT user_id INTO v_buyer_user_id
  FROM buyers
  WHERE id = p_buyer_id;

  RAISE NOTICE 'Authenticated user (auth.uid()): %, Buyer user_id: %', auth.uid(), v_buyer_user_id;

  -- Insert into smart_contracts
  INSERT INTO smart_contracts (
    contract_id, buyer_id, crop_name, quantity, amount_eth, advance_amount_eth,
    start_date, end_date, delivery_method, delivery_location, additional_notes,
    status, escrow_balance_eth, is_buyer_initiated, blockchain_tx_hash, contract_address,
    created_at, updated_at
  ) VALUES (
    p_contract_id, p_buyer_id, p_crop_name, p_quantity, p_amount_eth, v_advance_amount_eth,
    p_start_date, p_end_date, p_delivery_method, p_delivery_location, p_additional_notes,
    'PENDING', p_amount_eth, true, p_tx_hash, p_contract_address, NOW(), NOW()
  );

  -- Insert into wallet_transactions
  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, p_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Buyer contract funding', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN buyers b ON b.user_id = w.user_id
  WHERE b.id = p_buyer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_buyer_contract_creation TO authenticated;



-- Drop the existing function
DROP FUNCTION IF EXISTS sync_farmer_acceptance;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_farmer_acceptance(
  p_contract_id BIGINT,
  p_farmer_id UUID,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_advance_amount_eth DECIMAL(20,8);
BEGIN
  SELECT advance_amount_eth INTO v_advance_amount_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  UPDATE smart_contracts
  SET farmer_id = p_farmer_id,
      status = 'FUNDED',
      escrow_balance_eth = escrow_balance_eth - v_advance_amount_eth,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, v_advance_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Advance payment for contract acceptance', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  WHERE f.id = p_farmer_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_farmer_acceptance TO authenticated;


-- Drop the existing function
DROP FUNCTION IF EXISTS sync_sell_contract_creation;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_sell_contract_creation(
  p_contract_id BIGINT,
  p_farmer_id UUID,
  p_crop_name TEXT,
  p_quantity NUMERIC,
  p_amount_eth DECIMAL,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_delivery_method TEXT,
  p_delivery_location TEXT,
  p_additional_notes TEXT,
  p_tx_hash TEXT,
  p_contract_address TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO smart_contracts (
    contract_id, farmer_id, crop_name, quantity, amount_eth, start_date, end_date,
    delivery_method, delivery_location, additional_notes, status, escrow_balance_eth,
    is_buyer_initiated, blockchain_tx_hash, contract_address, created_at, updated_at
  ) VALUES (
    p_contract_id, p_farmer_id, p_crop_name, p_quantity, p_amount_eth, p_start_date, p_end_date,
    p_delivery_method, p_delivery_location, p_additional_notes, 'PENDING', 0,
    false, p_tx_hash, p_contract_address, NOW(), NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_sell_contract_creation TO authenticated;

-- Drop the existing function
DROP FUNCTION IF EXISTS sync_sell_contract_acceptance;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_sell_contract_acceptance(
  p_contract_id BIGINT,
  p_buyer_id UUID,
  p_amount_eth DECIMAL,
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE smart_contracts
  SET buyer_id = p_buyer_id,
      status = 'FUNDED',
      escrow_balance_eth = p_amount_eth,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, p_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Sell contract funding on acceptance', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN buyers b ON b.user_id = w.user_id
  WHERE b.id = p_buyer_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_sell_contract_acceptance TO authenticated;

-- Drop the existing function
DROP FUNCTION IF EXISTS sync_confirm_delivery;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_confirm_delivery(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE smart_contracts
  SET status = 'IN_PROGRESS',
      farmer_confirmed_delivery = TRUE,
      confirmation_deadline = NOW() + INTERVAL '7 days',
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_confirm_delivery TO authenticated;


-- Drop the existing function
DROP FUNCTION IF EXISTS sync_confirm_receipt;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_confirm_receipt(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_amount_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  SELECT amount_eth INTO v_amount_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  v_fee_eth := v_amount_eth * 0.05; -- 5% platform fee

  UPDATE smart_contracts
  SET status = 'COMPLETED',
      buyer_confirmed_receipt = TRUE,
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, (v_amount_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Final payment for contract', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  INSERT INTO platform_fees (
    contract_id, amount_eth, collected_at, tx_hash
  ) VALUES (
    p_contract_id, v_fee_eth, NOW(), p_tx_hash
  );

  UPDATE products
  SET status = CASE 
    WHEN type = 'sell' THEN 'sold_out'
    WHEN type = 'buy' THEN 'fulfilled'
    END
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_confirm_receipt TO authenticated;


-- Drop the existing function
DROP FUNCTION IF EXISTS sync_pay_remaining_sell_contract;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_pay_remaining_sell_contract(
  p_contract_id BIGINT,
  p_amount_eth DECIMAL,
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE smart_contracts
  SET escrow_balance_eth = escrow_balance_eth + p_amount_eth,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, p_amount_eth, 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Remaining payment for sell contract', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN buyers b ON b.user_id = w.user_id
  JOIN smart_contracts sc ON sc.buyer_id = b.id
  WHERE sc.contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_pay_remaining_sell_contract TO authenticated;

-- Drop the existing function
DROP FUNCTION IF EXISTS sync_claim_remaining_after_timeout;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_claim_remaining_after_timeout(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_escrow_balance_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  SELECT escrow_balance_eth, (amount_eth * 0.05) INTO v_escrow_balance_eth, v_fee_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  UPDATE smart_contracts
  SET status = 'COMPLETED',
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, (v_escrow_balance_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Claimed remaining after timeout', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  INSERT INTO platform_fees (
    contract_id, amount_eth, collected_at, tx_hash
  ) VALUES (
    p_contract_id, v_fee_eth, NOW(), p_tx_hash
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_claim_remaining_after_timeout TO authenticated;



-- Drop the existing function
DROP FUNCTION IF EXISTS sync_raise_dispute;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_raise_dispute(
  p_contract_id BIGINT,
  p_raised_by UUID,
  p_reason TEXT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO disputes (
    contract_id, raised_by, reason, status, created_at, updated_at
  ) VALUES (
    p_contract_id, p_raised_by, p_reason, 'PENDING', NOW(), NOW()
  );

  UPDATE smart_contracts
  SET status = 'DISPUTED',
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_raise_dispute TO authenticated;


-- Drop the existing function
DROP FUNCTION IF EXISTS sync_resolve_dispute;

-- Recreate the function without notification logic
CREATE OR REPLACE FUNCTION sync_resolve_dispute(
  p_contract_id BIGINT,
  p_resolved_by UUID,
  p_pay_farmer BOOLEAN,
  p_resolution TEXT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_escrow_balance_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  SELECT escrow_balance_eth, (amount_eth * 0.05) INTO v_escrow_balance_eth, v_fee_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  UPDATE disputes
  SET status = 'RESOLVED',
      resolution = p_resolution,
      resolved_by = p_resolved_by,
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  UPDATE smart_contracts
  SET status = 'RESOLVED',
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  IF p_pay_farmer THEN
    INSERT INTO wallet_transactions (
      wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
    )
    SELECT 
      w.id, p_contract_id, (v_escrow_balance_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
      jsonb_build_object('note', 'Dispute resolved - paid to farmer', 'tx_hash', p_tx_hash), NOW()
    FROM wallets w
    JOIN farmers f ON f.user_id = w.user_id
    JOIN smart_contracts sc ON sc.farmer_id = f.id
    WHERE sc.contract_id = p_contract_id;

    INSERT INTO platform_fees (
      contract_id, amount_eth, collected_at, tx_hash
    ) VALUES (
      p_contract_id, v_fee_eth, NOW(), p_tx_hash
    );
  ELSE
    INSERT INTO wallet_transactions (
      wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
    )
    SELECT 
      w.id, p_contract_id, v_escrow_balance_eth, 'TRANSFER', 'COMPLETED', 'ETH',
      jsonb_build_object('note', 'Dispute resolved - refunded to buyer', 'tx_hash', p_tx_hash), NOW()
    FROM wallets w
    JOIN buyers b ON b.user_id = w.user_id
    JOIN smart_contracts sc ON sc.buyer_id = b.id
    WHERE sc.contract_id = p_contract_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_resolve_dispute TO authenticated;


ALTER TABLE products
DROP CONSTRAINT valid_status;

DROP FUNCTION IF EXISTS sync_confirm_receipt;

CREATE OR REPLACE FUNCTION sync_confirm_receipt(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_amount_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  -- Fetch the contract amount
  SELECT amount_eth INTO v_amount_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  -- Calculate the platform fee (5%)
  v_fee_eth := v_amount_eth * 0.05;

  -- Update the smart_contracts table
  UPDATE smart_contracts
  SET status = 'COMPLETED',
      buyer_confirmed_receipt = TRUE,
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  -- Insert into wallet_transactions (payment to farmer)
  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, (v_amount_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Final payment for contract', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  -- Insert into platform_fees
  INSERT INTO platform_fees (
    contract_id, amount_eth, collected_at, tx_hash
  ) VALUES (
    p_contract_id, v_fee_eth, NOW(), p_tx_hash
  );

  -- Update the products table (use 'completed' instead of 'sold_out' or 'fulfilled')
  UPDATE products
  SET status = 'completed'
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION sync_confirm_receipt TO authenticated;


DROP FUNCTION IF EXISTS sync_claim_remaining_after_timeout;

CREATE OR REPLACE FUNCTION sync_claim_remaining_after_timeout(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_escrow_balance_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  SELECT escrow_balance_eth, (amount_eth * 0.05) INTO v_escrow_balance_eth, v_fee_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  UPDATE smart_contracts
  SET status = 'COMPLETED',
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, (v_escrow_balance_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Claimed remaining after timeout', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  INSERT INTO platform_fees (
    contract_id, amount_eth, collected_at, tx_hash
  ) VALUES (
    p_contract_id, v_fee_eth, NOW(), p_tx_hash
  );

  -- Update the products table (use 'completed' instead of 'sold_out' or 'fulfilled')
  UPDATE products
  SET status = 'completed'
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION sync_claim_remaining_after_timeout TO authenticated;

CREATE OR REPLACE FUNCTION sync_confirm_receipt(
  p_contract_id BIGINT,
  p_tx_hash TEXT
) RETURNS VOID AS $$
DECLARE
  v_amount_eth DECIMAL(20,8);
  v_fee_eth DECIMAL(20,8);
BEGIN
  -- Fetch the contract amount
  SELECT amount_eth INTO v_amount_eth
  FROM smart_contracts
  WHERE contract_id = p_contract_id;

  -- Calculate the platform fee (5%)
  v_fee_eth := v_amount_eth * 0.05;

  -- Validate that v_fee_eth is greater than 0
  IF v_fee_eth <= 0 THEN
    RAISE EXCEPTION 'Platform fee must be greater than 0 for contract_id %, amount_eth: %, calculated fee: %', 
      p_contract_id, v_amount_eth, v_fee_eth;
  END IF;

  -- Update the smart_contracts table
  UPDATE smart_contracts
  SET status = 'COMPLETED',
      buyer_confirmed_receipt = TRUE,
      escrow_balance_eth = 0,
      blockchain_tx_hash = p_tx_hash,
      updated_at = NOW()
  WHERE contract_id = p_contract_id;

  -- Insert into wallet_transactions (payment to farmer)
  INSERT INTO wallet_transactions (
    wallet_id, contract_id, amount, type, status, token_type, metadata, created_at
  )
  SELECT 
    w.id, p_contract_id, (v_amount_eth - v_fee_eth), 'TRANSFER', 'COMPLETED', 'ETH',
    jsonb_build_object('note', 'Final payment for contract', 'tx_hash', p_tx_hash), NOW()
  FROM wallets w
  JOIN farmers f ON f.user_id = w.user_id
  JOIN smart_contracts sc ON sc.farmer_id = f.id
  WHERE sc.contract_id = p_contract_id;

  -- Insert into platform_fees only if fee is valid
  INSERT INTO platform_fees (
    contract_id, amount_eth, collected_at, tx_hash
  ) VALUES (
    p_contract_id, v_fee_eth, NOW(), p_tx_hash
  );

  -- Update the products table
  UPDATE products
  SET status = 'completed'
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;


DROP POLICY IF EXISTS "Users can update own contracts" ON smart_contracts;

CREATE POLICY "Users can update own contracts" ON smart_contracts
FOR UPDATE
TO authenticated
USING (
  -- Allow updates if the user is the farmer and farmer_id is set
  (farmer_id IS NOT NULL AND farmer_id = (SELECT id FROM farmers WHERE user_id = auth.uid()))
  OR
  -- Allow updates if the user is the buyer and buyer_id is set
  (buyer_id IS NOT NULL AND buyer_id = (SELECT id FROM buyers WHERE user_id = auth.uid()))
  OR
  -- Allow a buyer to accept a sell contract (buyer_id is NULL, status is PENDING, is_buyer_initiated is false)
  (
    buyer_id IS NULL
    AND status = 'PENDING'
    AND is_buyer_initiated = false
    AND EXISTS (SELECT 1 FROM buyers WHERE user_id = auth.uid())
  )
);