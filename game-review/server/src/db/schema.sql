-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth0_sub TEXT UNIQUE NOT NULL,
    email TEXT,
    tokens INTEGER DEFAULT 5 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Identities table for linking external accounts
CREATE TABLE identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('steam', 'discord')),
    external_id TEXT NOT NULL,
    username TEXT,
    aoe4world_profile_id TEXT,
    aoe4world_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, external_id)
);

-- Games table (normalized)
CREATE TABLE games (
    id BIGINT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Game metadata
    map_name TEXT NOT NULL,
    game_mode TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    season INTEGER NOT NULL,
    patch INTEGER NOT NULL,
    server TEXT NOT NULL,
    team_size TEXT NOT NULL, -- '1v1', '2v2', '3v3', '4v4'
    average_rating INTEGER,
    average_mmr INTEGER,
    
    played_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'reviewing', 'reviewed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game players table for normalized player data
CREATE TABLE game_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL CHECK (team_number IN (1, 2)),
    player_name TEXT NOT NULL,
    profile_id INTEGER,
    civilization TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    rating INTEGER,
    mmr INTEGER,
    rating_diff INTEGER,
    mmr_diff INTEGER,
    input_type TEXT,
    country TEXT,
    is_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    llm_model TEXT NOT NULL,
    summary_md TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review tasks table for job tracking
CREATE TABLE review_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    llm_model TEXT NOT NULL DEFAULT 'gpt-4o' CHECK (llm_model IN ('gpt-4o', 'o3')),
    job_state TEXT NOT NULL DEFAULT 'queued' CHECK (job_state IN ('queued', 'running', 'completed', 'failed')),
    retries INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    payload_jsonb JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_auth0_sub ON users(auth0_sub);
CREATE INDEX idx_identities_user_id ON identities(user_id);
CREATE INDEX idx_identities_provider_external ON identities(provider, external_id);

-- Games table indexes
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_played_at ON games(played_at DESC);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_map_name ON games(map_name);
CREATE INDEX idx_games_game_mode ON games(game_mode);
CREATE INDEX idx_games_season ON games(season);
CREATE INDEX idx_games_team_size ON games(team_size);

-- Game players table indexes
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_player_name ON game_players(player_name);
CREATE INDEX idx_game_players_civilization ON game_players(civilization);
CREATE INDEX idx_game_players_is_user ON game_players(is_user);
CREATE INDEX idx_game_players_result ON game_players(result);

CREATE INDEX idx_reviews_game_id ON reviews(game_id);
CREATE INDEX idx_review_tasks_game_id ON review_tasks(game_id);
CREATE INDEX idx_review_tasks_job_state ON review_tasks(job_state);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Note: Using application-level security instead of Row Level Security