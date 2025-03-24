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