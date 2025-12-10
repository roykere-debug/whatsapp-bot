import "dotenv/config";
import express from "express";
import { webhook } from "./router";

const app = express();
const PORT = process.env.PORT || 3000;

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
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
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error("[ERROR] Uncaught Exception:", error);
  console.error("[ERROR] Stack:", error.stack);
  // Don't exit immediately, let the process manager handle it
});

const server = app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
  console.log("📡 Webhook endpoint: http://localhost:" + PORT + "/webhook/greenapi");
  console.log("🔒 Safe Mode - TEST_USER_PHONE:", process.env.TEST_USER_PHONE || "NOT SET");
});

// Add error handling
server.on('error', (error: Error) => {
  console.error("❌ Server error:", error);
  console.error("❌ Stack:", error.stack);
});
