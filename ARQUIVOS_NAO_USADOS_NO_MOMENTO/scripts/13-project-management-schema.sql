-- Project Management Module Schema
-- Enhanced project creation with AI integration and cloning capabilities

-- Add new columns to projects table for enhanced project management
ALTER TABLE projects ADD COLUMN IF NOT EXISTS goals TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_created BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cloned_from_id INTEGER REFERENCES projects(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS clone_count INTEGER DEFAULT 0;

-- Project AI Chat History
CREATE TABLE IF NOT EXISTS project_ai_chats (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    session_id UUID DEFAULT gen_random_uuid(),
    messages JSONB NOT NULL,
    project_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Product Associations (for AI suggestions and manual selection)
CREATE TABLE IF NOT EXISTS project_products (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_price DECIMAL(10,2),
    suggested_by_ai BOOLEAN DEFAULT FALSE,
    selected BOOLEAN DEFAULT FALSE,
    reason TEXT,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Clone History
CREATE TABLE IF NOT EXISTS project_clones (
    id SERIAL PRIMARY KEY,
    source_project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    cloned_project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    clone_options JSONB NOT NULL, -- includes what was cloned (tasks, team, budget, etc.)
    cloned_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Templates (for recurring project patterns)
CREATE TABLE IF NOT EXISTS project_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL, -- project structure, tasks, etc.
    category TEXT,
    tags TEXT[],
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Suggestions Cache (to avoid regenerating same suggestions)
CREATE TABLE IF NOT EXISTS ai_suggestions_cache (
    id SERIAL PRIMARY KEY,
    input_hash TEXT UNIQUE NOT NULL, -- hash of input parameters
    suggestions JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_ai_chats_project_id ON project_ai_chats(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ai_chats_session_id ON project_ai_chats(session_id);
CREATE INDEX IF NOT EXISTS idx_project_products_project_id ON project_products(project_id);
CREATE INDEX IF NOT EXISTS idx_project_products_selected ON project_products(selected);
CREATE INDEX IF NOT EXISTS idx_project_clones_source_id ON project_clones(source_project_id);
CREATE INDEX IF NOT EXISTS idx_project_clones_cloned_id ON project_clones(cloned_project_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_public ON project_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_cache_expires ON ai_suggestions_cache(expires_at);

-- Functions for project management

-- Function to update clone count when a project is cloned
CREATE OR REPLACE FUNCTION update_project_clone_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects 
    SET clone_count = clone_count + 1 
    WHERE id = NEW.source_project_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update clone count
DROP TRIGGER IF EXISTS trigger_update_clone_count ON project_clones;
CREATE TRIGGER trigger_update_clone_count
    AFTER INSERT ON project_clones
    FOR EACH ROW
    EXECUTE FUNCTION update_project_clone_count();

-- Function to clean expired AI suggestions cache
CREATE OR REPLACE FUNCTION clean_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_suggestions_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get project statistics for AI insights
CREATE OR REPLACE FUNCTION get_project_ai_stats(project_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_messages', COUNT(*),
        'sessions', COUNT(DISTINCT session_id),
        'avg_messages_per_session', ROUND(COUNT(*)::DECIMAL / NULLIF(COUNT(DISTINCT session_id), 0), 2),
        'products_suggested', (
            SELECT COUNT(*) 
            FROM project_products pp 
            WHERE pp.project_id = p.id AND pp.suggested_by_ai = true
        ),
        'products_selected', (
            SELECT COUNT(*) 
            FROM project_products pp 
            WHERE pp.project_id = p.id AND pp.selected = true
        ),
        'ai_confidence_avg', (
            SELECT ROUND(AVG(confidence_score), 2)
            FROM project_products pp 
            WHERE pp.project_id = p.id AND pp.confidence_score IS NOT NULL
        )
    ) INTO result
    FROM project_ai_chats pac
    JOIN projects p ON p.id = pac.project_id
    WHERE p.id = (SELECT id FROM projects WHERE id::text = project_uuid::text)
    GROUP BY p.id;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to get popular project templates
CREATE OR REPLACE FUNCTION get_popular_project_templates(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    template_id INTEGER,
    template_name TEXT,
    template_description TEXT,
    category TEXT,
    usage_count INTEGER,
    created_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id,
        pt.name,
        pt.description,
        pt.category,
        pt.usage_count,
        u.name
    FROM project_templates pt
    LEFT JOIN users u ON u.id = pt.created_by
    WHERE pt.is_public = true
    ORDER BY pt.usage_count DESC, pt.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update triggers for updated_at columns
CREATE TRIGGER update_project_ai_chats_updated_at BEFORE UPDATE ON project_ai_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_templates_updated_at BEFORE UPDATE ON project_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample project templates
INSERT INTO project_templates (name, description, template_data, category, tags, is_public, created_by) VALUES
('E-commerce Básico', 'Template para loja virtual simples', '{"tasks": ["Setup inicial", "Design da loja", "Integração de pagamento", "Testes"], "estimated_duration": "30 days", "complexity": "intermediate"}', 'E-commerce', ARRAY['loja', 'vendas', 'online'], true, 1),
('Landing Page Conversão', 'Template para páginas de alta conversão', '{"tasks": ["Pesquisa de mercado", "Design responsivo", "Copywriting", "Otimização SEO"], "estimated_duration": "15 days", "complexity": "basic"}', 'Marketing', ARRAY['landing', 'conversão', 'marketing'], true, 1),
('Sistema Interno', 'Template para sistemas de gestão interna', '{"tasks": ["Análise de requisitos", "Arquitetura do sistema", "Desenvolvimento", "Treinamento"], "estimated_duration": "60 days", "complexity": "advanced"}', 'Sistema', ARRAY['gestão', 'interno', 'dashboard'], true, 1)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE project_ai_chats IS 'Stores AI chat history for project creation sessions';
COMMENT ON TABLE project_products IS 'Associates products with projects, tracking AI suggestions and user selections';
COMMENT ON TABLE project_clones IS 'Tracks project cloning history and options used';
COMMENT ON TABLE project_templates IS 'Reusable project templates for common project types';
COMMENT ON TABLE ai_suggestions_cache IS 'Caches AI suggestions to improve performance';
