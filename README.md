# WhatsApp Scheduler

A WhatsApp message scheduler built with Bun, Baileys, BullMQ, and Redis.

## Features

- 📅 Schedule WhatsApp messages for future delivery
- 🚀 Send immediate messages via REST API
- 💾 SQLite database for message persistence
- 🔄 BullMQ + Redis for reliable job scheduling
- ✅ Automatic retry on failure
- 📱 QR code authentication with Baileys

## Prerequisites

- [Bun](https://bun.sh) installed
- Redis server running (local or remote)

## Installation

```bash
bun install
```

## Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Update `.env` with your configuration:

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Running the Application

### Start Redis (if not already running)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using Homebrew on macOS
brew services start redis
```

### Start the Application

```bash
bun run index.ts
```

On first run, scan the QR code with WhatsApp to authenticate.

## API Endpoints

### Health Check
```bash
GET /health
```

### Get WhatsApp Connection Status
```bash
GET /api/status
```

### Schedule a Message
```bash
POST /api/schedule
Content-Type: application/json

{
  "phoneNumber": "1234567890",
  "message": "Hello from WhatsApp Scheduler!",
  "scheduledTime": "2026-04-16T15:30:00Z"
}
```

### Send Immediate Message
```bash
POST /api/send
Content-Type: application/json

{
  "phoneNumber": "1234567890",
  "message": "Hello immediately!"
}
```

### Get All Scheduled Messages
```bash
GET /api/messages

# Filter by status
GET /api/messages?status=pending
```

### Get Message by ID
```bash
GET /api/messages/:id
```

### Cancel/Delete Scheduled Message
```bash
DELETE /api/messages/:id
```

## Example Usage with curl

```bash
# Schedule a message for 5 minutes from now
curl -X POST http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "1234567890",
    "message": "Test message",
    "scheduledTime": "2026-04-16T15:30:00Z"
  }'

# Get all messages
curl http://localhost:3000/api/messages

# Send immediate message
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "1234567890",
    "message": "Immediate message"
  }'
```

## Project Structure

```
whatsapp-scheduler/
├── src/
│   ├── whatsapp/
│   │   ├── client.ts        # Baileys connection + session
│   │   └── sender.ts        # sendMessage wrapper
│   ├── scheduler/
│   │   ├── queue.ts         # BullMQ queue definition
│   │   └── worker.ts        # Job processor
│   ├── api/
│   │   └── routes.ts        # REST API handlers
│   └── db/
│       └── index.ts         # SQLite with bun:sqlite
├── sessions/                # Baileys auth session files
├── index.ts                 # Entry point
├── .env.example
└── package.json
```

## Tech Stack

- **Runtime**: Bun
- **WhatsApp Client**: Baileys
- **Queue**: BullMQ
- **Database**: SQLite (bun:sqlite)
- **Cache/Queue Backend**: Redis
- **HTTP Server**: Bun.serve()

## License

MIT
