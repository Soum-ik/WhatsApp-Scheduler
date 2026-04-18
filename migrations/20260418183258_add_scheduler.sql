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
