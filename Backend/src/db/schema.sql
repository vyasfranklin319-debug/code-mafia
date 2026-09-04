-- Code Mafia PostgreSQL Relational Database Schema
-- Production Durable State Storage

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(128) UNIQUE,
    password_hash VARCHAR(256),
    xp INT DEFAULT 0,
    rating INT DEFAULT 1200,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(64) PRIMARY KEY,
    join_code VARCHAR(16) NOT NULL UNIQUE,
    host_name VARCHAR(64) NOT NULL,
    phase VARCHAR(32) NOT NULL DEFAULT 'LOBBY',
    current_round INT DEFAULT 1,
    phase_ends_at BIGINT DEFAULT 0,
    winner VARCHAR(32),
    win_reason TEXT,
    config_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS game_players (
    id VARCHAR(64) PRIMARY KEY,
    game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id VARCHAR(64),
    display_name VARCHAR(64) NOT NULL,
    role VARCHAR(32),
    is_alive BOOLEAN DEFAULT TRUE,
    is_host BOOLEAN DEFAULT FALSE,
    is_ready BOOLEAN DEFAULT FALSE,
    avatar_color VARCHAR(32) DEFAULT 'bg-purple-600',
    stats_json JSONB,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_commits (
    id VARCHAR(64) PRIMARY KEY,
    game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id VARCHAR(64) NOT NULL,
    player_name VARCHAR(64) NOT NULL,
    file_path VARCHAR(256) NOT NULL,
    commit_hash VARCHAR(32) NOT NULL,
    lines_added INT DEFAULT 0,
    lines_removed INT DEFAULT 0,
    is_shadow BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_test_runs (
    id VARCHAR(64) PRIMARY KEY,
    game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    executed_by VARCHAR(64) NOT NULL,
    passed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    total_count INT DEFAULT 0,
    pass_rate INT DEFAULT 0,
    integrity_score INT DEFAULT 100,
    results_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_votes (
    id VARCHAR(64) PRIMARY KEY,
    game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    voter_id VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_eliminations (
    id VARCHAR(64) PRIMARY KEY,
    game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    eliminated_player_id VARCHAR(64),
    eliminated_player_name VARCHAR(64),
    eliminated_role VARCHAR(32),
    vote_tally_json JSONB,
    was_tie BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid query performance
CREATE INDEX IF NOT EXISTS idx_games_join_code ON games(join_code);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_commits_game ON game_commits(game_id);
CREATE INDEX IF NOT EXISTS idx_game_test_runs_game ON game_test_runs(game_id);
CREATE INDEX IF NOT EXISTS idx_game_votes_game ON game_votes(game_id, round_number);
CREATE INDEX IF NOT EXISTS idx_game_eliminations_game ON game_eliminations(game_id);
