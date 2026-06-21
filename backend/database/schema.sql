-- ============================================================
-- Day Flow Planner — Database Schema
-- Run once in your PostgreSQL database (Neon / Railway / etc.)
-- ============================================================

-- Users (owns all other data)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User preferences (one row per user)
CREATE TABLE IF NOT EXISTS user_prefs (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wake_time   INTEGER NOT NULL DEFAULT 420,
  sleep_time  INTEGER NOT NULL DEFAULT 1380,
  breakfast   INTEGER NOT NULL DEFAULT 480,
  lunch       INTEGER NOT NULL DEFAULT 750,
  dinner      INTEGER NOT NULL DEFAULT 1140,
  gym_time    INTEGER,
  gym_days    INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  focus_start INTEGER NOT NULL DEFAULT 540,
  focus_end   INTEGER NOT NULL DEFAULT 1080,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id               TEXT NOT NULL,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  color            TEXT NOT NULL,
  budget_minutes   INTEGER NOT NULL DEFAULT 0,
  recurring        JSONB,
  default_start    INTEGER,
  default_duration INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- Time blocks
CREATE TABLE IF NOT EXISTS time_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  date          DATE NOT NULL,
  start_minutes INTEGER NOT NULL,
  end_minutes   INTEGER NOT NULL,
  note          TEXT,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  recurring     JSONB,
  template_id   TEXT,
  task_id       UUID,
  fixed         BOOLEAN NOT NULL DEFAULT FALSE,
  autoplanned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_blocks_user_date ON time_blocks (user_id, date);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  note             TEXT,
  priority         TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  category         TEXT,
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at_ms    BIGINT NOT NULL,
  deadline         DATE,
  estimate_minutes INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  target        TEXT,
  start_date    DATE NOT NULL,
  deadline      DATE NOT NULL,
  habits        JSONB NOT NULL DEFAULT '[]',
  checkins      JSONB NOT NULL DEFAULT '[]',
  created_at_ms BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily reflections
CREATE TABLE IF NOT EXISTS reflections (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);
