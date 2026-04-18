# WhatsApp Scheduler

Multi-user WhatsApp message scheduler built with Bun, Baileys, BullMQ, Postgres, and Redis.

Each user signs in, pairs their own WhatsApp account via QR, and manages one-time or recurring schedules (daily / weekly / monthly). Recurring jobs are driven by BullMQ repeatable jobs; every send is persisted as a run row for audit.

## Features

- JWT-based signup / signin; per-user WhatsApp session isolation
- Baileys auth state persisted in Postgres (not files) so sessions survive restarts and scale horizontally
- Recurrence: `once` (runAt) or `daily` / `weekly` / `monthly` (time + dayOfWeek / dayOfMonth) with timezone support
- Recipient validation against WhatsApp before a schedule is accepted
- Run history per schedule (`pending` / `sent` / `failed` / `skipped_offline`)
- Rate limiting, helmet, CORS, structured logging, graceful shutdown
- SQL migrations with timestamped files

## Prerequisites

- [Bun](https://bun.sh)
- Postgres 14+
- Redis 6+

`docker-compose.yml` ships a Redis service; bring your own Postgres or add one.

## Setup

```bash
bun install
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/whatsapp_sch
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-prod
JWT_EXPIRES_IN=7d
```

Start Redis and run migrations:

```bash
docker compose up -d redis
bun run db:migrate
```

## Running

```bash
bun run dev      # hot reload
bun run start    # production
```

The HTTP server comes up immediately; `/health` returns `503 {status:"starting"}` until migrations finish and the BullMQ worker is up, then `200 {status:"ok"}`.

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | Start with `--hot` |
| `bun run start` | Start server |
| `bun test` | Run tests (`tests/`) |
| `bun run db:migrate` | Apply pending migrations, then dump schema |
| `bun run db:new <name>` | Create a new timestamped migration file |
| `bun run db:dump` | Concatenate `migrations/*.sql` → `schema/schema.sql` |

## API

All `/schedules` and `/whatsapp` routes require `Authorization: Bearer <token>`.

### Auth

```http
POST /auth/signup   { email, password }   → 201 { token, userId }
POST /auth/signin   { email, password }   → 200 { token, userId }
```

Password must be ≥ 8 chars. Rate-limited to 10 req/min per IP.

### WhatsApp session

```http
GET  /whatsapp/qr           # SSE stream: "qr" / "connected" / "closed" events
GET  /whatsapp/status       # { status: "disconnected" | "connecting" | "connected" }
POST /whatsapp/disconnect
```

Connect flow: `curl -N` the `/whatsapp/qr` endpoint, render each `qr` event as a QR code, scan with WhatsApp → Linked devices. The stream ends on `connected` or `closed`.

### Schedules

```http
POST   /schedules           # create
GET    /schedules           # list current user's schedules + recipients
GET    /schedules/:id
PATCH  /schedules/:id       # partial update; toggle with { isActive }
DELETE /schedules/:id
GET    /schedules/:id/runs  # run history
```

Create body:

```jsonc
{
  "name": "Morning standup ping",           // optional
  "message": "Standup in 10m",
  "recipients": ["+15551234567", "..."],    // 1..100, E.164 normalized server-side
  "recurrence": "once" | "daily" | "weekly" | "monthly",
  "runAt": "2026-04-20T09:00:00Z",          // required when recurrence=once
  "time": "09:00",                           // HH:mm, required for recurring
  "dayOfWeek": 1,                            // 0=Sun..6=Sat, required for weekly
  "dayOfMonth": 15,                          // 1..31, required for monthly
  "timezone": "America/New_York"             // defaults to UTC
}
```

Each recipient is validated against WhatsApp at create/update time; unreachable numbers are rejected with `400`.

## Example

```bash
TOKEN=$(curl -s -X POST localhost:3000/auth/signup \
  -H content-type:application/json \
  -d '{"email":"me@example.com","password":"supersecret"}' | jq -r .token)

curl -N -H "Authorization: Bearer $TOKEN" localhost:3000/whatsapp/qr

curl -X POST localhost:3000/schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H content-type:application/json \
  -d '{
    "name":"Daily reminder",
    "message":"Don’t forget standup",
    "recipients":["+15551234567"],
    "recurrence":"daily",
    "time":"09:00",
    "timezone":"America/New_York"
  }'
```

## Project Structure

```
whatsapp-sch/
├── index.ts                       # Boot: migrate → worker → HTTP server
├── migrations/                    # Timestamped .sql files
├── schema/schema.sql              # Concatenated dump (generated)
├── scripts/new-migration.ts
├── src/
│   ├── config/env.ts              # Typed env loader
│   ├── http/
│   │   ├── server.ts              # Express app
│   │   ├── middleware/            # requireAuth, error handler
│   │   └── routes/                # auth, whatsapp, schedule
│   ├── services/                  # auth, schedule, whatsapp, run-schedule
│   ├── infra/
│   │   ├── db/                    # Bun.sql pool + migrator
│   │   ├── auth/jwt.ts
│   │   ├── queue/                 # BullMQ connection / scheduler / worker
│   │   ├── whatsapp/              # client-manager, db-auth-state, sender
│   │   └── repos/                 # user, whatsapp-session, schedule, recipient, run
│   ├── shared/                    # errors, logger, phone (E.164)
│   └── types/
└── tests/                         # cron + phone utility tests
```

## Tech Stack

- **Runtime**: Bun
- **HTTP**: Express (with helmet, cors, express-rate-limit)
- **WhatsApp**: @whiskeysockets/baileys (auth state in Postgres)
- **Queue**: BullMQ on Redis (repeatable jobs for cron recurrence)
- **Database**: Postgres via `Bun.sql`
- **Auth**: JSON Web Tokens
- **Validation**: Zod

## License

MIT
