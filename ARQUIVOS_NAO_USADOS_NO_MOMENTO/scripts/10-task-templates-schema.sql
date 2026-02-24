-- Task Templates Management Module Schema
-- Comprehensive system for task template management, distribution, and analytics

-- Task Templates
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    complexity VARCHAR(20) NOT NULL CHECK (complexity IN ('basic', 'intermediate', 'advanced', 'premium')),
    
    -- Pricing and timing
    base_price DECIMAL(10,2) NOT NULL,
    emergency_multiplier DECIMAL(3,2) DEFAULT 1.5,
    revision_time_hours INTEGER DEFAULT 4,
    estimated_hours INTEGER NOT NULL,
    
    -- Instructions
    execution_instructions TEXT NOT NULL,
    briefing_instructions TEXT NOT NULL,
    
    -- Task chaining
    prerequisite_tasks UUID[], -- Array of task template IDs
    triggers_tasks UUID[], -- Array of task template IDs
    
    -- Ranking criteria (stored as JSONB for flexibility)
    ranking_criteria JSONB NOT NULL DEFAULT '{
        "weight_task_rating": 40,
        "weight_availability": 20,
        "weight_project_history": 25,
        "weight_overall_score": 15,
        "min_task_rating": 4.0,
        "min_overall_score": 4.0,
        "min_available_hours": 8,
        "required_qualifications": [],
        "prefer_project_experience": true,
        "prefer_category_specialist": false
    }',
    
    -- Configuration
    qualification_test_id UUID,
    is_active BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    max_revisions INTEGER DEFAULT 3,
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL
);

-- Task Template Statistics (computed and cached)
CREATE TABLE IF NOT EXISTS task_template_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
    
    -- Performance metrics
    total_executions INTEGER DEFAULT 0,
    average_completion_time DECIMAL(5,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    average_revisions DECIMAL(3,2) DEFAULT 0,
    
    -- Performance by nomade level (JSONB for flexibility)
    performance_by_level JSONB DEFAULT '{}',
    
    -- Recent trends (last 30 days)
    last_30_days JSONB DEFAULT '{
        "executions": 0,
        "avg_rating": 0,
        "issues": 0
    }',
    
    -- Computed at
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(template_id)
);

-- Task Executions
CREATE TABLE IF NOT EXISTS task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
    project_id UUID, -- Reference to project system
    assigned_nomade_id UUID REFERENCES nomades(id),
    
    -- Status and timing
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'under_review', 'revision_requested', 'completed', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
    
    -- Dates
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Content
    briefing_data JSONB DEFAULT '{}',
    
    -- Feedback and rating
    client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
    client_feedback TEXT,
    nomade_notes TEXT,
    
    -- Revisions
    revision_count INTEGER DEFAULT 0,
    
    -- Chain execution
    triggered_by UUID REFERENCES task_executions(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task Deliverables
CREATE TABLE IF NOT EXISTS task_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    content TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('file', 'text', 'link', 'image')),
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT false,
    feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task Revisions
CREATE TABLE IF NOT EXISTS task_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    requested_by UUID NOT NULL,
    
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task Distribution Attempts
CREATE TABLE IF NOT EXISTS task_distribution_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    
    -- Ranking results (stored as JSONB)
    eligible_nomades JSONB DEFAULT '[]',
    selected_nomade_id UUID REFERENCES nomades(id),
    
    -- Attempt details
    attempt_number INTEGER NOT NULL DEFAULT 1,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'declined', 'timeout', 'failed')),
    
    -- Failure handling
    failure_reason TEXT,
    retry_at TIMESTAMP WITH TIME ZONE,
    escalated_to_leader BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Qualification Tests
CREATE TABLE IF NOT EXISTS qualification_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Test content (stored as JSONB for flexibility)
    questions JSONB DEFAULT '[]',
    practical_tasks JSONB DEFAULT '[]',
    
    -- Scoring
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts INTEGER DEFAULT 3,
    time_limit_minutes INTEGER,
    
    -- Results tracking
    total_attempts INTEGER DEFAULT 0,
    pass_rate DECIMAL(5,2) DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Test Submissions
CREATE TABLE IF NOT EXISTS test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES qualification_tests(id) ON DELETE CASCADE,
    nomade_id UUID REFERENCES nomades(id) ON DELETE CASCADE,
    
    -- Submission details
    answers JSONB DEFAULT '{}',
    practical_deliverables JSONB DEFAULT '{}',
    
    -- Scoring
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    feedback TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    
    attempt_number INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(test_id, nomade_id, attempt_number)
);

-- Task Chain Executions (for managing complex workflows)
CREATE TABLE IF NOT EXISTS task_chain_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL,
    
    -- Chain definition (stored as JSONB)
    tasks JSONB NOT NULL DEFAULT '[]',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    current_task_position INTEGER DEFAULT 0,
    
    -- Progress
    completed_tasks INTEGER DEFAULT 0,
    total_tasks INTEGER NOT NULL,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON task_templates(category);
CREATE INDEX IF NOT EXISTS idx_task_templates_complexity ON task_templates(complexity);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_active ON task_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON task_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_task_executions_template_id ON task_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_project_id ON task_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_assigned_nomade_id ON task_executions(assigned_nomade_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_due_date ON task_executions(due_date);

CREATE INDEX IF NOT EXISTS idx_task_deliverables_execution_id ON task_deliverables(execution_id);
CREATE INDEX IF NOT EXISTS idx_task_revisions_execution_id ON task_revisions(execution_id);
CREATE INDEX IF NOT EXISTS idx_task_distribution_attempts_template_id ON task_distribution_attempts(template_id);
CREATE INDEX IF NOT EXISTS idx_task_distribution_attempts_execution_id ON task_distribution_attempts(execution_id);

CREATE INDEX IF NOT EXISTS idx_qualification_tests_category ON qualification_tests(category);
CREATE INDEX IF NOT EXISTS idx_qualification_tests_is_active ON qualification_tests(is_active);
CREATE INDEX IF NOT EXISTS idx_test_submissions_test_id ON test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_nomade_id ON test_submissions(nomade_id);

CREATE INDEX IF NOT EXISTS idx_task_chain_executions_project_id ON task_chain_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_task_chain_executions_status ON task_chain_executions(status);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qualification_tests_updated_at BEFORE UPDATE ON qualification_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_executions_updated_at BEFORE UPDATE ON task_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_chain_executions_updated_at BEFORE UPDATE ON task_chain_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate task template statistics
CREATE OR REPLACE FUNCTION calculate_task_template_stats(template_uuid UUID)
RETURNS void AS $$
DECLARE
    total_execs INTEGER;
    avg_completion DECIMAL(5,2);
    avg_rating DECIMAL(3,2);
    success_rate DECIMAL(5,2);
    avg_revisions DECIMAL(3,2);
    recent_stats JSONB;
    level_performance JSONB;
BEGIN
    -- Calculate basic statistics
    SELECT 
        COUNT(*),
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600),
        AVG(client_rating),
        (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
        AVG(revision_count)
    INTO total_execs, avg_completion, avg_rating, success_rate, avg_revisions
    FROM task_executions 
    WHERE template_id = template_uuid AND status IN ('completed', 'cancelled');
    
    -- Calculate recent statistics (last 30 days)
    SELECT jsonb_build_object(
        'executions', COUNT(*),
        'avg_rating', AVG(client_rating),
        'issues', COUNT(*) FILTER (WHERE revision_count > 2)
    )
    INTO recent_stats
    FROM task_executions 
    WHERE template_id = template_uuid 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Calculate performance by nomade level
    SELECT jsonb_object_agg(
        n.level,
        jsonb_build_object(
            'avg_time', AVG(EXTRACT(EPOCH FROM (te.completed_at - te.started_at))/3600),
            'avg_rating', AVG(te.client_rating),
            'completion_rate', (COUNT(*) FILTER (WHERE te.status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100
        )
    )
    INTO level_performance
    FROM task_executions te
    JOIN nomades n ON te.assigned_nomade_id = n.id
    WHERE te.template_id = template_uuid
    GROUP BY n.level;
    
    -- Insert or update statistics
    INSERT INTO task_template_stats (
        template_id, total_executions, average_completion_time, 
        average_rating, success_rate, average_revisions,
        performance_by_level, last_30_days, computed_at
    ) VALUES (
        template_uuid, COALESCE(total_execs, 0), COALESCE(avg_completion, 0),
        COALESCE(avg_rating, 0), COALESCE(success_rate, 0), COALESCE(avg_revisions, 0),
        COALESCE(level_performance, '{}'), COALESCE(recent_stats, '{}'), CURRENT_TIMESTAMP
    )
    ON CONFLICT (template_id) DO UPDATE SET
        total_executions = EXCLUDED.total_executions,
        average_completion_time = EXCLUDED.average_completion_time,
        average_rating = EXCLUDED.average_rating,
        success_rate = EXCLUDED.success_rate,
        average_revisions = EXCLUDED.average_revisions,
        performance_by_level = EXCLUDED.performance_by_level,
        last_30_days = EXCLUDED.last_30_days,
        computed_at = EXCLUDED.computed_at;
END;
$$ LANGUAGE plpgsql;

-- Function to rank nomades for task distribution
CREATE OR REPLACE FUNCTION rank_nomades_for_task(template_uuid UUID, project_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    nomade_id UUID,
    nomade_name VARCHAR,
    nomade_level VARCHAR,
    total_score DECIMAL,
    task_rating_score DECIMAL,
    availability_score DECIMAL,
    project_history_score DECIMAL,
    overall_score DECIMAL,
    available_hours INTEGER,
    is_qualified BOOLEAN
) AS $$
DECLARE
    criteria JSONB;
    weight_task_rating DECIMAL;
    weight_availability DECIMAL;
    weight_project_history DECIMAL;
    weight_overall_score DECIMAL;
    min_task_rating DECIMAL;
    min_overall_score DECIMAL;
    min_available_hours INTEGER;
    required_quals TEXT[];
BEGIN
    -- Get ranking criteria for the template
    SELECT ranking_criteria INTO criteria
    FROM task_templates 
    WHERE id = template_uuid;
    
    -- Extract weights and minimums
    weight_task_rating := (criteria->>'weight_task_rating')::DECIMAL / 100;
    weight_availability := (criteria->>'weight_availability')::DECIMAL / 100;
    weight_project_history := (criteria->>'weight_project_history')::DECIMAL / 100;
    weight_overall_score := (criteria->>'weight_overall_score')::DECIMAL / 100;
    
    min_task_rating := (criteria->>'min_task_rating')::DECIMAL;
    min_overall_score := (criteria->>'min_overall_score')::DECIMAL;
    min_available_hours := (criteria->>'min_available_hours')::INTEGER;
    
    -- Extract required qualifications
    SELECT ARRAY(SELECT jsonb_array_elements_text(criteria->'required_qualifications'))
    INTO required_quals;
    
    RETURN QUERY
    WITH nomade_scores AS (
        SELECT 
            n.id,
            u.name,
            n.level,
            n.available_hours,
            n.overall_score,
            
            -- Task-specific rating (mock calculation)
            COALESCE(4.5, 0) as task_specific_rating,
            
            -- Project history score (mock calculation)
            CASE 
                WHEN project_uuid IS NOT NULL THEN 5.0
                ELSE 3.0
            END as project_history,
            
            -- Check qualifications
            CASE 
                WHEN array_length(required_quals, 1) IS NULL THEN true
                ELSE EXISTS (
                    SELECT 1 FROM nomade_qualifications nq 
                    WHERE nq.nomade_id = n.id 
                    AND nq.category = ANY(required_quals)
                    AND nq.is_active = true
                )
            END as meets_qualifications
            
        FROM nomades n
        JOIN users u ON n.user_id = u.id
        WHERE n.status = 'active'
        AND n.available_hours >= min_available_hours
        AND n.overall_score >= min_overall_score
    )
    SELECT 
        ns.id,
        ns.name,
        ns.level,
        
        -- Calculate total weighted score
        (ns.task_specific_rating * weight_task_rating +
         (ns.available_hours::DECIMAL / 40) * 5 * weight_availability +
         ns.project_history * weight_project_history +
         ns.overall_score * weight_overall_score) as total_score,
         
        ns.task_specific_rating * weight_task_rating as task_rating_score,
        (ns.available_hours::DECIMAL / 40) * 5 * weight_availability as availability_score,
        ns.project_history * weight_project_history as project_history_score,
        ns.overall_score * weight_overall_score as overall_score,
        
        ns.available_hours,
        ns.meets_qualifications
        
    FROM nomade_scores ns
    WHERE ns.task_specific_rating >= min_task_rating
    AND ns.meets_qualifications = true
    ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE task_templates IS 'Modelos de tarefas com configurações de distribuição e precificação';
COMMENT ON TABLE task_template_stats IS 'Estatísticas computadas dos modelos de tarefas';
COMMENT ON TABLE task_executions IS 'Execuções de tarefas baseadas em modelos';
COMMENT ON TABLE task_deliverables IS 'Entregáveis das execuções de tarefas';
COMMENT ON TABLE task_revisions IS 'Solicitações de revisão das tarefas';
COMMENT ON TABLE task_distribution_attempts IS 'Tentativas de distribuição de tarefas para nômades';
COMMENT ON TABLE qualification_tests IS 'Testes de habilitação para modelos de tarefas';
COMMENT ON TABLE test_submissions IS 'Submissões dos testes de habilitação';
COMMENT ON TABLE task_chain_executions IS 'Execuções de cadeias de tarefas complexas';

COMMENT ON FUNCTION calculate_task_template_stats IS 'Calcula estatísticas de performance dos modelos de tarefas';
COMMENT ON FUNCTION rank_nomades_for_task IS 'Ranqueia nômades para distribuição de tarefas baseado em critérios configuráveis';
