-- Match Queue System Schema
-- Sistema de fila de match para distribuição automática de projetos premium

-- Tabela principal da fila de match
CREATE TABLE match_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    match_enabled BOOLEAN DEFAULT true,
    max_capacity INTEGER DEFAULT 5,
    
    -- Controle de reports
    has_pending_reports BOOLEAN DEFAULT false,
    pending_reports_count INTEGER DEFAULT 0,
    last_report_date TIMESTAMP,
    
    -- Performance metrics
    satisfaction_rating DECIMAL(3,2) DEFAULT 0.00,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Histórico de distribuição
    last_project_assigned TIMESTAMP,
    total_projects_assigned INTEGER DEFAULT 0,
    
    -- Timestamps
    joined_queue TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_position_change TIMESTAMP,
    
    -- Flags de controle
    is_new_partner BOOLEAN DEFAULT false,
    temporary_suspension JSONB, -- {reason, until, suspended_by}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agency_id),
    UNIQUE(position)
);

-- Regras de distribuição de projetos
CREATE TABLE project_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Critérios de valor
    min_project_value DECIMAL(12,2) DEFAULT 0.00,
    max_project_value DECIMAL(12,2),
    
    -- Níveis de partner compatíveis
    compatible_levels TEXT[] DEFAULT ARRAY['basic', 'premium', 'elite'],
    
    -- Requisitos
    max_pending_reports INTEGER DEFAULT 0,
    min_satisfaction_rating DECIMAL(3,2) DEFAULT 0.00,
    min_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Configurações
    priority_weight INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tentativas de distribuição
CREATE TABLE distribution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL, -- Referência ao projeto premium
    project_value DECIMAL(12,2) NOT NULL,
    
    -- Resultado
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'manual_override')),
    assigned_agency_id UUID REFERENCES agencies(id),
    
    -- Processo de seleção
    eligible_agencies UUID[] DEFAULT ARRAY[]::UUID[],
    selection_criteria TEXT,
    queue_position_at_time INTEGER,
    
    -- Timestamps
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadados
    distribution_rule_id UUID REFERENCES project_distribution_rules(id),
    automated BOOLEAN DEFAULT true,
    assigned_by UUID REFERENCES users(id),
    failure_reason TEXT
);

-- Movimentações na fila
CREATE TABLE queue_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    
    -- Movimento
    action VARCHAR(50) NOT NULL CHECK (action IN ('position_change', 'suspension', 'reactivation', 'manual_redistribution', 'new_entry')),
    from_position INTEGER,
    to_position INTEGER,
    
    -- Contexto
    reason TEXT NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Dados adicionais
    affected_projects UUID[] DEFAULT ARRAY[]::UUID[],
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX idx_match_queue_position ON match_queue(position);
CREATE INDEX idx_match_queue_agency_id ON match_queue(agency_id);
CREATE INDEX idx_match_queue_match_enabled ON match_queue(match_enabled);
CREATE INDEX idx_match_queue_pending_reports ON match_queue(has_pending_reports);

CREATE INDEX idx_distribution_attempts_project_id ON distribution_attempts(project_id);
CREATE INDEX idx_distribution_attempts_agency_id ON distribution_attempts(assigned_agency_id);
CREATE INDEX idx_distribution_attempts_status ON distribution_attempts(status);
CREATE INDEX idx_distribution_attempts_attempted_at ON distribution_attempts(attempted_at);

CREATE INDEX idx_queue_movements_agency_id ON queue_movements(agency_id);
CREATE INDEX idx_queue_movements_action ON queue_movements(action);
CREATE INDEX idx_queue_movements_performed_at ON queue_movements(performed_at);

-- Triggers para atualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_match_queue_updated_at BEFORE UPDATE ON match_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distribution_rules_updated_at BEFORE UPDATE ON project_distribution_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para reordenar posições na fila
CREATE OR REPLACE FUNCTION reorder_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Reordena todas as posições sequencialmente
    WITH ordered_queue AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) as new_position
        FROM match_queue
        WHERE match_enabled = true
    )
    UPDATE match_queue 
    SET position = ordered_queue.new_position,
        last_position_change = CURRENT_TIMESTAMP
    FROM ordered_queue 
    WHERE match_queue.id = ordered_queue.id;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para reordenar quando há mudanças na fila
CREATE TRIGGER reorder_queue_after_changes 
    AFTER INSERT OR UPDATE OR DELETE ON match_queue 
    FOR EACH STATEMENT EXECUTE FUNCTION reorder_queue_positions();

-- Dados iniciais - Regra padrão de distribuição
INSERT INTO project_distribution_rules (
    name,
    description,
    min_project_value,
    max_project_value,
    compatible_levels,
    max_pending_reports,
    min_satisfaction_rating,
    min_completion_rate,
    priority_weight,
    is_active
) VALUES (
    'Distribuição Padrão',
    'Regra padrão para distribuição de projetos premium',
    0.00,
    NULL,
    ARRAY['basic', 'premium', 'elite'],
    2,
    3.0,
    70.0,
    1,
    true
);

-- Comentários nas tabelas
COMMENT ON TABLE match_queue IS 'Fila de match para distribuição automática de projetos premium';
COMMENT ON TABLE project_distribution_rules IS 'Regras configuráveis para distribuição de projetos';
COMMENT ON TABLE distribution_attempts IS 'Histórico de tentativas de distribuição de projetos';
COMMENT ON TABLE queue_movements IS 'Histórico de movimentações na fila de match';
