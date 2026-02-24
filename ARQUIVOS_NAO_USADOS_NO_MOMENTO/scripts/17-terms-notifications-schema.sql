-- Terms and Notifications Management Schema
-- This script creates tables for terms management and notification system

-- Terms table for managing all legal documents
CREATE TABLE IF NOT EXISTS terms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    version VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('privacy_policy', 'terms_of_service', 'data_processing', 'service_agreement', 'custom')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    
    UNIQUE(name, version)
);

-- Term conditions for conditional display
CREATE TABLE IF NOT EXISTS term_conditions (
    id VARCHAR(50) PRIMARY KEY,
    term_id VARCHAR(50) NOT NULL,
    condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN ('account_type', 'account_level', 'feature_access', 'project_type')),
    condition_value VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);

-- Term acceptances tracking
CREATE TABLE IF NOT EXISTS term_acceptances (
    id VARCHAR(50) PRIMARY KEY,
    term_id VARCHAR(50) NOT NULL,
    term_version VARCHAR(20) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(200) NOT NULL,
    user_email VARCHAR(200) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('agency', 'nomade', 'admin')),
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    acceptance_method VARCHAR(20) DEFAULT 'web' CHECK (acceptance_method IN ('web', 'mobile', 'api')),
    
    FOREIGN KEY (term_id) REFERENCES terms(id),
    UNIQUE(term_id, term_version, user_id)
);

-- Notification messages
CREATE TABLE IF NOT EXISTS notification_messages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'html', 'rich')),
    has_images BOOLEAN DEFAULT false,
    has_videos BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL
);

-- Notification message attachments
CREATE TABLE IF NOT EXISTS notification_attachments (
    id VARCHAR(50) PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video', 'document')),
    url VARCHAR(500) NOT NULL,
    filename VARCHAR(200) NOT NULL,
    size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (message_id) REFERENCES notification_messages(id) ON DELETE CASCADE
);

-- Notification rules for automated sending
CREATE TABLE IF NOT EXISTS notification_rules (
    id VARCHAR(50) PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Target audience configuration
    target_account_types TEXT[], -- ['agency', 'nomade']
    target_account_levels TEXT[], -- ['partner', 'premium']
    target_project_status TEXT[], -- ['em_andamento', 'atrasado']
    target_custom_filters JSONB DEFAULT '{}',
    
    -- Delivery channels configuration
    channels JSONB NOT NULL DEFAULT '[]', -- [{"type": "email", "is_enabled": true, "config": {}}]
    
    -- Trigger configuration
    trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('manual', 'event', 'scheduled', 'conditional')),
    trigger_config JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL,
    
    FOREIGN KEY (message_id) REFERENCES notification_messages(id)
);

-- Notification triggers for event-based automation
CREATE TABLE IF NOT EXISTS notification_triggers (
    id VARCHAR(50) PRIMARY KEY,
    rule_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'account_created', 'project_overdue', 'task_approved'
    event_config JSONB DEFAULT '{}',
    delay_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (rule_id) REFERENCES notification_rules(id) ON DELETE CASCADE
);

-- Notification sending history
CREATE TABLE IF NOT EXISTS notification_history (
    id VARCHAR(50) PRIMARY KEY,
    rule_id VARCHAR(50) NOT NULL,
    message_id VARCHAR(50) NOT NULL,
    recipient_id VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_email VARCHAR(200),
    recipient_phone VARCHAR(20),
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'opened', 'clicked')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    
    FOREIGN KEY (rule_id) REFERENCES notification_rules(id),
    FOREIGN KEY (message_id) REFERENCES notification_messages(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_terms_type ON terms(type);
CREATE INDEX IF NOT EXISTS idx_terms_active ON terms(is_active);
CREATE INDEX IF NOT EXISTS idx_term_conditions_term ON term_conditions(term_id);
CREATE INDEX IF NOT EXISTS idx_term_acceptances_user ON term_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_term_acceptances_term ON term_acceptances(term_id, term_version);
CREATE INDEX IF NOT EXISTS idx_term_acceptances_account ON term_acceptances(account_id, account_type);
CREATE INDEX IF NOT EXISTS idx_notification_messages_active ON notification_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_rules_message ON notification_rules(message_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON notification_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_history_recipient ON notification_history(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_rule ON notification_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);

-- Row Level Security
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only for management tables)
CREATE POLICY "Admin only access" ON terms FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin only access" ON term_conditions FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin only access" ON notification_messages FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin only access" ON notification_attachments FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin only access" ON notification_rules FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin only access" ON notification_triggers FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admin only access" ON notification_history FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Users can view their own term acceptances
CREATE POLICY "Users can view own acceptances" ON term_acceptances FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Admin can view all acceptances" ON term_acceptances FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Functions for term management
CREATE OR REPLACE FUNCTION get_required_terms_for_user(
    p_user_id VARCHAR(50),
    p_account_type VARCHAR(20),
    p_account_level VARCHAR(50) DEFAULT NULL,
    p_feature_access VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    term_id VARCHAR(50),
    term_name VARCHAR(200),
    term_version VARCHAR(20),
    term_type VARCHAR(50),
    is_accepted BOOLEAN,
    accepted_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as term_id,
        t.name as term_name,
        t.version as term_version,
        t.type as term_type,
        (ta.id IS NOT NULL) as is_accepted,
        ta.accepted_at
    FROM terms t
    LEFT JOIN term_conditions tc ON t.id = tc.term_id
    LEFT JOIN term_acceptances ta ON t.id = ta.term_id 
        AND t.version = ta.term_version 
        AND ta.user_id = p_user_id
    WHERE t.is_active = true
    AND (
        -- No conditions means applies to everyone
        NOT EXISTS (SELECT 1 FROM term_conditions WHERE term_id = t.id)
        OR
        -- Has conditions that match user criteria
        EXISTS (
            SELECT 1 FROM term_conditions tc2 
            WHERE tc2.term_id = t.id 
            AND (
                (tc2.condition_type = 'account_type' AND tc2.condition_value = p_account_type)
                OR (tc2.condition_type = 'account_level' AND tc2.condition_value = p_account_level)
                OR (tc2.condition_type = 'feature_access' AND tc2.condition_value = p_feature_access)
            )
        )
    )
    GROUP BY t.id, t.name, t.version, t.type, ta.id, ta.accepted_at
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_sent BIGINT,
    total_delivered BIGINT,
    total_opened BIGINT,
    total_clicked BIGINT,
    delivery_rate DECIMAL(5,2),
    open_rate DECIMAL(5,2),
    click_rate DECIMAL(5,2),
    channel_stats JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END) as total_delivered,
        COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) as total_opened,
        COUNT(CASE WHEN status = 'clicked' THEN 1 END) as total_clicked,
        ROUND(
            COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0), 2
        ) as delivery_rate,
        ROUND(
            COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END), 0), 2
        ) as open_rate,
        ROUND(
            COUNT(CASE WHEN status = 'clicked' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END), 0), 2
        ) as click_rate,
        jsonb_object_agg(
            channel,
            jsonb_build_object(
                'sent', channel_sent,
                'delivered', channel_delivered,
                'opened', channel_opened,
                'clicked', channel_clicked
            )
        ) as channel_stats
    FROM (
        SELECT 
            channel,
            COUNT(*) as channel_sent,
            COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END) as channel_delivered,
            COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) as channel_opened,
            COUNT(CASE WHEN status = 'clicked' THEN 1 END) as channel_clicked
        FROM notification_history
        WHERE sent_at::date BETWEEN p_start_date AND p_end_date
        GROUP BY channel
    ) channel_data;
END;
$$ LANGUAGE plpgsql;

-- Insert sample terms
INSERT INTO terms (id, name, version, content, type, created_by) VALUES
('term-privacy-1', 'Política de Privacidade', '2.1', 'Esta política descreve como coletamos, usamos e protegemos suas informações pessoais...', 'privacy_policy', 'admin-system'),
('term-service-1', 'Termos de Serviço', '3.0', 'Estes termos regem o uso da plataforma Allka...', 'terms_of_service', 'admin-system'),
('term-data-1', 'Processamento de Dados', '1.5', 'Informações sobre como processamos seus dados pessoais...', 'data_processing', 'admin-system')
ON CONFLICT (id) DO NOTHING;

-- Insert sample term conditions
INSERT INTO term_conditions (id, term_id, condition_type, condition_value, is_required) VALUES
('cond-1', 'term-service-1', 'account_type', 'agency', true),
('cond-2', 'term-service-1', 'account_type', 'nomade', true),
('cond-3', 'term-data-1', 'account_level', 'partner', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample notification messages
INSERT INTO notification_messages (id, name, title, content, message_type, created_by) VALUES
('msg-welcome-1', 'Boas-vindas Agência', 'Bem-vindo à Allka!', 'Olá {user_name}, seja bem-vindo à plataforma Allka. Estamos felizes em tê-lo conosco!', 'html', 'admin-system'),
('msg-overdue-1', 'Projeto Atrasado', 'Atenção: Projeto com atraso', 'Seu projeto {project_name} está com {delay_days} dias de atraso. Por favor, verifique o status.', 'text', 'admin-system'),
('msg-task-approved-1', 'Tarefa Aprovada', 'Parabéns! Tarefa aprovada', 'Sua tarefa {task_name} foi aprovada. O pagamento será processado em breve.', 'html', 'admin-system')
ON CONFLICT (id) DO NOTHING;

-- Insert sample notification rules
INSERT INTO notification_rules (id, message_id, name, target_account_types, channels, trigger_type, trigger_config, created_by) VALUES
('rule-welcome-1', 'msg-welcome-1', 'Boas-vindas Automático', '["agency"]', '[{"type": "email", "is_enabled": true, "config": {}}, {"type": "in_app_popup", "is_enabled": true, "config": {}}]', 'event', '{"event": "account_created"}', 'admin-system'),
('rule-overdue-1', 'msg-overdue-1', 'Alerta Projeto Atrasado', '["agency"]', '[{"type": "email", "is_enabled": true, "config": {}}, {"type": "whatsapp", "is_enabled": true, "config": {}}]', 'conditional', '{"condition": "project_overdue", "days": 3}', 'admin-system')
ON CONFLICT (id) DO NOTHING;

-- Insert sample notification triggers
INSERT INTO notification_triggers (id, rule_id, event_type, event_config, delay_minutes) VALUES
('trigger-1', 'rule-welcome-1', 'account_created', '{}', 0),
('trigger-2', 'rule-overdue-1', 'project_status_changed', '{"status": "atrasado"}', 60)
ON CONFLICT (id) DO NOTHING;
