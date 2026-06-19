-- Initial schema for OSCAR-Sim Phase 1
-- Creates the users table for the /users endpoint

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial seed data
INSERT INTO users (username) VALUES ('admin_user'), ('test_user') ON CONFLICT DO NOTHING;
