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

app.post("/webhook/greenapi", webhook);

const server = app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
  console.log("📡 Webhook endpoint: http://localhost:" + PORT + "/webhook/greenapi");
  console.log("🔒 Safe Mode - TEST_USER_PHONE:", process.env.TEST_USER_PHONE || "NOT SET");
});

// Add error handling
server.on('error', (error: Error) => {
  console.error("❌ Server error:", error);
});
