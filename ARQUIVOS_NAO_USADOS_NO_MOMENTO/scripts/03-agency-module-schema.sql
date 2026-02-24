-- Agency module database schema

-- Update agencies table with new fields
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_state VARCHAR(2);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(10);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_lat DECIMAL(10, 8);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address_lng DECIMAL(11, 8);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Agency files table
CREATE TABLE IF NOT EXISTS agency_files (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('presentation', 'certificate', 'contract', 'other')),
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    can_delete BOOLEAN DEFAULT true
);

-- Agency wallet table
CREATE TABLE IF NOT EXISTS agency_wallets (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
    available_balance DECIMAL(10, 2) DEFAULT 0.00,
    pending_balance DECIMAL(10, 2) DEFAULT 0.00,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    last_withdrawal TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agency bank accounts table
CREATE TABLE IF NOT EXISTS agency_bank_accounts (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    agency_code VARCHAR(20) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings')),
    cnpj VARCHAR(18) NOT NULL, -- Must match agency CNPJ
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal', 'bonus', 'commission')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    reference_id VARCHAR(100), -- Project ID, invoice ID, etc.
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    receipt_url VARCHAR(500),
    notes TEXT,
    created_by INTEGER REFERENCES users(id), -- Admin who made the transaction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    invoice_url VARCHAR(500), -- Required invoice file
    notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_by INTEGER REFERENCES users(id), -- Admin who processed
    processed_at TIMESTAMP
);

-- Partner promotions table
CREATE TABLE IF NOT EXISTS partner_promotions (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    promoted_by INTEGER NOT NULL REFERENCES users(id),
    promoted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP,
    previous_level VARCHAR(20) NOT NULL,
    new_level VARCHAR(20) NOT NULL,
    benefits TEXT[] -- Array of benefits granted
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agency_files_agency_id ON agency_files(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_files_type ON agency_files(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_agency_id ON wallet_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_agency_id ON withdrawal_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_partner_promotions_agency_id ON partner_promotions(agency_id);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agency_wallets_updated_at 
    BEFORE UPDATE ON agency_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_bank_accounts_updated_at 
    BEFORE UPDATE ON agency_bank_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default wallet for existing agencies
INSERT INTO agency_wallets (agency_id, available_balance, pending_balance, total_earned)
SELECT id, 0.00, 0.00, 0.00 FROM agencies 
WHERE id NOT IN (SELECT agency_id FROM agency_wallets);
