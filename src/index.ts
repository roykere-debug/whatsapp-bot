import express from "express";
import { webhook } from "./router";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("WhatsApp Tickets Bot is running ✔️");
});

app.post("/webhook/greenapi", webhook);

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
