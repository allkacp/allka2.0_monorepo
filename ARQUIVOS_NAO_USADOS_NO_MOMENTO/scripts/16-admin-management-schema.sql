-- Admin Management Schema
-- This script creates tables for administrative management features

-- User management actions log
CREATE TABLE IF NOT EXISTS user_management_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'activate', 'deactivate', 'password_reset')),
    details TEXT,
    performed_by INTEGER NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Account plans for agencies
CREATE TABLE IF NOT EXISTS account_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('basic', 'premium', 'enterprise')),
    monthly_price DECIMAL(10,2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Account billing for agencies
CREATE TABLE IF NOT EXISTS account_billing (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL, -- References agencies(id) or companies(id)
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('agency', 'company')),
    plan_id INTEGER NOT NULL REFERENCES account_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    next_billing_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('agency', 'company')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'bank_transfer', 'pix')),
    last_four VARCHAR(4),
    brand VARCHAR(50),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    billing_id INTEGER NOT NULL REFERENCES account_billing(id),
    number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Accepted terms tracking
CREATE TABLE IF NOT EXISTS accepted_terms (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('agency', 'company')),
    term_type VARCHAR(50) NOT NULL CHECK (term_type IN ('privacy_policy', 'terms_of_service', 'data_processing', 'service_agreement')),
    term_version VARCHAR(20) NOT NULL,
    accepted_by INTEGER NOT NULL REFERENCES users(id),
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Insert default account plans
INSERT INTO account_plans (name, type, monthly_price, features) VALUES
('Lite',       'lite',       300.00,  '["Ativa conta agency na plataforma", "Acesso ao catálogo básico", "Suporte por email"]'),
('Start',      'start',      500.00,  '["5% de desconto em todos os produtos", "Catálogo completo", "Suporte por email"]'),
('Standard',   'standard',   1000.00, '["10% de desconto em todos os produtos", "Relatórios básicos", "Suporte prioritário"]'),
('Growth',     'growth',     1500.00, '["15% de desconto em todos os produtos", "Relatórios avançados", "Suporte prioritário"]'),
('Scale',      'scale',      3000.00, '["20% de desconto em todos os produtos", "Relatórios completos", "Account manager"]'),
('Squad',      'squad',      5000.00, '["20% de desconto em todos os produtos", "Pós pago", "Squad dedicado", "Para agências"]'),
('Enterprise', 'enterprise', 5000.00, '["Pós pago", "Atendimento exclusivo estratégico", "Squad dedicado", "Para empresas"]');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_management_actions_user_id ON user_management_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_management_actions_performed_by ON user_management_actions(performed_by);
CREATE INDEX IF NOT EXISTS idx_user_management_actions_performed_at ON user_management_actions(performed_at);

CREATE INDEX IF NOT EXISTS idx_account_billing_account ON account_billing(account_id, account_type);
CREATE INDEX IF NOT EXISTS idx_account_billing_status ON account_billing(status);
CREATE INDEX IF NOT EXISTS idx_account_billing_next_billing ON account_billing(next_billing_date);

CREATE INDEX IF NOT EXISTS idx_payment_methods_account ON payment_methods(account_id, account_type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_invoices_billing_id ON invoices(billing_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_accepted_terms_account ON accepted_terms(account_id, account_type);
CREATE INDEX IF NOT EXISTS idx_accepted_terms_type ON accepted_terms(term_type);
CREATE INDEX IF NOT EXISTS idx_accepted_terms_accepted_at ON accepted_terms(accepted_at);

-- Add RLS policies
ALTER TABLE user_management_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE accepted_terms ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
CREATE POLICY "Admin can manage all user actions" ON user_management_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Users can view their own billing" ON account_billing
    FOR SELECT USING (
        (account_type = 'company' AND account_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()::integer
        )) OR
        (account_type = 'agency' AND account_id IN (
            SELECT agency_id FROM users WHERE id = auth.uid()::integer
        )) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::integer 
            AND users.is_admin = true
        )
    );

-- Similar policies for other tables...
