import { connectToWhatsApp } from "./src/whatsapp/client";
import "./src/scheduler/worker"; // Start the worker
import {
  handleScheduleMessage,
  handleGetMessages,
  handleGetMessage,
  handleDeleteMessage,
  handleSendNow,
  handleGetStatus,
} from "./src/api/routes";

console.log("🚀 Starting WhatsApp Scheduler...\n");

// Connect to WhatsApp
connectToWhatsApp().catch((error) => {
  console.error("❌ Failed to connect to WhatsApp:", error);
  process.exit(1);
});

// Start the API server
const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Helper to add CORS headers to response
    const addCorsHeaders = (response: Response) => {
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    };

    // Routes
    if (url.pathname === "/api/schedule" && req.method === "POST") {
      return addCorsHeaders(await handleScheduleMessage(req));
    }

    if (url.pathname === "/api/send" && req.method === "POST") {
      return addCorsHeaders(await handleSendNow(req));
    }

    if (url.pathname === "/api/messages" && req.method === "GET") {
      return addCorsHeaders(await handleGetMessages(req));
    }

    if (url.pathname.match(/^\/api\/messages\/\d+$/) && req.method === "GET") {
      const id = url.pathname.split("/").pop()!;
      return addCorsHeaders(await handleGetMessage(req, { id }));
    }

    if (url.pathname.match(/^\/api\/messages\/\d+$/) && req.method === "DELETE") {
      const id = url.pathname.split("/").pop()!;
      return addCorsHeaders(await handleDeleteMessage(req, { id }));
    }

    if (url.pathname === "/api/status" && req.method === "GET") {
      return addCorsHeaders(await handleGetStatus(req));
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return addCorsHeaders(
        Response.json({
          status: "ok",
          service: "WhatsApp Scheduler API",
          version: "1.0.0",
        })
      );
    }

    // 404 Not Found
    return addCorsHeaders(
      Response.json(
        { error: "Not Found" },
        { status: 404 }
      )
    );
  },
});

console.log(`\n✅ Server started on http://localhost:${server.port}`);
console.log(`\n📋 Available endpoints:`);
console.log(`   POST   /api/schedule        - Schedule a message`);
console.log(`   POST   /api/send            - Send immediate message`);
console.log(`   GET    /api/messages        - Get all messages`);
console.log(`   GET    /api/messages/:id    - Get message by ID`);
console.log(`   DELETE /api/messages/:id    - Cancel/delete message`);
console.log(`   GET    /api/status          - Get connection status`);
console.log(`   GET    /health              - Health check\n`);
