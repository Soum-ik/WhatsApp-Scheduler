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
-- Migration: add_scheduler
-- Created: 2026-04-18T18:32:58.935Z

CREATE TABLE schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT,
  message      TEXT NOT NULL,
  recurrence   TEXT NOT NULL CHECK (recurrence IN ('once','daily','weekly','monthly')),
  cron_expr    TEXT,
  run_at       TIMESTAMPTZ,
  timezone     TEXT NOT NULL DEFAULT 'UTC',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX schedules_user_idx ON schedules(user_id);

CREATE TABLE schedule_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  phone_number  TEXT NOT NULL,
  UNIQUE (schedule_id, phone_number)
);

CREATE TABLE scheduled_message_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES schedule_recipients(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('pending','sent','failed','skipped_offline')),
  error         TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX runs_schedule_idx ON scheduled_message_runs(schedule_id);
