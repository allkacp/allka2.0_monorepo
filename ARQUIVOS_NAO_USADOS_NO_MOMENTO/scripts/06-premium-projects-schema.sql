-- Premium Projects Module Schema
-- This module manages high-value projects from lead conversion to completion

-- Premium clients table (converted from leads)
CREATE TABLE IF NOT EXISTS premium_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    segment VARCHAR(100),
    created_from_lead BOOLEAN DEFAULT TRUE,
    lead_id UUID, -- Reference to original lead if applicable
    potential_value DECIMAL(12,2) DEFAULT 0,
    contact_preference VARCHAR(20) DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone', 'whatsapp')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commercial administrators table
CREATE TABLE IF NOT EXISTS commercial_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Reference to main users table
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    active_projects INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Premium projects table
CREATE TABLE IF NOT EXISTS premium_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES premium_clients(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'elaborado' CHECK (status IN (
        'elaborado', 'em_negociacao', 'perdido', 'aguardando_pagamento',
        'ativo', 'inadimplente', 'cancelado', 'concluido'
    )),
    value DECIMAL(12,2) NOT NULL,
    
    -- Responsáveis
    commercial_admin_id UUID REFERENCES commercial_admins(id),
    partner_agency_id UUID REFERENCES agencies(id),
    
    -- Datas importantes
    proposal_date DATE NOT NULL,
    negotiation_start DATE,
    payment_due_date DATE,
    start_date DATE,
    completion_date DATE,
    
    -- Relatórios e acompanhamento
    last_report_date DATE,
    next_report_due DATE,
    
    -- Métricas
    conversion_probability INTEGER DEFAULT 50 CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
    satisfaction_score DECIMAL(3,2) DEFAULT 0 CHECK (satisfaction_score >= 0 AND satisfaction_score <= 5),
    churn_risk VARCHAR(10) DEFAULT 'low' CHECK (churn_risk IN ('low', 'medium', 'high')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project reports table
CREATE TABLE IF NOT EXISTS project_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES premium_projects(id) ON DELETE CASCADE,
    reporter_type VARCHAR(20) NOT NULL CHECK (reporter_type IN ('commercial_admin', 'partner_agency')),
    reporter_id UUID NOT NULL,
    report_date DATE NOT NULL,
    
    -- Conteúdo do relatório
    status_update TEXT NOT NULL,
    client_satisfaction INTEGER CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
    challenges TEXT,
    next_steps TEXT,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Métricas específicas
    budget_status VARCHAR(20) DEFAULT 'on_track' CHECK (budget_status IN ('on_track', 'over_budget', 'under_budget')),
    timeline_status VARCHAR(20) DEFAULT 'on_time' CHECK (timeline_status IN ('on_time', 'delayed', 'ahead')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report attachments table
CREATE TABLE IF NOT EXISTS report_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES project_reports(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project history table
CREATE TABLE IF NOT EXISTS project_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES premium_projects(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'commercial', 'partner')),
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Churn events table
CREATE TABLE IF NOT EXISTS churn_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_agency_id UUID REFERENCES agencies(id),
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    affected_projects_count INTEGER DEFAULT 0,
    redistribution_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project redistributions table
CREATE TABLE IF NOT EXISTS project_redistributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    churn_event_id UUID REFERENCES churn_events(id) ON DELETE CASCADE,
    project_id UUID REFERENCES premium_projects(id) ON DELETE CASCADE,
    from_agency_id UUID REFERENCES agencies(id),
    to_agency_id UUID REFERENCES agencies(id),
    redistribution_date DATE NOT NULL,
    reason TEXT NOT NULL,
    client_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_premium_clients_email ON premium_clients(email);
CREATE INDEX IF NOT EXISTS idx_premium_clients_lead_id ON premium_clients(lead_id);
CREATE INDEX IF NOT EXISTS idx_commercial_admins_user_id ON commercial_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_commercial_admins_status ON commercial_admins(status);
CREATE INDEX IF NOT EXISTS idx_premium_projects_client_id ON premium_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_premium_projects_status ON premium_projects(status);
CREATE INDEX IF NOT EXISTS idx_premium_projects_commercial_admin_id ON premium_projects(commercial_admin_id);
CREATE INDEX IF NOT EXISTS idx_premium_projects_partner_agency_id ON premium_projects(partner_agency_id);
CREATE INDEX IF NOT EXISTS idx_premium_projects_proposal_date ON premium_projects(proposal_date);
CREATE INDEX IF NOT EXISTS idx_project_reports_project_id ON project_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_reporter_id ON project_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_report_date ON project_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON project_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_history_timestamp ON project_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_churn_events_partner_agency_id ON churn_events(partner_agency_id);
CREATE INDEX IF NOT EXISTS idx_churn_events_date ON churn_events(date);
CREATE INDEX IF NOT EXISTS idx_project_redistributions_project_id ON project_redistributions(project_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_premium_clients_updated_at BEFORE UPDATE ON premium_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commercial_admins_updated_at BEFORE UPDATE ON commercial_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_premium_projects_updated_at BEFORE UPDATE ON premium_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_reports_updated_at BEFORE UPDATE ON project_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_churn_events_updated_at BEFORE UPDATE ON churn_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development
INSERT INTO commercial_admins (user_id, name, email, phone, active_projects, conversion_rate, total_revenue) VALUES
(gen_random_uuid(), 'Carlos Mendes', 'carlos.mendes@allka.com', '+55 11 99999-0001', 5, 75.5, 250000.00),
(gen_random_uuid(), 'Ana Paula Silva', 'ana.silva@allka.com', '+55 11 99999-0002', 3, 82.3, 180000.00),
(gen_random_uuid(), 'Roberto Santos', 'roberto.santos@allka.com', '+55 11 99999-0003', 7, 68.9, 320000.00);

INSERT INTO premium_clients (name, email, phone, company, segment, potential_value, contact_preference) VALUES
('João Empresário', 'joao@empresa.com', '+55 11 98888-0001', 'Empresa Tech Ltda', 'Tecnologia', 50000.00, 'email'),
('Maria Gestora', 'maria@startup.com', '+55 11 98888-0002', 'Startup Inovadora', 'Startups', 75000.00, 'whatsapp'),
('Pedro Diretor', 'pedro@corporacao.com', '+55 11 98888-0003', 'Corporação Grande', 'Corporativo', 120000.00, 'phone');

-- Comments for documentation
COMMENT ON TABLE premium_clients IS 'Clientes potenciais convertidos de leads para projetos premium';
COMMENT ON TABLE commercial_admins IS 'Administradores comerciais responsáveis por projetos premium';
COMMENT ON TABLE premium_projects IS 'Projetos de alto valor com fluxo específico de gestão';
COMMENT ON TABLE project_reports IS 'Relatórios periódicos de acompanhamento dos projetos';
COMMENT ON TABLE project_history IS 'Histórico completo de ações realizadas nos projetos';
COMMENT ON TABLE churn_events IS 'Eventos de saída de agências Partner do programa';
COMMENT ON TABLE project_redistributions IS 'Redistribuição de projetos quando agências saem do programa';
