-- Tactical Plan and Project History Schema
-- Comprehensive system for AI-powered project planning and historical analysis

-- Tactical Plans table
CREATE TABLE IF NOT EXISTS tactical_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    total_estimated_hours INTEGER NOT NULL DEFAULT 0,
    total_estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    timeline_days INTEGER NOT NULL DEFAULT 0,
    complexity_score INTEGER NOT NULL DEFAULT 0 CHECK (complexity_score >= 0 AND complexity_score <= 100),
    optimal_team_size INTEGER NOT NULL DEFAULT 1,
    risk_factors TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'needs_review')),
    chat_context JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tactical Plan Tasks table
CREATE TABLE IF NOT EXISTS tactical_plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES tactical_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    estimated_hours INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    dependencies UUID[] DEFAULT '{}',
    deliverables TEXT[] DEFAULT '{}',
    requirements JSONB DEFAULT '{}',
    suggested_nomad_profile VARCHAR(255),
    ai_generated BOOLEAN DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'needs_review')),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Events table for comprehensive history tracking
CREATE TABLE IF NOT EXISTS project_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'task_created', 'task_completed', 'task_rejected', 'task_paused', 'task_resumed',
        'file_uploaded', 'file_deleted', 'comment_added', 'status_changed',
        'payment_made', 'budget_updated', 'deadline_changed', 'team_member_added',
        'team_member_removed', 'ai_insight', 'tactical_plan_created', 'tactical_plan_approved'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255),
    task_id UUID,
    task_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Insights table for pattern recognition and recommendations
CREATE TABLE IF NOT EXISTS project_ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('pattern', 'recommendation', 'risk_alert', 'success_factor')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    related_events UUID[] DEFAULT '{}',
    actionable BOOLEAN DEFAULT false,
    applied BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Analytics table for performance tracking
CREATE TABLE IF NOT EXISTS project_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_events INTEGER NOT NULL DEFAULT 0,
    task_success_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    average_completion_time DECIMAL(8,2) NOT NULL DEFAULT 0,
    most_common_rejection_reasons TEXT[] DEFAULT '{}',
    nomad_performance_data JSONB DEFAULT '{}',
    timeline_insights JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shopping Cart table for restructured shopping system
CREATE TABLE IF NOT EXISTS shopping_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checkout', 'completed', 'abandoned')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Preferences table for product preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_type VARCHAR(50) NOT NULL CHECK (preference_type IN ('product', 'nomad', 'category', 'budget', 'timeline')),
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_type, preference_key)
);

-- Project Purchase History table
CREATE TABLE IF NOT EXISTS project_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    purchase_type VARCHAR(50) NOT NULL CHECK (purchase_type IN ('product', 'service', 'addon', 'upgrade')),
    item_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    payment_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_tactical_plans_project_id ON tactical_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_tactical_plans_status ON tactical_plans(status);
CREATE INDEX IF NOT EXISTS idx_tactical_plan_tasks_plan_id ON tactical_plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_tactical_plan_tasks_order ON tactical_plan_tasks(order_index);

CREATE INDEX IF NOT EXISTS idx_project_events_project_id ON project_events(project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_type ON project_events(event_type);
CREATE INDEX IF NOT EXISTS idx_project_events_created_at ON project_events(created_at);
CREATE INDEX IF NOT EXISTS idx_project_events_user_id ON project_events(user_id);

CREATE INDEX IF NOT EXISTS idx_project_ai_insights_project_id ON project_ai_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ai_insights_type ON project_ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_project_ai_insights_actionable ON project_ai_insights(actionable);

CREATE INDEX IF NOT EXISTS idx_project_analytics_project_id ON project_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_analytics_period ON project_analytics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_project_id ON shopping_carts(project_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_status ON shopping_carts(status);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(preference_type);

CREATE INDEX IF NOT EXISTS idx_project_purchases_project_id ON project_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_purchases_user_id ON project_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_project_purchases_status ON project_purchases(payment_status);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_tactical_plans_updated_at BEFORE UPDATE ON tactical_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tactical_plan_tasks_updated_at BEFORE UPDATE ON tactical_plan_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_ai_insights_updated_at BEFORE UPDATE ON project_ai_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_analytics_updated_at BEFORE UPDATE ON project_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_carts_updated_at BEFORE UPDATE ON shopping_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_purchases_updated_at BEFORE UPDATE ON project_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically generate AI insights based on project events
CREATE OR REPLACE FUNCTION generate_ai_insights_from_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate insights for rejection patterns
    IF NEW.event_type = 'task_rejected' THEN
        -- Check if this creates a pattern (3+ rejections with similar reasons)
        INSERT INTO project_ai_insights (project_id, insight_type, title, description, confidence_score, related_events, actionable)
        SELECT 
            NEW.project_id,
            'pattern',
            'Padrão de Rejeições Identificado',
            'Múltiplas rejeições com motivos similares detectadas. Recomenda-se revisar o briefing.',
            85,
            ARRAY[NEW.id],
            true
        WHERE (
            SELECT COUNT(*) 
            FROM project_events 
            WHERE project_id = NEW.project_id 
            AND event_type = 'task_rejected' 
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ) >= 3;
    END IF;
    
    -- Generate success factor insights
    IF NEW.event_type = 'task_completed' THEN
        INSERT INTO project_ai_insights (project_id, insight_type, title, description, confidence_score, related_events, actionable)
        SELECT 
            NEW.project_id,
            'success_factor',
            'Fator de Sucesso Identificado',
            'Tarefa concluída com sucesso. Padrões identificados podem ser replicados.',
            75,
            ARRAY[NEW.id],
            false
        WHERE (
            SELECT COUNT(*) 
            FROM project_events 
            WHERE project_id = NEW.project_id 
            AND event_type = 'task_completed' 
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ) = 1; -- Only for the first completion to avoid spam
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate AI insights
CREATE TRIGGER trigger_generate_ai_insights 
    AFTER INSERT ON project_events 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_ai_insights_from_events();

-- Function to calculate project analytics
CREATE OR REPLACE FUNCTION calculate_project_analytics(project_uuid UUID, start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_events INTEGER;
    success_rate DECIMAL(5,2);
    avg_completion_time DECIMAL(8,2);
BEGIN
    -- Calculate total events
    SELECT COUNT(*) INTO total_events
    FROM project_events
    WHERE project_id = project_uuid
    AND created_at BETWEEN start_date AND end_date;
    
    -- Calculate success rate
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE (COUNT(*) FILTER (WHERE event_type = 'task_completed') * 100.0 / COUNT(*))
        END INTO success_rate
    FROM project_events
    WHERE project_id = project_uuid
    AND event_type IN ('task_completed', 'task_rejected')
    AND created_at BETWEEN start_date AND end_date;
    
    -- Calculate average completion time (mock calculation)
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) / 3600), 0)
    INTO avg_completion_time
    FROM project_events
    WHERE project_id = project_uuid
    AND event_type = 'task_completed'
    AND created_at BETWEEN start_date AND end_date;
    
    result := jsonb_build_object(
        'total_events', total_events,
        'task_success_rate', COALESCE(success_rate, 0),
        'average_completion_time', COALESCE(avg_completion_time, 0)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
