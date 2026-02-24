-- Extended User Accounts Schema for Allka MVP
-- Adds company profiles, permissions, and AI knowledge base

-- Companies table - Extended company management
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    document VARCHAR(50) UNIQUE NOT NULL,
    account_type VARCHAR(20) DEFAULT 'dependent', -- dependent, independent
    agency_id INTEGER REFERENCES agencies(id),
    is_active BOOLEAN DEFAULT true,
    last_project_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agencies table - Partner agencies
CREATE TABLE agencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    document VARCHAR(50) UNIQUE NOT NULL,
    partner_level VARCHAR(20) DEFAULT 'basic', -- basic, premium, elite
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update users table with extended fields
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'empresas';
ALTER TABLE users ADD COLUMN account_sub_type VARCHAR(20);
ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id);
ALTER TABLE users ADD COLUMN agency_id INTEGER REFERENCES agencies(id);
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'company_user';
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- User permissions table
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id)
);

-- AI Knowledge Base table
CREATE TABLE ai_knowledge_base (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    summary TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_generated BOOLEAN DEFAULT true
);

-- Briefing History table
CREATE TABLE briefing_history (
    id SERIAL PRIMARY KEY,
    knowledge_base_id INTEGER REFERENCES ai_knowledge_base(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    brief_summary TEXT,
    key_requirements JSONB,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracting Patterns table
CREATE TABLE contracting_patterns (
    id SERIAL PRIMARY KEY,
    knowledge_base_id INTEGER REFERENCES ai_knowledge_base(id) ON DELETE CASCADE,
    service_type VARCHAR(255) NOT NULL,
    frequency INTEGER DEFAULT 1,
    average_budget DECIMAL(10,2),
    preferred_timeline VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guidelines table
CREATE TABLE guidelines (
    id SERIAL PRIMARY KEY,
    knowledge_base_id INTEGER REFERENCES ai_knowledge_base(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    importance VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update projects table to reference companies
ALTER TABLE projects ADD COLUMN company_id INTEGER REFERENCES companies(id);

-- Create indexes for performance
CREATE INDEX idx_companies_agency_id ON companies(agency_id);
CREATE INDEX idx_companies_account_type ON companies(account_type);
CREATE INDEX idx_companies_is_active ON companies(is_active);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_agency_id ON users(agency_id);
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_ai_knowledge_base_company_id ON ai_knowledge_base(company_id);
CREATE INDEX idx_briefing_history_knowledge_base_id ON briefing_history(knowledge_base_id);
CREATE INDEX idx_contracting_patterns_knowledge_base_id ON contracting_patterns(knowledge_base_id);
CREATE INDEX idx_guidelines_knowledge_base_id ON guidelines(knowledge_base_id);
CREATE INDEX idx_projects_company_id ON projects(company_id);

-- Function to automatically update last_project_date
CREATE OR REPLACE FUNCTION update_company_last_project_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        UPDATE companies 
        SET last_project_date = CURRENT_DATE,
            is_active = true
        WHERE id = NEW.company_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update company status based on projects
CREATE TRIGGER trigger_update_company_last_project_date
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_company_last_project_date();

-- Function to check and deactivate inactive companies
CREATE OR REPLACE FUNCTION deactivate_inactive_companies()
RETURNS void AS $$
BEGIN
    UPDATE companies 
    SET is_active = false
    WHERE is_active = true 
    AND (last_project_date IS NULL OR last_project_date < CURRENT_DATE - INTERVAL '90 days');
END;
$$ LANGUAGE plpgsql;
