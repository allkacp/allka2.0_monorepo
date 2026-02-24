-- Schema para Sistema de Comissionamentos e Líderes
-- Versão: 1.0
-- Data: 2024-02-10

-- Tabela de configurações globais de comissionamento
CREATE TABLE IF NOT EXISTS commission_global_settings (
    id SERIAL PRIMARY KEY,
    min_fixed_salary DECIMAL(10,2) NOT NULL DEFAULT 3000.00,
    max_fixed_salary DECIMAL(10,2) NOT NULL DEFAULT 8000.00,
    min_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    max_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 25.00,
    leader_bonus_threshold DECIMAL(10,2) NOT NULL DEFAULT 50000.00,
    leader_bonus_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de categorias de serviços
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de líderes por categoria
CREATE TABLE IF NOT EXISTS category_leaders (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(id) ON DELETE CASCADE,
    nomade_id INTEGER REFERENCES nomades(id) ON DELETE CASCADE,
    fixed_salary DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, nomade_id, start_date)
);

-- Tabela de pagamentos de líderes
CREATE TABLE IF NOT EXISTS leader_payments (
    id SERIAL PRIMARY KEY,
    leader_id INTEGER REFERENCES category_leaders(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- Primeiro dia do mês de referência
    fixed_salary_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    bonus_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    tasks_supervised INTEGER DEFAULT 0,
    category_revenue DECIMAL(10,2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    payment_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(leader_id, month_year)
);

-- Tabela de tarefas críticas assumidas por líderes
CREATE TABLE IF NOT EXISTS leader_critical_tasks (
    id SERIAL PRIMARY KEY,
    leader_id INTEGER REFERENCES category_leaders(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('nomade_unavailable', 'deadline_exceeded', 'third_rejection')),
    assumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    task_value DECIMAL(10,2) NOT NULL,
    commission_earned DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de disponibilidade por categoria
CREATE TABLE IF NOT EXISTS category_availability (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(id) ON DELETE CASCADE,
    active_nomades INTEGER NOT NULL DEFAULT 0,
    tasks_last_30_days INTEGER NOT NULL DEFAULT 0,
    available_hours INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(10) NOT NULL DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
    demand_trend DECIMAL(5,2) DEFAULT 0.00, -- Percentual de crescimento da demanda
    needs_more_professionals BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id)
);

-- Tabela de notificações de disponibilidade
CREATE TABLE IF NOT EXISTS availability_notifications (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('yellow_alert', 'red_alert')),
    message TEXT NOT NULL,
    sent_to VARCHAR(20) NOT NULL CHECK (sent_to IN ('leaders', 'admins', 'both')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de qualificações de nômades (expandida)
CREATE TABLE IF NOT EXISTS nomade_qualifications_extended (
    id SERIAL PRIMARY KEY,
    nomade_id INTEGER REFERENCES nomades(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES service_categories(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paused', 'expired')),
    qualification_date DATE NULL,
    pause_date DATE NULL,
    expiry_date DATE NULL,
    test_score DECIMAL(3,2) NULL, -- Score de 0.00 a 5.00
    qualified_by INTEGER REFERENCES nomades(id) NULL, -- Líder que qualificou
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nomade_id, category_id, task_type)
);

-- Inserir configurações globais padrão
INSERT INTO commission_global_settings (
    min_fixed_salary, max_fixed_salary, min_commission_rate, max_commission_rate,
    leader_bonus_threshold, leader_bonus_rate
) VALUES (
    3000.00, 8000.00, 8.00, 25.00, 50000.00, 5.00
) ON CONFLICT DO NOTHING;

-- Inserir categorias de serviços padrão
INSERT INTO service_categories (name, description) VALUES
    ('Design Gráfico', 'Criação de materiais visuais, logos, identidade visual'),
    ('Copywriting', 'Redação publicitária, conteúdo para web, textos persuasivos'),
    ('Social Media', 'Gestão de redes sociais, criação de conteúdo'),
    ('Desenvolvimento Web', 'Desenvolvimento de sites, aplicações web'),
    ('Edição de Vídeo', 'Edição e produção de conteúdo audiovisual'),
    ('Marketing Digital', 'Estratégias de marketing online, campanhas digitais')
ON CONFLICT (name) DO NOTHING;

-- Inserir dados de disponibilidade inicial para as categorias
INSERT INTO category_availability (category_id, active_nomades, tasks_last_30_days, available_hours, status, demand_trend, needs_more_professionals)
SELECT 
    id,
    CASE 
        WHEN name = 'Design Gráfico' THEN 45
        WHEN name = 'Copywriting' THEN 32
        WHEN name = 'Social Media' THEN 28
        WHEN name = 'Desenvolvimento Web' THEN 18
        WHEN name = 'Edição de Vídeo' THEN 22
        WHEN name = 'Marketing Digital' THEN 15
        ELSE 10
    END,
    CASE 
        WHEN name = 'Design Gráfico' THEN 128
        WHEN name = 'Copywriting' THEN 95
        WHEN name = 'Social Media' THEN 156
        WHEN name = 'Desenvolvimento Web' THEN 34
        WHEN name = 'Edição de Vídeo' THEN 67
        WHEN name = 'Marketing Digital' THEN 89
        ELSE 50
    END,
    CASE 
        WHEN name = 'Design Gráfico' THEN 180
        WHEN name = 'Copywriting' THEN 96
        WHEN name = 'Social Media' THEN 42
        WHEN name = 'Desenvolvimento Web' THEN 144
        WHEN name = 'Edição de Vídeo' THEN 88
        WHEN name = 'Marketing Digital' THEN 24
        ELSE 100
    END,
    CASE 
        WHEN name = 'Design Gráfico' THEN 'green'
        WHEN name = 'Copywriting' THEN 'yellow'
        WHEN name = 'Social Media' THEN 'red'
        WHEN name = 'Desenvolvimento Web' THEN 'green'
        WHEN name = 'Edição de Vídeo' THEN 'yellow'
        WHEN name = 'Marketing Digital' THEN 'red'
        ELSE 'green'
    END,
    CASE 
        WHEN name = 'Design Gráfico' THEN 15.0
        WHEN name = 'Copywriting' THEN 28.0
        WHEN name = 'Social Media' THEN 45.0
        WHEN name = 'Desenvolvimento Web' THEN 8.0
        WHEN name = 'Edição de Vídeo' THEN 22.0
        WHEN name = 'Marketing Digital' THEN 67.0
        ELSE 10.0
    END,
    CASE 
        WHEN name IN ('Social Media', 'Marketing Digital', 'Copywriting', 'Edição de Vídeo') THEN TRUE
        ELSE FALSE
    END
FROM service_categories
ON CONFLICT (category_id) DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_category_leaders_category_id ON category_leaders(category_id);
CREATE INDEX IF NOT EXISTS idx_category_leaders_nomade_id ON category_leaders(nomade_id);
CREATE INDEX IF NOT EXISTS idx_category_leaders_status ON category_leaders(status);
CREATE INDEX IF NOT EXISTS idx_leader_payments_leader_id ON leader_payments(leader_id);
CREATE INDEX IF NOT EXISTS idx_leader_payments_month_year ON leader_payments(month_year);
CREATE INDEX IF NOT EXISTS idx_leader_critical_tasks_leader_id ON leader_critical_tasks(leader_id);
CREATE INDEX IF NOT EXISTS idx_leader_critical_tasks_task_id ON leader_critical_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_category_availability_category_id ON category_availability(category_id);
CREATE INDEX IF NOT EXISTS idx_category_availability_status ON category_availability(status);
CREATE INDEX IF NOT EXISTS idx_nomade_qualifications_extended_nomade_id ON nomade_qualifications_extended(nomade_id);
CREATE INDEX IF NOT EXISTS idx_nomade_qualifications_extended_category_id ON nomade_qualifications_extended(category_id);

-- Criar triggers para atualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers nas tabelas
CREATE TRIGGER update_commission_global_settings_updated_at BEFORE UPDATE ON commission_global_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_category_leaders_updated_at BEFORE UPDATE ON category_leaders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leader_payments_updated_at BEFORE UPDATE ON leader_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leader_critical_tasks_updated_at BEFORE UPDATE ON leader_critical_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nomade_qualifications_extended_updated_at BEFORE UPDATE ON nomade_qualifications_extended FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE commission_global_settings IS 'Configurações globais do sistema de comissionamentos';
COMMENT ON TABLE service_categories IS 'Categorias de serviços da plataforma';
COMMENT ON TABLE category_leaders IS 'Líderes responsáveis por cada categoria';
COMMENT ON TABLE leader_payments IS 'Histórico de pagamentos dos líderes';
COMMENT ON TABLE leader_critical_tasks IS 'Tarefas críticas assumidas pelos líderes';
COMMENT ON TABLE category_availability IS 'Disponibilidade de recursos por categoria';
COMMENT ON TABLE availability_notifications IS 'Notificações de disponibilidade crítica';
COMMENT ON TABLE nomade_qualifications_extended IS 'Qualificações estendidas dos nômades por categoria';
