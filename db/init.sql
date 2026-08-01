-- PostgreSQL Database Schema Initialization for SEEP
-- Enable extension for UUID generation if needed (gen_random_uuid() is built-in in PG 13+)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Roles
INSERT INTO roles (id, name, permissions) VALUES
(1, 'ADMIN', '["read:all", "write:all", "delete:all"]'),
(2, 'TEACHER', '["read:exams", "write:exams", "read:questions", "write:questions", "write:evaluations"]'),
(3, 'STUDENT', '["read:exams", "write:answers", "read:results"]'),
(4, 'AUDITOR', '["read:exams", "read:audit_logs", "read:proctoring_logs"]')
ON CONFLICT (id) DO UPDATE SET permissions = EXCLUDED.permissions;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    mfa_secret VARCHAR(128) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Students Extension Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    biometric_hash TEXT DEFAULT NULL,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 4. Teachers Extension Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    employee_code VARCHAR(50) UNIQUE NOT NULL
);

-- 5. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    total_marks NUMERIC(5, 2) NOT NULL CHECK (total_marks > 0),
    passing_percentage NUMERIC(5, 2) NOT NULL DEFAULT 40.0 CHECK (passing_percentage >= 0 AND passing_percentage <= 100.0),
    proctoring_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Answers Table
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id VARCHAR(24) NOT NULL, -- references MongoDB document id
    submitted_answer TEXT,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_exam_question UNIQUE (student_id, exam_id, question_id)
);

-- 9. Results Table
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    score_obtained NUMERIC(5, 2) NOT NULL CHECK (score_obtained >= 0),
    grade VARCHAR(5) NOT NULL,
    percentile NUMERIC(5, 2) NOT NULL CHECK (percentile >= 0 AND percentile <= 100.0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PASS', 'FAIL', 'PENDING_REVIEW', 'MALPRACTICE_DETECTED')),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_exam_result UNIQUE (student_id, exam_id)
);

-- 10. Evaluations Table (Manual override/assist options)
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    ai_score NUMERIC(5, 2) NOT NULL CHECK (ai_score >= 0),
    manual_score NUMERIC(5, 2) DEFAULT NULL CHECK (manual_score >= 0),
    final_score NUMERIC(5, 2) NOT NULL CHECK (final_score >= 0),
    ai_feedback TEXT,
    evaluation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent VARCHAR(255),
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Malpractice Reports Table
CREATE TABLE IF NOT EXISTS malpractice_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key VARCHAR(255) NOT NULL,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'REPORTED'
);

-- 13. Retest Requests Table
CREATE TABLE IF NOT EXISTS retest_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- =========================================================================
-- INDEXES FOR HIGH CONCURRENCY AND READ OPTIMIZATION
-- =========================================================================

-- Indexes on foreign keys to prevent full table scans on joins/deletes
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_answers_student_id ON answers(student_id);
CREATE INDEX IF NOT EXISTS idx_answers_exam_id ON answers(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_answer_id ON evaluations(answer_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_malpractice_reports_student_exam ON malpractice_reports(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_retest_requests_student_exam ON retest_requests(student_id, exam_id);

-- Composite and specialized indexes
CREATE INDEX IF NOT EXISTS idx_exams_start_end ON exams(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_answers_student_exam ON answers(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_gin_status_role ON users USING gin (role_id, status) WHERE status = 'ACTIVE';

-- Seed Admin User (password is 'adminPassword123' hashed with argon2 placeholder for schema setup)
-- In production, the password hash would be computed using argon2id.
INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, status)
VALUES ('e290bdf6-3023-4552-b13c-8a2157fb55d0', 'admin@seep.platform', '$argon2id$v=19$m=65536,t=3,p=4$c2VlcF9zYWx0XzEyMzQ1Njc4$t6B1+hV2+lO6Ym2t5j4/5YV2gQ', 'System', 'Administrator', 1, 'ACTIVE')
ON CONFLICT (email) DO NOTHING;
