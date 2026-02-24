-- Task Execution System Schema
-- Comprehensive system for task management with AI integration

-- Task executions table (instances of task templates)
CREATE TABLE IF NOT EXISTS task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_id UUID NOT NULL,
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    nomad_id UUID REFERENCES nomades(id) ON DELETE SET NULL,
    
    -- Task details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    briefing TEXT NOT NULL,
    instructions TEXT NOT NULL,
    requirements JSONB DEFAULT '{}',
    deliverables TEXT[] DEFAULT '{}',
    
    -- Status and workflow
    status task_execution_status DEFAULT 'draft',
    priority task_priority DEFAULT 'medium',
    
    -- Timing and pricing
    estimated_hours INTEGER NOT NULL,
    actual_hours INTEGER DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    emergency_deadline TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10,2) NOT NULL,
    emergency_price DECIMAL(10,2),
    
    -- Flags
    is_emergency BOOLEAN DEFAULT FALSE,
    is_overdue BOOLEAN DEFAULT FALSE,
    auto_trigger_next BOOLEAN DEFAULT FALSE,
    
    -- Linked tasks for workflow chains
    linked_tasks UUID[] DEFAULT '{}',
    parent_task_id UUID REFERENCES task_executions(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by UUID NOT NULL,
    updated_by UUID
);

-- Task execution status enum
CREATE TYPE task_execution_status AS ENUM (
    'draft',
    'launched', 
    'in_progress',
    'returned',
    'paused',
    'agency_approval',
    'client_approval',
    'approved',
    'rejected',
    'expired'
);

-- Task priority enum  
CREATE TYPE task_priority AS ENUM (
    'low',
    'medium', 
    'high',
    'urgent',
    'emergency'
);

-- Task chat messages
CREATE TABLE IF NOT EXISTS task_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('client', 'nomad', 'agency', 'ai')),
    message TEXT NOT NULL,
    ai_optimized BOOLEAN DEFAULT FALSE,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task history/audit log
CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task attachments
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task questionnaires (AI-powered form filling)
CREATE TABLE IF NOT EXISTS task_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    fields JSONB NOT NULL DEFAULT '[]',
    ai_completion_percentage INTEGER DEFAULT 0,
    requires_review BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_client ON task_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_nomad ON task_executions(nomad_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_agency ON task_executions(agency_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_deadline ON task_executions(deadline);
CREATE INDEX IF NOT EXISTS idx_task_executions_priority ON task_executions(priority);
CREATE INDEX IF NOT EXISTS idx_task_executions_overdue ON task_executions(is_overdue);
CREATE INDEX IF NOT EXISTS idx_task_executions_emergency ON task_executions(is_emergency);

CREATE INDEX IF NOT EXISTS idx_task_chat_messages_task ON task_chat_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_chat_messages_created ON task_chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created ON task_history(created_at);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_task_execution_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = COALESCE(NEW.updated_by, OLD.updated_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_execution_timestamp
    BEFORE UPDATE ON task_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_task_execution_timestamp();

-- Function to check overdue tasks
CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS void AS $$
BEGIN
    UPDATE task_executions 
    SET is_overdue = TRUE
    WHERE deadline < NOW() 
    AND status NOT IN ('approved', 'rejected', 'expired')
    AND is_overdue = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire tasks
CREATE OR REPLACE FUNCTION expire_old_tasks()
RETURNS void AS $$
BEGIN
    UPDATE task_executions 
    SET status = 'expired'
    WHERE deadline < NOW() - INTERVAL '30 days'
    AND status NOT IN ('approved', 'rejected', 'expired');
END;
$$ LANGUAGE plpgsql;

-- Function to trigger linked tasks
CREATE OR REPLACE FUNCTION trigger_linked_tasks()
RETURNS TRIGGER AS $$
DECLARE
    linked_task_id UUID;
BEGIN
    -- Only trigger when task is approved and has linked tasks
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND array_length(NEW.linked_tasks, 1) > 0 THEN
        -- Update linked tasks to launched status
        FOREACH linked_task_id IN ARRAY NEW.linked_tasks
        LOOP
            UPDATE task_executions 
            SET status = 'launched',
                started_at = NOW()
            WHERE id = linked_task_id 
            AND status = 'draft';
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_linked_tasks
    AFTER UPDATE ON task_executions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_linked_tasks();

-- Function to log task history
CREATE OR REPLACE FUNCTION log_task_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO task_history (task_id, user_id, action, description, old_value, new_value)
        VALUES (
            NEW.id,
            COALESCE(NEW.updated_by, NEW.created_by),
            'status_change',
            'Status alterado de ' || OLD.status || ' para ' || NEW.status,
            to_jsonb(OLD.status),
            to_jsonb(NEW.status)
        );
    END IF;
    
    -- Log nomad assignment
    IF COALESCE(OLD.nomad_id::text, '') != COALESCE(NEW.nomad_id::text, '') THEN
        INSERT INTO task_history (task_id, user_id, action, description, old_value, new_value)
        VALUES (
            NEW.id,
            COALESCE(NEW.updated_by, NEW.created_by),
            'nomad_assignment',
            CASE 
                WHEN NEW.nomad_id IS NULL THEN 'Nômade removido da tarefa'
                WHEN OLD.nomad_id IS NULL THEN 'Nômade atribuído à tarefa'
                ELSE 'Nômade alterado'
            END,
            to_jsonb(OLD.nomad_id),
            to_jsonb(NEW.nomad_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_task_history
    AFTER UPDATE ON task_executions
    FOR EACH ROW
    EXECUTE FUNCTION log_task_history();

-- Views for common queries
CREATE OR REPLACE VIEW task_executions_with_details AS
SELECT 
    te.*,
    tt.name as template_name,
    tt.category as template_category,
    p.name as project_name,
    c.name as client_name,
    a.name as agency_name,
    n.name as nomad_name,
    EXTRACT(DAYS FROM (te.deadline - NOW())) as days_until_deadline,
    (SELECT COUNT(*) FROM task_chat_messages WHERE task_id = te.id) as message_count,
    (SELECT COUNT(*) FROM task_attachments WHERE task_id = te.id) as attachment_count
FROM task_executions te
LEFT JOIN task_templates tt ON te.template_id = tt.id
LEFT JOIN projects p ON te.project_id = p.id
LEFT JOIN companies c ON te.client_id = c.id
LEFT JOIN agencies a ON te.agency_id = a.id
LEFT JOIN nomades n ON te.nomad_id = n.id;

-- Function to get task statistics
CREATE OR REPLACE FUNCTION get_task_statistics(
    user_role TEXT DEFAULT NULL,
    user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_tasks BIGINT,
    draft_tasks BIGINT,
    in_progress_tasks BIGINT,
    overdue_tasks BIGINT,
    completed_tasks BIGINT,
    emergency_tasks BIGINT,
    avg_completion_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE is_overdue = TRUE) as overdue_tasks,
        COUNT(*) FILTER (WHERE status = 'approved') as completed_tasks,
        COUNT(*) FILTER (WHERE is_emergency = TRUE OR priority = 'emergency') as emergency_tasks,
        AVG(completed_at - started_at) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) as avg_completion_time
    FROM task_executions_with_details
    WHERE 
        CASE 
            WHEN user_role = 'nomad' THEN nomad_id = user_id
            WHEN user_role IN ('company_admin', 'company_user') THEN client_id = user_id
            WHEN user_role IN ('agency_admin', 'agency_user') THEN agency_id = user_id
            ELSE TRUE -- admin sees all
        END;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO task_executions (
    template_id, client_id, title, description, briefing, instructions,
    requirements, deliverables, estimated_hours, deadline, price, created_by
) VALUES 
(
    (SELECT id FROM task_templates LIMIT 1),
    (SELECT id FROM companies LIMIT 1),
    'Criação de Logo Corporativo',
    'Desenvolvimento de identidade visual moderna',
    'Cliente busca logo moderno e profissional que transmita confiança e inovação',
    'Seguir guidelines de design corporativo, usar cores sóbrias, criar variações',
    '{"format": "vector", "colors": ["blue", "gray"], "variations": 3}',
    ARRAY['Logo principal', 'Variações coloridas', 'Manual de uso'],
    16,
    NOW() + INTERVAL '7 days',
    1500.00,
    (SELECT id FROM users LIMIT 1)
);

COMMENT ON TABLE task_executions IS 'Execuções de tarefas - instâncias dos templates de tarefas';
COMMENT ON TABLE task_chat_messages IS 'Mensagens de chat das tarefas com suporte a IA';
COMMENT ON TABLE task_history IS 'Histórico de alterações das tarefas para auditoria';
COMMENT ON TABLE task_questionnaires IS 'Questionários inteligentes preenchidos por IA';
