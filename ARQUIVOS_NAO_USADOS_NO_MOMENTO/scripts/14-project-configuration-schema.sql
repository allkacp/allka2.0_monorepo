-- Project Configuration Schema
-- Extends the project management system with robust configuration options

-- Project configurations table
CREATE TABLE IF NOT EXISTS project_configurations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Identification
    responsible_users INTEGER[] DEFAULT '{}',
    
    -- Files and Documents
    auto_save_attachments BOOLEAN DEFAULT FALSE,
    file_categories TEXT[] DEFAULT '{"Documentos","Imagens","Contratos","Relatórios"}',
    
    -- Vault (Encrypted Storage)
    vault_enabled BOOLEAN DEFAULT FALSE,
    
    -- Payment Modalities
    payment_mode VARCHAR(20) DEFAULT 'SQUAD' CHECK (payment_mode IN ('SQUAD', 'POST_PAID', 'EXTERNAL', 'INTERNAL')),
    payment_config JSONB DEFAULT '{}',
    
    -- Automations
    auto_task_distribution BOOLEAN DEFAULT FALSE,
    auto_approval_on_timeout BOOLEAN DEFAULT FALSE,
    auto_approval_timeout_hours INTEGER DEFAULT 48,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id)
);

-- Project vault items table (encrypted storage)
CREATE TABLE IF NOT EXISTS project_vault_items (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('password', 'api_key', 'certificate', 'note')),
    encrypted_content TEXT NOT NULL, -- AES encrypted content
    metadata JSONB DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vault permissions table
CREATE TABLE IF NOT EXISTS project_vault_permissions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('read', 'write', 'admin')),
    granted_by INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, user_id)
);

-- Project files table (centralized file management)
CREATE TABLE IF NOT EXISTS project_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL, -- Stored filename
    original_name VARCHAR(255) NOT NULL, -- Original filename
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'task_attachment', 'ai_generated')),
    source_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project automation rules table
CREATE TABLE IF NOT EXISTS project_automation_rules (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('task_distribution', 'approval_timeout', 'notification')),
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_configurations_project_id ON project_configurations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vault_items_project_id ON project_vault_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vault_permissions_project_id ON project_vault_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vault_permissions_user_id ON project_vault_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_category ON project_files(category);
CREATE INDEX IF NOT EXISTS idx_project_automation_rules_project_id ON project_automation_rules(project_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_configurations_updated_at 
    BEFORE UPDATE ON project_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_vault_items_updated_at 
    BEFORE UPDATE ON project_vault_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_automation_rules_updated_at 
    BEFORE UPDATE ON project_automation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configurations for existing projects
INSERT INTO project_configurations (project_id)
SELECT id FROM projects 
WHERE id NOT IN (SELECT project_id FROM project_configurations WHERE project_id IS NOT NULL)
ON CONFLICT (project_id) DO NOTHING;
