-- Enhanced task execution schema for qualification integration

-- Add qualification-specific columns to task_executions
ALTER TABLE task_executions ADD COLUMN IF NOT EXISTS task_type VARCHAR(30) DEFAULT 'regular' CHECK (task_type IN ('regular', 'qualification_test', 'learning_circuit'));
ALTER TABLE task_executions ADD COLUMN IF NOT EXISTS is_qualification_test BOOLEAN DEFAULT FALSE;
ALTER TABLE task_executions ADD COLUMN IF NOT EXISTS qualification_category VARCHAR(100);
ALTER TABLE task_executions ADD COLUMN IF NOT EXISTS learning_circuit JSONB DEFAULT '[]';
ALTER TABLE task_executions ADD COLUMN IF NOT EXISTS qualification_checklist JSONB DEFAULT '[]';

-- Learning circuit steps tracking
CREATE TABLE IF NOT EXISTS learning_circuit_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    nomad_id UUID NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    step_type VARCHAR(30) NOT NULL CHECK (step_type IN ('text', 'video', 'document', 'commitment_term')),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(task_id, nomad_id, step_id)
);

-- Qualification test submissions
CREATE TABLE IF NOT EXISTS qualification_test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    nomad_id UUID NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deliverables JSONB DEFAULT '[]',
    nomad_notes TEXT,
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'needs_adjustment')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leader qualification reviews
CREATE TABLE IF NOT EXISTS leader_qualification_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES qualification_test_submissions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    leader_id UUID NOT NULL,
    leader_name VARCHAR(255) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decision VARCHAR(30) NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_adjustment')),
    overall_score INTEGER DEFAULT 0,
    checklist_results JSONB DEFAULT '{}',
    feedback TEXT NOT NULL,
    improvement_suggestions TEXT,
    contact_made BOOLEAN DEFAULT FALSE,
    contact_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question bank for dynamic questionnaires
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('text', 'textarea', 'select', 'multiselect', 'file', 'date', 'number')),
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    options JSONB DEFAULT '[]', -- For select/multiselect types
    required BOOLEAN DEFAULT FALSE,
    ai_fillable BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Dynamic questionnaire templates
CREATE TABLE IF NOT EXISTS dynamic_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_template_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    questions UUID[] DEFAULT '{}', -- Array of question_bank IDs
    conditional_logic JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Questionnaire responses with AI integration
CREATE TABLE IF NOT EXISTS questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES task_executions(id) ON DELETE CASCADE,
    questionnaire_id UUID REFERENCES dynamic_questionnaires(id),
    responses JSONB DEFAULT '{}', -- question_id -> response mapping
    ai_completion_percentage INTEGER DEFAULT 0,
    ai_filled_fields JSONB DEFAULT '{}',
    requires_review BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_executions_qualification ON task_executions(is_qualification_test, qualification_category);
CREATE INDEX IF NOT EXISTS idx_learning_circuit_progress_task_nomad ON learning_circuit_progress(task_id, nomad_id);
CREATE INDEX IF NOT EXISTS idx_qualification_submissions_nomad ON qualification_test_submissions(nomad_id, status);
CREATE INDEX IF NOT EXISTS idx_leader_reviews_leader ON leader_qualification_reviews(leader_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category, is_active);
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_task ON questionnaire_responses(task_id);

-- Triggers for updated_at
CREATE TRIGGER update_learning_circuit_progress_updated_at BEFORE UPDATE ON learning_circuit_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qualification_test_submissions_updated_at BEFORE UPDATE ON qualification_test_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leader_qualification_reviews_updated_at BEFORE UPDATE ON leader_qualification_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dynamic_questionnaires_updated_at BEFORE UPDATE ON dynamic_questionnaires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questionnaire_responses_updated_at BEFORE UPDATE ON questionnaire_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for qualification management
CREATE OR REPLACE FUNCTION get_qualification_stats(category_filter VARCHAR DEFAULT NULL)
RETURNS TABLE (
    category VARCHAR,
    total_tests INTEGER,
    pending_reviews INTEGER,
    approval_rate DECIMAL,
    avg_completion_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.qualification_category::VARCHAR,
        COUNT(*)::INTEGER as total_tests,
        COUNT(CASE WHEN qts.status = 'under_review' THEN 1 END)::INTEGER as pending_reviews,
        ROUND(
            COUNT(CASE WHEN lqr.decision = 'approved' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(lqr.decision), 0) * 100, 2
        ) as approval_rate,
        AVG(qts.submitted_at - te.started_at) as avg_completion_time
    FROM task_executions te
    LEFT JOIN qualification_test_submissions qts ON te.id = qts.task_id
    LEFT JOIN leader_qualification_reviews lqr ON qts.id = lqr.submission_id
    WHERE te.is_qualification_test = TRUE
    AND (category_filter IS NULL OR te.qualification_category = category_filter)
    GROUP BY te.qualification_category;
END;
$$ LANGUAGE plpgsql;

-- Function to update question usage count
CREATE OR REPLACE FUNCTION increment_question_usage(question_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE question_bank 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = question_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE learning_circuit_progress IS 'Progresso individual dos nômades no circuito de aprendizado';
COMMENT ON TABLE qualification_test_submissions IS 'Submissões de testes de qualificação pelos nômades';
COMMENT ON TABLE leader_qualification_reviews IS 'Avaliações dos líderes sobre testes de qualificação';
COMMENT ON TABLE question_bank IS 'Banco de perguntas reutilizáveis para questionários dinâmicos';
COMMENT ON TABLE dynamic_questionnaires IS 'Templates de questionários com lógica condicional';
COMMENT ON TABLE questionnaire_responses IS 'Respostas de questionários com preenchimento por IA';
