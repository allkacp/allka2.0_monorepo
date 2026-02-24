-- Extensão da tabela withdrawal_requests para suportar novos status e funcionalidades
ALTER TABLE withdrawal_requests 
DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;

ALTER TABLE withdrawal_requests 
ADD CONSTRAINT withdrawal_requests_status_check 
CHECK (status IN ('aguardando_analise', 'pagamento_agendado', 'pagamento_efetuado', 'cancelado', 'reprovado'));

-- Adicionar novas colunas para gestão financeira avançada
ALTER TABLE withdrawal_requests 
ADD COLUMN IF NOT EXISTS payment_scheduled_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_completed_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS correction_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS auto_cancel_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS omie_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS analysis_deadline TIMESTAMP NOT NULL DEFAULT (created_at + INTERVAL '3 days'),
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP;

-- Tabela para ordens de pagamento do Omie
CREATE TABLE IF NOT EXISTS omie_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    omie_order_id VARCHAR(100) UNIQUE NOT NULL,
    withdrawal_request_id INTEGER REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_cnpj VARCHAR(18) NOT NULL,
    bank_code VARCHAR(10) NOT NULL,
    bank_agency VARCHAR(20) NOT NULL,
    bank_account VARCHAR(20) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings')),
    scheduled_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para histórico de mudanças de status
CREATE TABLE IF NOT EXISTS withdrawal_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    withdrawal_request_id INTEGER REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para configurações de prazos automáticos
CREATE TABLE IF NOT EXISTS financial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configurações padrão
INSERT INTO financial_settings (setting_key, setting_value, description) VALUES
('analysis_deadline_days', '3', 'Prazo em dias úteis para análise de solicitações de saque'),
('payment_deadline_days', '7', 'Prazo em dias úteis para agendar pagamento após aprovação'),
('correction_deadline_days', '7', 'Prazo em dias para correção após reprovação'),
('omie_api_url', '', 'URL da API do Omie para integração'),
('omie_api_key', '', 'Chave da API do Omie'),
('omie_api_secret', '', 'Secret da API do Omie')
ON CONFLICT (setting_key) DO NOTHING;

-- Função para calcular dias úteis
CREATE OR REPLACE FUNCTION add_business_days(start_date DATE, days INTEGER)
RETURNS DATE AS $$
DECLARE
    result_date DATE := start_date;
    days_added INTEGER := 0;
BEGIN
    WHILE days_added < days LOOP
        result_date := result_date + INTERVAL '1 day';
        -- Pular fins de semana (sábado = 6, domingo = 0)
        IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
            days_added := days_added + 1;
        END IF;
    END LOOP;
    RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- Trigger para definir prazos automáticos ao criar solicitação
CREATE OR REPLACE FUNCTION set_withdrawal_deadlines()
RETURNS TRIGGER AS $$
DECLARE
    analysis_days INTEGER;
    payment_days INTEGER;
    correction_days INTEGER;
BEGIN
    -- Buscar configurações de prazo
    SELECT setting_value::INTEGER INTO analysis_days 
    FROM financial_settings WHERE setting_key = 'analysis_deadline_days';
    
    SELECT setting_value::INTEGER INTO payment_days 
    FROM financial_settings WHERE setting_key = 'payment_deadline_days';
    
    SELECT setting_value::INTEGER INTO correction_days 
    FROM financial_settings WHERE setting_key = 'correction_deadline_days';
    
    -- Definir valores padrão se não encontrar configurações
    analysis_days := COALESCE(analysis_days, 3);
    payment_days := COALESCE(payment_days, 7);
    correction_days := COALESCE(correction_days, 7);
    
    -- Definir prazo de análise
    IF NEW.analysis_deadline IS NULL THEN
        NEW.analysis_deadline := add_business_days(NEW.created_at::DATE, analysis_days) + TIME '17:00:00';
    END IF;
    
    -- Definir prazo de pagamento se status for pagamento_agendado
    IF NEW.status = 'pagamento_agendado' AND NEW.payment_deadline IS NULL THEN
        NEW.payment_deadline := add_business_days(CURRENT_DATE, payment_days) + TIME '17:00:00';
    END IF;
    
    -- Definir prazo de correção se status for reprovado
    IF NEW.status = 'reprovado' AND NEW.correction_deadline IS NULL THEN
        NEW.correction_deadline := add_business_days(CURRENT_DATE, correction_days) + TIME '17:00:00';
        NEW.auto_cancel_date := NEW.correction_deadline;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar mudanças de status
CREATE OR REPLACE FUNCTION log_withdrawal_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar mudança de status se houve alteração
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO withdrawal_status_history (
            withdrawal_request_id,
            previous_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.processed_by,
            NEW.notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS set_withdrawal_deadlines_trigger ON withdrawal_requests;
CREATE TRIGGER set_withdrawal_deadlines_trigger
    BEFORE INSERT OR UPDATE ON withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION set_withdrawal_deadlines();

DROP TRIGGER IF EXISTS log_withdrawal_status_change_trigger ON withdrawal_requests;
CREATE TRIGGER log_withdrawal_status_change_trigger
    AFTER UPDATE ON withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION log_withdrawal_status_change();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_omie_payment_orders_updated_at 
    BEFORE UPDATE ON omie_payment_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_settings_updated_at 
    BEFORE UPDATE ON financial_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_analysis_deadline ON withdrawal_requests(analysis_deadline);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payment_deadline ON withdrawal_requests(payment_deadline);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_auto_cancel_date ON withdrawal_requests(auto_cancel_date);
CREATE INDEX IF NOT EXISTS idx_omie_payment_orders_withdrawal_id ON omie_payment_orders(withdrawal_request_id);
CREATE INDEX IF NOT EXISTS idx_omie_payment_orders_status ON omie_payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status_history_request_id ON withdrawal_status_history(withdrawal_request_id);

-- View para estatísticas financeiras
CREATE OR REPLACE VIEW financial_stats AS
SELECT 
    COUNT(*) as total_requests_count,
    SUM(CASE WHEN status IN ('aguardando_analise', 'pagamento_agendado') THEN amount ELSE 0 END) as total_pending_amount,
    COUNT(CASE WHEN status = 'aguardando_analise' THEN 1 END) as aguardando_analise,
    COUNT(CASE WHEN status = 'pagamento_agendado' THEN 1 END) as pagamento_agendado,
    COUNT(CASE WHEN status = 'pagamento_efetuado' THEN 1 END) as pagamento_efetuado,
    COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelado,
    COUNT(CASE WHEN status = 'reprovado' THEN 1 END) as reprovado,
    COUNT(CASE WHEN status = 'aguardando_analise' AND analysis_deadline < CURRENT_TIMESTAMP THEN 1 END) as overdue_analysis,
    COUNT(CASE WHEN status = 'pagamento_agendado' AND payment_deadline < CURRENT_TIMESTAMP THEN 1 END) as overdue_payment,
    SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END) as monthly_volume,
    AVG(CASE WHEN processed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (processed_at - created_at))/86400 END) as average_processing_time
FROM withdrawal_requests
WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';

-- Função para cancelar automaticamente solicitações reprovadas vencidas
CREATE OR REPLACE FUNCTION auto_cancel_expired_withdrawals()
RETURNS INTEGER AS $$
DECLARE
    cancelled_count INTEGER;
BEGIN
    UPDATE withdrawal_requests 
    SET 
        status = 'cancelado',
        notes = COALESCE(notes || E'\n', '') || 'Cancelado automaticamente por vencimento do prazo de correção.',
        processed_at = CURRENT_TIMESTAMP
    WHERE 
        status = 'reprovado' 
        AND auto_cancel_date < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS cancelled_count = ROW_COUNT;
    
    RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas
COMMENT ON TABLE omie_payment_orders IS 'Ordens de pagamento enviadas para o sistema Omie';
COMMENT ON TABLE withdrawal_status_history IS 'Histórico de mudanças de status das solicitações de saque';
COMMENT ON TABLE financial_settings IS 'Configurações do módulo financeiro';
COMMENT ON VIEW financial_stats IS 'Estatísticas em tempo real do módulo financeiro';
COMMENT ON FUNCTION auto_cancel_expired_withdrawals() IS 'Função para cancelar automaticamente solicitações reprovadas vencidas';
