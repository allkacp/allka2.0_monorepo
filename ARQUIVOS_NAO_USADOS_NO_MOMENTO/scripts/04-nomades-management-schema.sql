-- Nomades Management Module Schema
-- Extends existing user system with nomade-specific functionality

-- Nomades table (extends users)
CREATE TABLE IF NOT EXISTS nomades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    whatsapp VARCHAR(20) NOT NULL,
    level VARCHAR(20) DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'leader')),
    status VARCHAR(30) DEFAULT 'aguardando_aprovacao' CHECK (status IN ('ativo', 'inativo', 'aguardando_aprovacao', 'reprovado', 'pausado')),
    score DECIMAL(3,2) DEFAULT 0.00,
    tasks_completed_quarter INTEGER DEFAULT 0,
    tasks_completed_total INTEGER DEFAULT 0,
    areas_of_interest TEXT[], -- Array of strings
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_access TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    terms_accepted BOOLEAN DEFAULT FALSE,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    rejection_rate DECIMAL(5,2) DEFAULT 0.00,
    minimum_monthly_goal DECIMAL(10,2),
    leader_id UUID REFERENCES nomades(id),
    is_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nomade Qualifications
CREATE TABLE IF NOT EXISTS nomade_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomade_id UUID REFERENCES nomades(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    task VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'teste_pendente' CHECK (status IN ('habilitado', 'pausado', 'teste_pendente', 'reprovado')),
    certification_date TIMESTAMP,
    paused_date TIMESTAMP,
    test_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nomade Wallet
CREATE TABLE IF NOT EXISTS nomade_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomade_id UUID REFERENCES nomades(id) ON DELETE CASCADE,
    available_balance DECIMAL(10,2) DEFAULT 0.00,
    unavailable_balance DECIMAL(10,2) DEFAULT 0.00,
    bank_name VARCHAR(100),
    bank_agency VARCHAR(20),
    bank_account VARCHAR(30),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('corrente', 'poupanca')),
    bank_cnpj VARCHAR(18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES nomade_wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'bonus', 'penalty', 'withdrawal')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    receipt_url VARCHAR(500),
    justification TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leader Data
CREATE TABLE IF NOT EXISTS leader_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomade_id UUID REFERENCES nomades(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    monthly_fixed_salary DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    managed_nomades UUID[], -- Array of nomade IDs
    qualification_responsibilities TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Tasks for Qualifications
CREATE TABLE IF NOT EXISTS test_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    learning_circuit JSONB, -- Array of learning content objects
    template JSONB, -- Template data for the test
    checklist JSONB, -- Array of qualification checklist items
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Submissions
CREATE TABLE IF NOT EXISTS test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_task_id UUID REFERENCES test_tasks(id) ON DELETE CASCADE,
    nomade_id UUID REFERENCES nomades(id) ON DELETE CASCADE,
    submission_data JSONB, -- Submitted work/answers
    status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'revision_requested')),
    progress INTEGER DEFAULT 0,
    reviewer_id UUID REFERENCES nomades(id), -- Leader who reviews
    review_notes TEXT,
    score DECIMAL(3,2),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Availability Tracking
CREATE TABLE IF NOT EXISTS category_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    active_nomades INTEGER DEFAULT 0,
    tasks_last_30_days INTEGER DEFAULT 0,
    available_hours INTEGER DEFAULT 0,
    status VARCHAR(10) DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
    needs_more_professionals BOOLEAN DEFAULT FALSE,
    demand_trend VARCHAR(10),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nomade Levels Configuration
CREATE TABLE IF NOT EXISTS nomade_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    criteria JSONB NOT NULL, -- Tasks required, period, rating, hours, etc.
    benefits JSONB NOT NULL, -- Salary increase, guarantees, access, etc.
    description TEXT,
    order_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default nomade levels
INSERT INTO nomade_levels (name, criteria, benefits, description, order_index) VALUES
('Bronze', 
 '{"tasksRequired": 0, "minimumRating": 0}',
 '{"salaryIncrease": 0, "description": "Remuneração padrão"}',
 'Nível inicial para todos os nômades',
 1),
('Silver', 
 '{"tasksRequired": 30, "periodDays": 90, "minimumRating": 4.0}',
 '{"salaryIncrease": 25, "description": "+25% remuneração"}',
 'Primeiro nível de evolução com bônus salarial',
 2),
('Gold', 
 '{"tasksRequired": 60, "periodDays": 90, "minimumRating": 4.5}',
 '{"salaryIncrease": 50, "specialAccess": ["squads"], "description": "+50% remuneração + squads"}',
 'Acesso a projetos especiais e squads',
 3),
('Platinum', 
 '{"inviteOnly": true, "weeklyHours": 20, "minimumRating": 4.5}',
 '{"monthlyGuarantee": true, "description": "Remuneração mínima mensal"}',
 'Garantia de renda mensal mínima',
 4),
('Diamond', 
 '{"inviteOnly": true, "weeklyHours": 24, "minimumRating": 4.5, "allTasksEnabled": true}',
 '{"monthlyGuarantee": true, "leaderEligible": true, "description": "Elegível para liderança"}',
 'Nível máximo, elegível para promoção a líder',
 5),
('Leader', 
 '{"inviteOnly": true, "diamondLevel": true, "allTasksEnabled": true}',
 '{"managementRoles": true, "fixedSalary": true, "commissionBased": true, "description": "Líder qualificador"}',
 'Líder com responsabilidades de gestão e qualificação',
 6);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nomades_user_id ON nomades(user_id);
CREATE INDEX IF NOT EXISTS idx_nomades_level ON nomades(level);
CREATE INDEX IF NOT EXISTS idx_nomades_status ON nomades(status);
CREATE INDEX IF NOT EXISTS idx_nomades_leader_id ON nomades(leader_id);
CREATE INDEX IF NOT EXISTS idx_nomade_qualifications_nomade_id ON nomade_qualifications(nomade_id);
CREATE INDEX IF NOT EXISTS idx_nomade_qualifications_category ON nomade_qualifications(category);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_nomade_id ON test_submissions(nomade_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_status ON test_submissions(status);
