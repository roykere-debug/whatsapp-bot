// Log immediately when the file loads
console.log("[STARTUP] Starting WhatsApp Bot server...");
console.log("[STARTUP] Node version:", process.version);
console.log("[STARTUP] Process PID:", process.pid);
console.log("[STARTUP] Current working directory:", process.cwd());

import "dotenv/config";
import express from "express";
import { webhook } from "./router";

console.log("[STARTUP] Dependencies loaded");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("[STARTUP] Express app created, PORT:", PORT);

// Log all requests - this should ALWAYS log if server is receiving requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  console.log(`[REQUEST] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[REQUEST] Body exists:`, !!req.body);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[REQUEST] Body keys:`, Object.keys(req.body));
  }
  next();
});

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("WhatsApp Tickets Bot is running ✔️");
});

app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.post("/webhook/greenapi", webhook);

// Global error handler middleware (must be after routes)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[ERROR] Unhandled error:", err);
  console.error("[ERROR] Stack:", err.stack);
  console.error("[ERROR] Request:", {
    method: req.method,
    path: req.path,
    body: req.body
  });
  
  res.status(500).json({ 
    ok: false, 
    error: "Internal server error",
    message: err.message 
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error("[ERROR] Unhandled Promise Rejection:", reason);
  if (reason instanceof Error) {
    console.error("[ERROR] Stack:", reason.stack);
  }
  // Don't exit - log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error("[ERROR] Uncaught Exception:", error);
  console.error("[ERROR] Stack:", error.stack);
  // Log but don't exit - let Railway handle restarts
  // Exiting here can cause Railway to think the app crashed
});

// Handle SIGTERM gracefully (Railway sends this when stopping)
process.on('SIGTERM', () => {
  console.log("[SHUTDOWN] Received SIGTERM, shutting down gracefully...");
  server.close(() => {
    console.log("[SHUTDOWN] Server closed");
    process.exit(0);
  });
  // Force exit after 10 seconds if graceful shutdown doesn't work
  setTimeout(() => {
    console.error("[SHUTDOWN] Forced exit after timeout");
    process.exit(1);
  }, 10000);
});

// Validate environment variables on startup
console.log("[STARTUP] Validating environment variables...");

const requiredEnvVars = ['GREEN_API_INSTANCE_ID', 'GREEN_API_TOKEN', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("=".repeat(50));
  console.error("❌ MISSING REQUIRED ENVIRONMENT VARIABLES");
  console.error("=".repeat(50));
  console.error("❌ Missing variables:", missingVars);
  console.error("Please set these variables before starting the server");
  console.error("=".repeat(50));
  process.exit(1);
}

console.log("✅ Environment variables validated");
console.log("📋 Configuration:");
console.log("   - GREEN_API_INSTANCE_ID:", process.env.GREEN_API_INSTANCE_ID ? "✅ Set" : "❌ Missing");
console.log("   - GREEN_API_TOKEN:", process.env.GREEN_API_TOKEN ? "✅ Set" : "❌ Missing");
console.log("   - DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Missing");
  const testPhoneRaw = process.env.TEST_USER_PHONE || "NOT SET";
  console.log("   - TEST_USER_PHONE (raw):", testPhoneRaw);
  if (testPhoneRaw !== "NOT SET") {
    const testPhoneClean = testPhoneRaw.replace(/[^0-9]/g, "").trim();
    console.log("   - TEST_USER_PHONE (cleaned):", testPhoneClean);
  }
console.log("   - PORT:", PORT);

console.log("[STARTUP] Attempting to start server on port", PORT);

const server = app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("✅ SERVER STARTED SUCCESSFULLY");
  console.log("=".repeat(50));
  console.log("✅ Server running on port", PORT);
  console.log("📡 Webhook endpoint: http://localhost:" + PORT + "/webhook/greenapi");
  console.log("🔒 Safe Mode - TEST_USER_PHONE:", process.env.TEST_USER_PHONE || "NOT SET");
  console.log("📋 Health check: http://localhost:" + PORT + "/health");
  console.log("=".repeat(50));
});

server.on('listening', () => {
  console.log("[SERVER] Server is listening and ready to accept connections");
});

server.on('error', (error: Error) => {
  console.error("=".repeat(50));
  console.error("❌ SERVER FAILED TO START");
  console.error("=".repeat(50));
  console.error("❌ Server error:", error);
  console.error("❌ Stack:", error.stack);
  console.error("=".repeat(50));
});

// This is already handled above, but keeping for clarity
