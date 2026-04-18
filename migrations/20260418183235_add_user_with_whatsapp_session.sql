-- Migration: add_user_with_whatsapp_session
-- Created: 2026-04-18T18:32:35.866Z

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_sessions (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  creds         JSONB,
  status        TEXT NOT NULL DEFAULT 'disconnected',
  connected_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_signal_keys (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type     TEXT NOT NULL,
  key_id   TEXT NOT NULL,
  value    JSONB NOT NULL,
  PRIMARY KEY (user_id, type, key_id)
);

DROP TABLE IF EXISTS scheduled_messages;
