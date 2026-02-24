-- Billing and Overdue Management Schema
-- This script creates tables for invoice management and overdue tracking

-- Invoices table for tracking all billing
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    client_email VARCHAR(200) NOT NULL,
    client_phone VARCHAR(20),
    client_company VARCHAR(200),
    type VARCHAR(20) NOT NULL CHECK (type IN ('project', 'credit_plan', 'post_paid')),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'paid', 'cancelled')),
    description TEXT,
    reference_id VARCHAR(100), -- Project ID, Plan ID, etc.
    checkout_url VARCHAR(500),
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification templates for automated billing
CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp')),
    trigger_days INTEGER NOT NULL, -- Days overdue to trigger
    subject VARCHAR(200),
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification history
CREATE TABLE IF NOT EXISTS notification_history (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL,
    template_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    recipient VARCHAR(200) NOT NULL,
    subject VARCHAR(200),
    content TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (template_id) REFERENCES notification_templates(id)
);

-- Wallet adjustments for admin management
CREATE TABLE IF NOT EXISTS wallet_adjustments (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(200) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    reason TEXT NOT NULL,
    admin_id VARCHAR(50) NOT NULL,
    admin_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_id VARCHAR(100) -- For audit trail
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_notification_history_invoice ON notification_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_wallet_adjustments_user ON wallet_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_adjustments_admin ON wallet_adjustments(admin_id);

-- Trigger to update invoice status based on due date
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update overdue status for invoices past due date
    UPDATE invoices 
    SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
    WHERE due_date < CURRENT_DATE 
    AND status = 'pending';
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run daily
CREATE OR REPLACE TRIGGER trigger_update_invoice_status
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_invoice_status();

-- Function to get billing statistics
CREATE OR REPLACE FUNCTION get_billing_stats()
RETURNS TABLE (
    total_pending BIGINT,
    total_overdue BIGINT,
    total_amount_pending DECIMAL(10,2),
    total_amount_overdue DECIMAL(10,2),
    overdue_0_30 BIGINT,
    overdue_31_60 BIGINT,
    overdue_61_90 BIGINT,
    overdue_90_plus BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as total_overdue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) as total_amount_pending,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount END), 0) as total_amount_overdue,
        COUNT(CASE WHEN status = 'overdue' AND (CURRENT_DATE - due_date) BETWEEN 0 AND 30 THEN 1 END) as overdue_0_30,
        COUNT(CASE WHEN status = 'overdue' AND (CURRENT_DATE - due_date) BETWEEN 31 AND 60 THEN 1 END) as overdue_31_60,
        COUNT(CASE WHEN status = 'overdue' AND (CURRENT_DATE - due_date) BETWEEN 61 AND 90 THEN 1 END) as overdue_61_90,
        COUNT(CASE WHEN status = 'overdue' AND (CURRENT_DATE - due_date) > 90 THEN 1 END) as overdue_90_plus
    FROM invoices;
END;
$$ LANGUAGE plpgsql;

-- Function to get wallet overview
CREATE OR REPLACE FUNCTION get_wallet_overview()
RETURNS TABLE (
    total_available DECIMAL(10,2),
    total_pending DECIMAL(10,2),
    total_blocked DECIMAL(10,2),
    total_earned DECIMAL(10,2),
    active_users BIGINT,
    pending_withdrawals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(available_balance), 0) as total_available,
        COALESCE(SUM(pending_balance), 0) as total_pending,
        COALESCE(SUM(blocked_balance), 0) as total_blocked,
        COALESCE(SUM(total_earned), 0) as total_earned,
        COUNT(CASE WHEN available_balance > 0 OR pending_balance > 0 THEN 1 END) as active_users,
        (SELECT COUNT(*) FROM withdrawal_requests WHERE status IN ('aguardando_analise', 'pagamento_agendado')) as pending_withdrawals
    FROM agency_wallets
    UNION ALL
    SELECT 
        COALESCE(SUM(available_balance), 0) as total_available,
        COALESCE(SUM(pending_balance), 0) as total_pending,
        COALESCE(SUM(blocked_balance), 0) as total_blocked,
        COALESCE(SUM(total_earned), 0) as total_earned,
        COUNT(CASE WHEN available_balance > 0 OR pending_balance > 0 THEN 1 END) as active_users,
        0 as pending_withdrawals
    FROM nomade_wallets;
END;
$$ LANGUAGE plpgsql;

-- Insert default notification templates
INSERT INTO notification_templates (id, name, type, trigger_days, subject, content) VALUES
('template-1', 'Primeiro Lembrete', 'email', 1, 'Lembrete: Fatura em aberto', 'Olá {client_name}, sua fatura no valor de R$ {amount} está em aberto há {overdue_days} dia(s). Clique aqui para pagar: {checkout_url}'),
('template-2', 'Segundo Lembrete', 'email', 7, 'Urgente: Fatura vencida há 7 dias', 'Olá {client_name}, sua fatura no valor de R$ {amount} está vencida há {overdue_days} dias. Para evitar a suspensão dos serviços, efetue o pagamento: {checkout_url}'),
('template-3', 'Terceiro Lembrete', 'email', 15, 'Última oportunidade: Fatura vencida', 'Olá {client_name}, sua fatura no valor de R$ {amount} está vencida há {overdue_days} dias. Esta é sua última oportunidade antes da suspensão: {checkout_url}'),
('template-4', 'WhatsApp Lembrete', 'whatsapp', 3, '', 'Olá {client_name}! Sua fatura de R$ {amount} está em aberto há {overdue_days} dias. Pague agora: {checkout_url}')
ON CONFLICT (id) DO NOTHING;

-- Sample invoices for testing
INSERT INTO invoices (id, client_id, client_name, client_email, client_company, type, amount, due_date, description, reference_id, checkout_url) VALUES
('INV-001', 'client-1', 'João Silva', 'joao@empresa.com', 'Empresa ABC Ltda', 'project', 5000.00, '2024-01-15', 'Projeto de desenvolvimento web', 'PROJ-123', 'https://checkout.example.com/inv-001'),
('INV-002', 'client-2', 'Maria Santos', 'maria@startup.com', 'Startup XYZ', 'credit_plan', 2500.00, '2024-01-20', 'Plano de créditos Premium', 'PLAN-456', 'https://checkout.example.com/inv-002'),
('INV-003', 'client-3', 'Pedro Costa', 'pedro@tech.com', 'Tech Solutions', 'post_paid', 1800.00, '2024-01-25', 'Consumo pós-pago Janeiro', 'POST-789', 'https://checkout.example.com/inv-003')
ON CONFLICT (id) DO NOTHING;
