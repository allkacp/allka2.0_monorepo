-- Permissions and Admin Profiles Management Schema
-- This script creates the complete permissions system for granular access control

-- Admin profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_master BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table (extends the existing users table)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Permission modules table
CREATE TABLE IF NOT EXISTS permission_modules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permission resources table
CREATE TABLE IF NOT EXISTS permission_resources (
    id VARCHAR(50) PRIMARY KEY,
    module_id VARCHAR(50) REFERENCES permission_modules(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    available_actions JSONB NOT NULL DEFAULT '[]',
    conditions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES admin_profiles(id) ON DELETE CASCADE,
    module_id VARCHAR(50) REFERENCES permission_modules(id) ON DELETE CASCADE,
    resource_id VARCHAR(50) REFERENCES permission_resources(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'edit', 'create', 'delete', 'not_applicable')),
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, resource_id, action)
);

-- Permission audit log
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_profile_id ON admin_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_permission_resources_module_id ON permission_resources(module_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_profile_id ON admin_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_module_id ON admin_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_resource_id ON admin_permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_admin_user_id ON permission_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_created_at ON permission_audit_log(created_at);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_permissions_updated_at BEFORE UPDATE ON admin_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default permission modules
INSERT INTO permission_modules (id, name, description, category) VALUES
('clients', 'Clientes', 'Gestão de empresas e contas de clientes', 'user_management'),
('users', 'Usuários', 'Gestão de usuários do sistema', 'user_management'),
('nomads', 'Nômades', 'Gestão de profissionais freelancers', 'user_management'),
('administrators', 'Administradores', 'Gestão de usuários administrativos', 'admin_management'),
('leads', 'Leads', 'Gestão de leads e oportunidades', 'sales_marketing'),
('projects', 'Projetos', 'Gestão de projetos e contratos', 'operations'),
('financial', 'Financeiro', 'Gestão financeira e pagamentos', 'financial'),
('reports', 'Relatórios', 'Relatórios e análises', 'analytics'),
('settings', 'Configurações', 'Configurações da plataforma', 'system'),
('notifications', 'Notificações', 'Sistema de notificações', 'communication'),
('terms', 'Termos', 'Gestão de termos e políticas', 'legal'),
('allkademy', 'Allkademy', 'Plataforma de educação', 'education')
ON CONFLICT (id) DO NOTHING;

-- Insert default permission resources
INSERT INTO permission_resources (id, module_id, name, description, available_actions) VALUES
-- Clients module
('client_registration', 'clients', 'Cadastro de Clientes', 'Criar e gerenciar cadastros de empresas', '["view", "edit", "create", "delete"]'),
('client_projects', 'clients', 'Projetos de Clientes', 'Gerenciar projetos e contratos', '["view", "edit", "create", "delete"]'),
('client_account_data', 'clients', 'Dados da Conta', 'Informações financeiras e configurações', '["view", "edit"]'),

-- Users module
('user_registration', 'users', 'Cadastro de Usuários', 'Criar novos usuários no sistema', '["view", "edit", "create", "delete"]'),
('user_deactivation', 'users', 'Inativação de Usuários', 'Desativar ou suspender contas', '["view", "edit"]'),
('user_data_editing', 'users', 'Edição de Dados', 'Modificar informações de usuários', '["view", "edit"]'),

-- Nomads module
('nomad_registration', 'nomads', 'Cadastro de Nômades', 'Registrar novos profissionais', '["view", "edit", "create", "delete"]'),
('nomad_performance', 'nomads', 'Gestão de Performance', 'Avaliar e monitorar desempenho', '["view", "edit"]'),
('nomad_qualifications', 'nomads', 'Habilitações', 'Gerenciar certificações e habilidades', '["view", "edit", "create", "delete"]'),
('nomad_data_editing', 'nomads', 'Edição de Dados', 'Modificar informações de nômades', '["view", "edit"]'),

-- Administrators module
('admin_registration', 'administrators', 'Cadastro de Administradores', 'Criar novos usuários administrativos', '["view", "edit", "create", "delete"]'),
('permission_management', 'administrators', 'Gestão de Permissões', 'Configurar perfis e permissões', '["view", "edit", "create", "delete"]'),
('profile_editing', 'administrators', 'Edição de Perfis', 'Modificar perfis administrativos', '["view", "edit"]'),

-- Leads module
('lead_management', 'leads', 'Gestão de Leads', 'Gerenciar leads e oportunidades', '["view", "edit", "create", "delete"]', '[{"type": "own_only", "value": "Apenas seus próprios leads"}, {"type": "all", "value": "Todos os leads da plataforma"}]'),

-- Projects module
('project_management', 'projects', 'Gestão de Projetos', 'Criar e gerenciar projetos', '["view", "edit", "create", "delete"]'),
('project_approval', 'projects', 'Aprovação de Projetos', 'Aprovar entregas e marcos', '["view", "edit"]'),

-- Financial module
('financial_reports', 'financial', 'Relatórios Financeiros', 'Visualizar receitas e despesas', '["view"]'),
('payment_management', 'financial', 'Gestão de Pagamentos', 'Processar pagamentos e reembolsos', '["view", "edit", "create"]'),
('wallet_adjustments', 'financial', 'Ajustes de Carteira', 'Ajustar saldos de usuários', '["view", "edit", "create"]'),

-- Reports module
('analytics_reports', 'reports', 'Relatórios de Analytics', 'Visualizar métricas e KPIs', '["view"]'),
('custom_reports', 'reports', 'Relatórios Personalizados', 'Criar relatórios customizados', '["view", "create", "edit", "delete"]'),

-- Settings module
('system_settings', 'settings', 'Configurações do Sistema', 'Configurar parâmetros globais', '["view", "edit"]'),
('integration_settings', 'settings', 'Configurações de Integração', 'Gerenciar integrações externas', '["view", "edit"]'),

-- Notifications module
('notification_templates', 'notifications', 'Templates de Notificação', 'Criar e editar templates', '["view", "edit", "create", "delete"]'),
('notification_campaigns', 'notifications', 'Campanhas de Notificação', 'Gerenciar campanhas de comunicação', '["view", "edit", "create", "delete"]'),

-- Terms module
('terms_management', 'terms', 'Gestão de Termos', 'Criar e gerenciar termos legais', '["view", "edit", "create", "delete"]'),
('terms_acceptance', 'terms', 'Aceites de Termos', 'Visualizar histórico de aceites', '["view"]'),

-- Allkademy module
('course_management', 'allkademy', 'Gestão de Cursos', 'Criar e gerenciar cursos', '["view", "edit", "create", "delete"]'),
('student_progress', 'allkademy', 'Progresso dos Alunos', 'Acompanhar progresso educacional', '["view"]')

ON CONFLICT (id) DO NOTHING;

-- Insert default admin profiles
INSERT INTO admin_profiles (id, name, description, is_master) VALUES
('master-admin', 'Master Admin', 'Controle total da plataforma com todas as permissões', true),
('financial-admin', 'Gestão Financeira', 'Acesso a relatórios financeiros, pagamentos e receitas', false),
('commercial-admin', 'Comercial', 'Gestão de clientes, leads e campanhas de marketing', false),
('operational-admin', 'Gestão Operacional', 'Projetos, nômades, qualidade e operações diárias', false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample permissions for non-master profiles
-- Financial Admin permissions
INSERT INTO admin_permissions (profile_id, module_id, resource_id, action) VALUES
('financial-admin', 'financial', 'financial_reports', 'view'),
('financial-admin', 'financial', 'payment_management', 'view'),
('financial-admin', 'financial', 'payment_management', 'edit'),
('financial-admin', 'financial', 'wallet_adjustments', 'view'),
('financial-admin', 'financial', 'wallet_adjustments', 'edit'),
('financial-admin', 'financial', 'wallet_adjustments', 'create'),
('financial-admin', 'reports', 'analytics_reports', 'view'),
('financial-admin', 'clients', 'client_account_data', 'view')
ON CONFLICT (profile_id, resource_id, action) DO NOTHING;

-- Commercial Admin permissions
INSERT INTO admin_permissions (profile_id, module_id, resource_id, action) VALUES
('commercial-admin', 'clients', 'client_registration', 'view'),
('commercial-admin', 'clients', 'client_registration', 'edit'),
('commercial-admin', 'clients', 'client_registration', 'create'),
('commercial-admin', 'clients', 'client_projects', 'view'),
('commercial-admin', 'clients', 'client_projects', 'edit'),
('commercial-admin', 'leads', 'lead_management', 'view'),
('commercial-admin', 'leads', 'lead_management', 'edit'),
('commercial-admin', 'leads', 'lead_management', 'create'),
('commercial-admin', 'leads', 'lead_management', 'delete'),
('commercial-admin', 'reports', 'analytics_reports', 'view'),
('commercial-admin', 'notifications', 'notification_campaigns', 'view'),
('commercial-admin', 'notifications', 'notification_campaigns', 'create')
ON CONFLICT (profile_id, resource_id, action) DO NOTHING;

-- Operational Admin permissions
INSERT INTO admin_permissions (profile_id, module_id, resource_id, action) VALUES
('operational-admin', 'projects', 'project_management', 'view'),
('operational-admin', 'projects', 'project_management', 'edit'),
('operational-admin', 'projects', 'project_approval', 'view'),
('operational-admin', 'projects', 'project_approval', 'edit'),
('operational-admin', 'nomads', 'nomad_registration', 'view'),
('operational-admin', 'nomads', 'nomad_registration', 'edit'),
('operational-admin', 'nomads', 'nomad_performance', 'view'),
('operational-admin', 'nomads', 'nomad_performance', 'edit'),
('operational-admin', 'nomads', 'nomad_qualifications', 'view'),
('operational-admin', 'nomads', 'nomad_qualifications', 'edit'),
('operational-admin', 'nomads', 'nomad_qualifications', 'create'),
('operational-admin', 'users', 'user_registration', 'view'),
('operational-admin', 'users', 'user_data_editing', 'view'),
('operational-admin', 'users', 'user_data_editing', 'edit'),
('operational-admin', 'reports', 'analytics_reports', 'view')
ON CONFLICT (profile_id, resource_id, action) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE admin_profiles IS 'Perfis administrativos com diferentes níveis de acesso';
COMMENT ON TABLE admin_users IS 'Usuários administrativos vinculados a perfis específicos';
COMMENT ON TABLE permission_modules IS 'Módulos do sistema com permissões configuráveis';
COMMENT ON TABLE permission_resources IS 'Recursos específicos dentro de cada módulo';
COMMENT ON TABLE admin_permissions IS 'Permissões específicas por perfil e recurso';
COMMENT ON TABLE permission_audit_log IS 'Log de auditoria de ações administrativas';

-- Create a view for easy permission checking
CREATE OR REPLACE VIEW admin_user_permissions AS
SELECT 
    au.user_id,
    au.profile_id,
    ap.name as profile_name,
    ap.is_master,
    pm.id as module_id,
    pm.name as module_name,
    pr.id as resource_id,
    pr.name as resource_name,
    adp.action,
    adp.conditions
FROM admin_users au
JOIN admin_profiles ap ON au.profile_id = ap.id
LEFT JOIN admin_permissions adp ON ap.id = adp.profile_id
LEFT JOIN permission_modules pm ON adp.module_id = pm.id
LEFT JOIN permission_resources pr ON adp.resource_id = pr.id
WHERE au.is_active = true AND ap.is_active = true;

COMMENT ON VIEW admin_user_permissions IS 'View consolidada de permissões por usuário administrativo';
