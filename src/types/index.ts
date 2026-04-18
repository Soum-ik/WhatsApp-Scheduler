export type Recurrence = "once" | "daily" | "weekly" | "monthly";
export type SessionStatus = "disconnected" | "qr" | "connected";
export type RunStatus = "pending" | "sent" | "failed" | "skipped_offline";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  name: string | null;
  message: string;
  recurrence: Recurrence;
  cron_expr: string | null;
  run_at: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleRecipient {
  id: string;
  schedule_id: string;
  phone_number: string;
}

export interface ScheduledMessageRun {
  id: string;
  schedule_id: string;
  recipient_id: string;
  status: RunStatus;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface WhatsappSession {
  user_id: string;
  creds: unknown | null;
  status: SessionStatus;
  connected_at: string | null;
  updated_at: string;
}
