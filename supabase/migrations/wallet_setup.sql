/*
  # Wallet-Related Schema for FarmConnect
*/

-- Ensure wallet_address columns exist in farmers and buyers tables
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS wallet_address text,
  ADD CONSTRAINT unique_wallet_address_farmers UNIQUE (wallet_address);

ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS wallet_address text,
  ADD CONSTRAINT unique_wallet_address_buyers UNIQUE (wallet_address);

-- Create wallets table with all required columns
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    wallet_address TEXT,
    encrypted_private_key TEXT,
    encrypted_mnemonic TEXT,
    balance DECIMAL(20,8) DEFAULT 0 CHECK (balance >= 0),
    token_balance DECIMAL(20,8) DEFAULT 1000 CHECK (token_balance >= 0),
    network TEXT DEFAULT 'sepolia',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update wallets table with missing columns
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'ETH',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS blockchain_network TEXT DEFAULT 'sepolia';

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(20,8) NOT NULL,
    type TEXT CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Create wallet funding requests table
CREATE TABLE IF NOT EXISTS wallet_funding_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount_usdt DECIMAL(20,8) NOT NULL,
    amount_inr DECIMAL(20,8) NOT NULL,
    txid TEXT,
    payment_proof_url TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on wallet-related tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_funding_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing objects if they exist to avoid conflicts (moved after table creation)
DROP TRIGGER IF EXISTS wallet_transaction_trigger ON wallet_transactions;
DROP TRIGGER IF EXISTS user_wallet_trigger ON auth.users;
DROP FUNCTION IF EXISTS update_wallet_balance();
DROP FUNCTION IF EXISTS create_user_wallet();

-- Create function to update wallet balance with improved error handling
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' THEN
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
                NEW.metadata := NEW.metadata || jsonb_build_object('error', 'Insufficient balance for transaction');
                RAISE NOTICE 'Insufficient balance for transaction on wallet %', NEW.wallet_id;
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

-- Create function to create user wallet
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
DECLARE 
    existing_wallet_count integer;
BEGIN
    SELECT COUNT(*) INTO existing_wallet_count
    FROM wallets 
    WHERE user_id = NEW.id;

    IF existing_wallet_count = 0 THEN
        INSERT INTO wallets (
            user_id,
            token_balance,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            1000,  -- Initial token balance
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to ensure one wallet per user
ALTER TABLE wallets 
ADD CONSTRAINT one_wallet_per_user 
UNIQUE (user_id);

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

-- Create RLS policies for wallets
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

-- Add missing RLS policies for insert
CREATE POLICY "Users can insert own wallet" ON wallets
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON wallet_transactions
    FOR INSERT 
    TO authenticated
    WITH CHECK (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

-- Create RLS policies for wallet_transactions
CREATE POLICY "Users can view own transactions" ON wallet_transactions
    FOR SELECT
    TO authenticated
    USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all transactions" ON wallet_transactions
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));

-- Create RLS policies for wallet_funding_requests
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_requests_user_id ON wallet_funding_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_requests_status ON wallet_funding_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_funding_requests_created_at ON wallet_funding_requests(created_at DESC);
CREATE INDEX idx_wallet_transactions_id ON wallet_transactions (id);
CREATE INDEX idx_wallet_transactions_txhash ON wallet_transactions ((metadata->>'txHash'));

-- Create function to add funds to wallet
CREATE OR REPLACE FUNCTION add_wallet_funds(p_wallet_id UUID, p_amount DECIMAL)
RETURNS void AS $$
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
        metadata
    ) VALUES (
        p_wallet_id,
        p_amount,
        'DEPOSIT',
        'COMPLETED',
        jsonb_build_object('note', 'Funding Request Approved')
    );
END;
$$ LANGUAGE plpgsql;

-- Add foreign key constraints
ALTER TABLE wallet_funding_requests
  DROP CONSTRAINT IF EXISTS wallet_funding_requests_user_id_fkey,
  DROP CONSTRAINT IF EXISTS wallet_funding_requests_wallet_id_fkey,
  ADD CONSTRAINT wallet_funding_requests_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT wallet_funding_requests_wallet_id_fkey 
    FOREIGN KEY (wallet_id) 
    REFERENCES wallets(id) ON DELETE CASCADE;

-- Create enhanced view with all required user details
DROP VIEW IF EXISTS public.wallet_funding_request_details;
CREATE OR REPLACE VIEW public.wallet_funding_request_details AS
SELECT 
    wfr.*,
    au.email as user_email,
    au.raw_user_meta_data as user_metadata,
    w.wallet_address,
    w.token_balance,
    f.name as farmer_name,
    b.company_name as buyer_company_name
FROM 
    wallet_funding_requests wfr
    LEFT JOIN auth.users au ON wfr.user_id = au.id
    LEFT JOIN wallets w ON wfr.wallet_id = w.id
    LEFT JOIN farmers f ON wfr.user_id = f.user_id
    LEFT JOIN buyers b ON wfr.user_id = b.user_id;

-- Grant access to the view
GRANT SELECT ON wallet_funding_request_details TO anon, authenticated;



ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;

-- Update existing buyers to link with their wallets
UPDATE buyers b
SET wallet_id = w.id
FROM wallets w
WHERE b.user_id = w.user_id;

-- Optional: Add a unique constraint to ensure one wallet per buyer
ALTER TABLE buyers
  ADD CONSTRAINT unique_wallet_per_buyer UNIQUE (wallet_id);