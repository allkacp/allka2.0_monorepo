-- Allkademy (EAD) Module Schema
-- Educational platform with courses, enrollments, and certificates

-- Course categories
CREATE TABLE IF NOT EXISTS course_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    color VARCHAR(20),
    parent_id INTEGER REFERENCES course_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url VARCHAR(500),
    category_id INTEGER REFERENCES course_categories(id),
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    instructor_name VARCHAR(100) NOT NULL,
    instructor_avatar_url VARCHAR(500),
    instructor_bio TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Statistics (updated by triggers/procedures)
    total_enrollments INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0
);

-- Course access requirements
CREATE TABLE IF NOT EXISTS course_access_requirements (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('account_type', 'account_level', 'feature_access', 'course_completion')),
    value VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course modules
CREATE TABLE IF NOT EXISTS course_modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    estimated_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(20) CHECK (type IN ('video', 'text', 'document', 'interactive')),
    content_url VARCHAR(500),
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL,
    is_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lesson resources
CREATE TABLE IF NOT EXISTS lesson_resources (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('pdf', 'link', 'download')),
    url VARCHAR(500) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('multiple_choice', 'true_false', 'text')),
    options JSONB, -- For multiple choice options
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL, -- References users table
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_lesson_id INTEGER REFERENCES lessons(id),
    certificate_url VARCHAR(500),
    payment_status VARCHAR(20) DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'pending')),
    payment_amount DECIMAL(10,2),
    payment_date TIMESTAMP,
    
    UNIQUE(user_id, course_id)
);

-- Lesson progress tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES course_enrollments(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    watch_time INTEGER DEFAULT 0, -- in seconds
    last_position INTEGER DEFAULT 0, -- for video lessons
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(enrollment_id, lesson_id)
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES course_enrollments(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answers JSONB NOT NULL -- Store all answers
);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES course_enrollments(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id),
    user_id INTEGER NOT NULL,
    certificate_url VARCHAR(500) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_code VARCHAR(50) UNIQUE NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    
    UNIQUE(enrollment_id)
);

-- Learning paths
CREATE TABLE IF NOT EXISTS learning_paths (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url VARCHAR(500),
    estimated_duration INTEGER DEFAULT 0,
    level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning path courses
CREATE TABLE IF NOT EXISTS learning_path_courses (
    id SERIAL PRIMARY KEY,
    learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    
    UNIQUE(learning_path_id, course_id)
);

-- Learning path access requirements
CREATE TABLE IF NOT EXISTS learning_path_access_requirements (
    id SERIAL PRIMARY KEY,
    learning_path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('account_type', 'account_level', 'feature_access', 'course_completion')),
    value VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User learning statistics
CREATE TABLE IF NOT EXISTS user_learning_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    total_courses_enrolled INTEGER DEFAULT 0,
    total_courses_completed INTEGER DEFAULT 0,
    total_certificates INTEGER DEFAULT 0,
    total_learning_hours INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    favorite_categories JSONB DEFAULT '[]',
    skill_levels JSONB DEFAULT '{}',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course reviews and ratings
CREATE TABLE IF NOT EXISTS course_reviews (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    enrollment_id INTEGER REFERENCES course_enrollments(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(course_id, user_id)
);

-- Wallet transactions for course purchases
CREATE TABLE IF NOT EXISTS allkademy_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER REFERENCES courses(id),
    enrollment_id INTEGER REFERENCES course_enrollments(id),
    type VARCHAR(20) CHECK (type IN ('purchase', 'refund', 'commission')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method VARCHAR(50) DEFAULT 'wallet_credits',
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_enrollment ON quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_allkademy_transactions_user ON allkademy_transactions(user_id);

-- Insert sample categories
INSERT INTO course_categories (name, description, icon, color) VALUES
('Plataforma Allka', 'Como usar a plataforma', '🚀', 'blue'),
('Marketing Digital', 'Estratégias e táticas', '📈', 'green'),
('Gestão de Projetos', 'Metodologias e ferramentas', '📋', 'purple'),
('Vendas', 'Técnicas de vendas', '💰', 'orange'),
('Liderança', 'Desenvolvimento de liderança', '👑', 'red'),
('Design', 'Design gráfico e UX/UI', '🎨', 'pink'),
('Desenvolvimento', 'Programação e tecnologia', '💻', 'indigo'),
('Finanças', 'Gestão financeira', '📊', 'emerald')
ON CONFLICT DO NOTHING;

-- Insert sample courses
INSERT INTO courses (title, description, category_id, level, duration_minutes, price, is_free, instructor_name, instructor_bio, status) VALUES
('Introdução à Plataforma Allka', 'Aprenda os fundamentos da plataforma e como maximizar seus resultados', 1, 'beginner', 120, 0, true, 'Equipe Allka', 'Especialistas da plataforma Allka', 'published'),
('Marketing Digital Avançado', 'Estratégias avançadas de marketing digital para agências', 2, 'advanced', 480, 299, false, 'Carlos Marketing', '15 anos de experiência em marketing digital', 'published'),
('Gestão de Projetos Premium', 'Metodologias avançadas para gestão de projetos premium', 3, 'intermediate', 360, 199, false, 'Ana Projetos', 'Especialista em gestão de projetos digitais', 'published')
ON CONFLICT DO NOTHING;

-- Insert sample access requirements
INSERT INTO course_access_requirements (course_id, type, value, description) VALUES
(2, 'account_type', 'agencias', 'Disponível apenas para agências'),
(3, 'account_level', 'premium', 'Disponível para contas premium')
ON CONFLICT DO NOTHING;

-- Function to update course statistics
CREATE OR REPLACE FUNCTION update_course_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update enrollment count
    UPDATE courses 
    SET total_enrollments = (
        SELECT COUNT(*) 
        FROM course_enrollments 
        WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    )
    WHERE id = COALESCE(NEW.course_id, OLD.course_id);
    
    -- Update completion rate
    UPDATE courses 
    SET completion_rate = (
        SELECT COALESCE(
            (COUNT(*) FILTER (WHERE completed_at IS NOT NULL) * 100.0) / NULLIF(COUNT(*), 0),
            0
        )
        FROM course_enrollments 
        WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    )
    WHERE id = COALESCE(NEW.course_id, OLD.course_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for course statistics
DROP TRIGGER IF EXISTS trigger_update_course_stats_on_enrollment ON course_enrollments;
CREATE TRIGGER trigger_update_course_stats_on_enrollment
    AFTER INSERT OR UPDATE OR DELETE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_course_stats();

-- Function to update course ratings
CREATE OR REPLACE FUNCTION update_course_ratings()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE courses 
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM course_reviews 
            WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
            AND is_public = true
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM course_reviews 
            WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
            AND is_public = true
        )
    WHERE id = COALESCE(NEW.course_id, OLD.course_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for course ratings
DROP TRIGGER IF EXISTS trigger_update_course_ratings ON course_reviews;
CREATE TRIGGER trigger_update_course_ratings
    AFTER INSERT OR UPDATE OR DELETE ON course_reviews
    FOR EACH ROW EXECUTE FUNCTION update_course_ratings();

-- Function to update user learning stats
CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_learning_stats (user_id) 
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    UPDATE user_learning_stats 
    SET 
        total_courses_enrolled = (
            SELECT COUNT(*) 
            FROM course_enrollments 
            WHERE user_id = NEW.user_id
        ),
        total_courses_completed = (
            SELECT COUNT(*) 
            FROM course_enrollments 
            WHERE user_id = NEW.user_id 
            AND completed_at IS NOT NULL
        ),
        total_certificates = (
            SELECT COUNT(*) 
            FROM certificates 
            WHERE user_id = NEW.user_id 
            AND is_valid = true
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user learning stats
DROP TRIGGER IF EXISTS trigger_update_user_learning_stats ON course_enrollments;
CREATE TRIGGER trigger_update_user_learning_stats
    AFTER INSERT OR UPDATE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_user_learning_stats();

COMMENT ON TABLE courses IS 'Educational courses in the Allkademy platform';
COMMENT ON TABLE course_enrollments IS 'User enrollments in courses with progress tracking';
COMMENT ON TABLE certificates IS 'Certificates issued upon course completion';
COMMENT ON TABLE allkademy_transactions IS 'Financial transactions for course purchases and commissions';
