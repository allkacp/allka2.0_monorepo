-- Dashboard and Reports Module Schema
-- This schema supports customizable dashboards and advanced reporting system

-- Dashboard widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('stats', 'chart', 'table', 'activity', 'progress', 'metric')),
    title VARCHAR(255) NOT NULL,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    position_width INTEGER NOT NULL DEFAULT 4,
    position_height INTEGER NOT NULL DEFAULT 2,
    config JSONB DEFAULT '{}',
    visible BOOLEAN DEFAULT true,
    account_types TEXT[] NOT NULL,
    account_levels TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard layouts table
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type VARCHAR(50) NOT NULL,
    account_level VARCHAR(50),
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_type, account_level)
);

-- Dashboard layout widgets junction table
CREATE TABLE IF NOT EXISTS dashboard_layout_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES dashboard_layouts(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    position_width INTEGER NOT NULL DEFAULT 4,
    position_height INTEGER NOT NULL DEFAULT 2,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(layout_id, widget_id)
);

-- Widget data cache table
CREATE TABLE IF NOT EXISTS widget_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    cache_duration INTEGER DEFAULT 300, -- 5 minutes default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Report templates table
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('performance', 'financial', 'operational', 'analytics')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('standard', 'custom')),
    columns JSONB NOT NULL DEFAULT '[]',
    filters JSONB NOT NULL DEFAULT '[]',
    charts JSONB NOT NULL DEFAULT '[]',
    export_formats TEXT[] DEFAULT ARRAY['excel'],
    access_levels TEXT[] NOT NULL,
    query_template TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report executions table
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    filters JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    data JSONB,
    charts_data JSONB,
    file_url TEXT,
    file_size BIGINT,
    row_count INTEGER,
    executed_by UUID REFERENCES users(id),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Report schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
    schedule_config JSONB NOT NULL, -- day of week, time, etc.
    filters JSONB DEFAULT '{}',
    recipients TEXT[] NOT NULL,
    active BOOLEAN DEFAULT true,
    last_execution TIMESTAMP WITH TIME ZONE,
    next_execution TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report sharing table
CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES report_executions(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES users(id),
    shared_with UUID REFERENCES users(id),
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('view', 'download')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard analytics table
CREATE TABLE IF NOT EXISTS dashboard_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    widget_id UUID REFERENCES dashboard_widgets(id),
    action VARCHAR(50) NOT NULL, -- view, click, resize, move
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report analytics table
CREATE TABLE IF NOT EXISTS report_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    template_id UUID REFERENCES report_templates(id),
    execution_id UUID REFERENCES report_executions(id),
    action VARCHAR(50) NOT NULL, -- execute, download, share, view
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_account_types ON dashboard_widgets USING GIN(account_types);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_visible ON dashboard_widgets(visible);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_account_type ON dashboard_layouts(account_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_default ON dashboard_layouts(is_default);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_expires ON widget_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_widget_data_cache_widget_id ON widget_data_cache(widget_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(type);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
CREATE INDEX IF NOT EXISTS idx_report_executions_executed_by ON report_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_report_executions_executed_at ON report_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_report_schedules_active ON report_schedules(active);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_execution ON report_schedules(next_execution);
CREATE INDEX IF NOT EXISTS idx_dashboard_analytics_user_id ON dashboard_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_analytics_created_at ON dashboard_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_report_analytics_user_id ON report_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_created_at ON report_analytics(created_at);

-- Triggers for updated_at
CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_layouts_updated_at BEFORE UPDATE ON dashboard_layouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_schedules_updated_at BEFORE UPDATE ON report_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default dashboard layouts
INSERT INTO dashboard_layouts (account_type, is_default, created_by) VALUES
('empresas', true, (SELECT id FROM users WHERE email = 'admin@allka.com' LIMIT 1)),
('agencias', true, (SELECT id FROM users WHERE email = 'admin@allka.com' LIMIT 1)),
('nomades', true, (SELECT id FROM users WHERE email = 'admin@allka.com' LIMIT 1)),
('admin', true, (SELECT id FROM users WHERE email = 'admin@allka.com' LIMIT 1))
ON CONFLICT (account_type, account_level) DO NOTHING;

-- Insert standard report templates
INSERT INTO report_templates (
    id, name, description, category, type, columns, filters, charts, export_formats, access_levels, created_by
) VALUES
(
    'agency_performance',
    'Relatório de Performance de Agências',
    'Análise detalhada da performance das agências parceiras',
    'performance',
    'standard',
    '[
        {"id": "agency_name", "name": "Agência", "field": "agency_name", "type": "text", "sortable": true, "filterable": true},
        {"id": "projects_count", "name": "Projetos", "field": "projects_count", "type": "number", "sortable": true, "filterable": false, "aggregation": "sum"},
        {"id": "revenue", "name": "Receita", "field": "revenue", "type": "currency", "sortable": true, "filterable": false, "aggregation": "sum"},
        {"id": "completion_rate", "name": "Taxa de Conclusão", "field": "completion_rate", "type": "percentage", "sortable": true, "filterable": false, "aggregation": "avg"}
    ]',
    '[
        {"id": "date_range", "name": "Período", "field": "date_range", "type": "date_range", "required": true},
        {"id": "agency_level", "name": "Nível da Agência", "field": "agency_level", "type": "select", "options": [{"value": "basic", "label": "Básico"}, {"value": "partner", "label": "Partner"}, {"value": "premium", "label": "Premium"}], "required": false}
    ]',
    '[
        {"id": "revenue_chart", "type": "bar", "title": "Receita por Agência", "x_axis": "agency_name", "y_axis": "revenue", "data_source": "main", "config": {}}
    ]',
    ARRAY['excel', 'pdf', 'csv'],
    ARRAY['admin', 'comercial'],
    (SELECT id FROM users WHERE email = 'admin@allka.com' LIMIT 1)
),
(
    'sales_billing',
    'Relatório de Vendas e Faturamento',
    'Análise de vendas, receitas e faturamento da plataforma',
    'financial',
    'standard',
    '[
        {"id": "period", "name": "Período", "field": "period", "type": "date", "sortable": true, "filterable": true},
        {"id": "total_sales", "name": "Vendas Totais", "field": "total_sales", "type": "currency", "sortable": true, "filterable": false, "aggregation": "sum"},
        {"id": "recurring_revenue", "name": "Receita Recorrente", "field": "recurring_revenue", "type": "currency", "sortable": true, "filterable": false, "aggregation": "sum"},
        {"id": "new_customers", "name": "Novos Clientes", "field": "new_customers", "type": "number", "sortable": true, "filterable": false, "aggregation": "sum"}
    ]',
    '[
        {"id": "date_range", "name": "Período", "field": "date_range", "type": "date_range", "required": true},
        {"id": "customer_type", "name": "Tipo de Cliente", "field": "customer_type", "type": "multiselect", "options": [{"value": "empresas", "label": "Empresas"}, {"value": "agencias", "label": "Agências"}], "required": false}
    ]',
    '[
        {"id": "sales_trend", "type": "line", "title": "Tendência de Vendas", "x_axis": "period", "y_axis": "total_sales", "data_source": "main", "config": {}}
    ]',
    ARRAY['excel', 'pdf'],
    ARRAY['admin', 'financeiro'],
    (SELECT id FROM users WHERE email = 'admin@allka.com' LIMIT 1)
),
(
    'leads_revenue',
    'Relatório de Leads e Receitas',
    'Análise de conversão de leads e impacto na receita',
    'analytics',
    'standard',
    '[
        {"id": "lead_source", "name": "Fonte do Lead", "field": "lead_source", "type": "text", "sortable": true, "filterable": true},
        {"id": "leads_count", "name": "Quantidade de Leads", "field": "leads_count", "type": "number", "sortable": true, "filterable": false, "aggregation": "sum"},
        {"id": "conversion_rate", "name": "Taxa de Conversão", "field": "conversion_rate", "type": "percentage", "sortable": true, "filterable": false, "aggregation": "avg"},
        {"id": "revenue_generated", "name": "Receita Gerada", "field": "revenue_generated", "type": "currency", "sortable": true, "filterable": false, "aggregation": "sum"}
    ]',
    '[
        {"id": "date_range", "name": "Período", "field": "date_range", "type": "date_range", "required": true},
        {"id": "lead_source", "name": "Fonte do Lead", "field": "lead_source", "type": "multiselect", "options": [{"value": "website", "label": "Website"}, {"value": "social", "label": "Redes Sociais"}, {"value": "referral", "label": "Indicação"}], "required": false}
    ]',
    '[
        {"id": "conversion_funnel", "type": "bar", "title": "Funil de Conversão", "x_axis": "lead_source", "y_axis": "conversion_rate", "data_source": "main", "config": {}}
    ]',
    ARRAY['excel', 'csv'],
    ARRAY['admin', 'comercial'],
    (SELECT id FROM users WHERE email = 'admin@allka.com' LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON TABLE dashboard_widgets IS 'Widgets configuráveis para dashboards personalizados';
COMMENT ON TABLE dashboard_layouts IS 'Layouts de dashboard por tipo de conta';
COMMENT ON TABLE dashboard_layout_widgets IS 'Associação entre layouts e widgets com posicionamento';
COMMENT ON TABLE widget_data_cache IS 'Cache de dados para widgets com TTL';
COMMENT ON TABLE report_templates IS 'Templates de relatórios padrão e personalizados';
COMMENT ON TABLE report_executions IS 'Histórico de execuções de relatórios';
COMMENT ON TABLE report_schedules IS 'Agendamento automático de relatórios';
COMMENT ON TABLE report_shares IS 'Compartilhamento de relatórios entre usuários';
COMMENT ON TABLE dashboard_analytics IS 'Analytics de uso dos dashboards';
COMMENT ON TABLE report_analytics IS 'Analytics de uso dos relatórios';
