import { Request, Response } from "express";
import { GreenWebhookBody } from "./types";
import { getUserState, upsertUserState, insertLead, getBotStatus } from "./db";
import { nextState } from "./nextState";
import { sendMessage, sendButtons } from "./greenApiClient";

// Helper function to extract phone number (only digits)
function extractPhone(str: string): string {
  return str.replace(/[^0-9]/g, "").trim();
}

// Get TEST_USER_PHONE and clean it (remove @c.us if present)
const TEST_RAW = process.env.TEST_USER_PHONE || "972549762201";
const TEST = extractPhone(TEST_RAW); // Clean the phone number
const SAFE_MODE_ENABLED = process.env.TEST_USER_PHONE !== undefined && process.env.TEST_USER_PHONE !== "";

console.log("[CONFIG] Safe Mode:", SAFE_MODE_ENABLED ? "ENABLED" : "DISABLED");
console.log("[CONFIG] TEST_USER_PHONE (raw):", TEST_RAW);
console.log("[CONFIG] TEST_USER_PHONE (cleaned):", TEST);

function getText(b: GreenWebhookBody): string {
  // Handle button clicks - buttonTextData contains the buttonId
  if (b.messageData?.buttonTextData?.buttonText) {
    return b.messageData.buttonTextData.buttonText;
  }
  return (
    b.messageData?.textMessageData?.textMessage ||
    b.messageData?.extendedTextMessageData?.text ||
    ""
  );
}

export async function webhook(req: Request, res: Response) {
  // Log immediately when function is called
  console.log("=".repeat(50));
  console.log("[WEBHOOK] WEBHOOK FUNCTION CALLED");
  console.log("=".repeat(50));
  console.log("[WEBHOOK] Timestamp:", new Date().toISOString());
  
  try {
    // Check if bot is enabled
    const botEnabled = await getBotStatus();
    if (!botEnabled) {
      console.log("[WEBHOOK] ⏸️ Bot is disabled - ignoring message");
      return res.json({ ok: true, ignored: true, reason: "bot_disabled" });
    }

    console.log("[WEBHOOK] Received request");
    console.log("[WEBHOOK] Request method:", req.method);
    console.log("[WEBHOOK] Request path:", req.path);
    console.log("[WEBHOOK] Request headers:", JSON.stringify(req.headers, null, 2));
    console.log("[WEBHOOK] Full body:", JSON.stringify(req.body, null, 2));
    const body = req.body as GreenWebhookBody;

    const chatId = body.senderData?.chatId || "";
    const sender = body.senderData?.sender || "";

    console.log("[WEBHOOK] chatId:", chatId, "sender:", sender);
    console.log("[WEBHOOK] TEST (cleaned phone):", TEST);

    // STEP 1: ALWAYS IGNORE GROUP CHATS - Bot only works in private chats
    // Group chats have "-" in chatId or end with "@g.us"
    const isGroupChat = chatId.includes("-") || chatId.includes("@g.us");
    if (isGroupChat) {
      console.log("[WEBHOOK] ❌ Group chat detected - ignoring message");
      console.log("[WEBHOOK] Group chatId:", chatId);
      return res.json({ ok: true, ignored: true, reason: "group_chat" });
    }

    // STEP 2: ALWAYS CHECK IF IT'S YOUR PHONE NUMBER (972549762201)
    // Bot only responds to your number, regardless of Safe Mode setting
    const chatIdPhone = extractPhone(chatId);
    const senderPhone = extractPhone(sender);
    const testPhone = extractPhone(TEST);
    
    console.log("[WEBHOOK] ===== PHONE NUMBER CHECK =====");
    console.log("[WEBHOOK] Extracted phones:", {
      chatId,
      chatIdPhone,
      sender,
      senderPhone,
      TEST,
      testPhone,
      "chatIdPhone === testPhone": chatIdPhone === testPhone,
      "senderPhone === testPhone": senderPhone === testPhone
    });
    
    // Check if phone numbers match (either chatId or sender should match)
    const chatIdMatches = chatIdPhone === testPhone;
    const senderMatches = senderPhone === testPhone;
    const phoneMatches = chatIdMatches || senderMatches;
    
    if (!phoneMatches) {
      console.log("[WEBHOOK] ❌ Message ignored - not your phone number:", { 
        chatId, 
        sender, 
        reason: "Not authorized phone number",
        details: {
          chatIdPhone,
          senderPhone,
          testPhone,
          phoneMatches
        }
      });
      return res.json({ ok: true, ignored: true, reason: "not_authorized_phone" });
    }
    
    console.log("[WEBHOOK] ✅ Message allowed - phone number authorized");

    const text = getText(body);
    console.log("[WEBHOOK] Text received:", text);
    
    // Extract the actual phone number from chatId for state management
    const userPhone = extractPhone(chatId) || extractPhone(sender) || TEST;
    console.log("[WEBHOOK] Using phone for state:", userPhone);
    
    console.log("[WEBHOOK] Processing message...");
    
    try {
      // Get current state using the actual phone number
      const state = await getUserState(userPhone);
      console.log("[WEBHOOK] Current state:", JSON.stringify(state, null, 2));
      
      // If no text but we're in idle state, trigger the greeting
      if (!text && state.state === "idle") {
        console.log("[WEBHOOK] No text but in idle state, triggering greeting");
        const result = nextState(state, "");
        await upsertUserState(result.next);
        if (result.response) {
          try {
            if (result.buttons && result.buttons.length > 0) {
              await sendButtons(chatId, result.response, result.buttons);
              console.log("[WEBHOOK] Greeting with buttons sent");
            } else {
              await sendMessage(chatId, result.response);
              console.log("[WEBHOOK] Greeting sent");
            }
          } catch (sendError) {
            console.error("[WEBHOOK] Error sending greeting:", sendError);
          }
        }
        return res.json({ ok: true });
      }
      
      if (!text) {
        console.log("[WEBHOOK] No text and not in idle state, returning");
        return res.json({ ok: true });
      }
      
      const result = nextState(state, text);
      console.log("[WEBHOOK] Next state result:", {
        state: result.next.state,
        hasResponse: !!result.response,
        response: result.response,
        complete: result.complete
      });

      await upsertUserState(result.next);
      console.log("[WEBHOOK] State saved successfully");

      // Insert lead when complete - support all request types
      if (result.complete) {
        try {
          // For tickets requests
          if (result.next.data.requestType === "tickets" && result.next.data.ticketsGame && result.next.data.ticketsAmount) {
            await insertLead({
              phone: userPhone,
              game: result.next.data.ticketsGame,
              amount: result.next.data.ticketsAmount,
              isUrgent: false, // Tickets requests go through website
              isNewCustomer: result.next.data.orderType === "new",
              raw: { ...result.next.data, type: "tickets", body }
            });
            console.log("[WEBHOOK] Tickets lead inserted successfully");
          }
          // For package requests
          else if (result.next.data.requestType === "package" && result.next.data.packageGames && result.next.data.phoneNumber) {
            await insertLead({
              phone: result.next.data.phoneNumber,
              game: result.next.data.packageGames,
              amount: parseInt(result.next.data.packagePeople || "1") || 1,
              isUrgent: false,
              isNewCustomer: result.next.data.orderType === "new",
              raw: { ...result.next.data, type: "package", body }
            });
            console.log("[WEBHOOK] Package lead inserted successfully");
          }
          // For general requests (existing orders or urgent)
          else if (result.next.data.generalRequest || (result.next.data.isUrgent && result.next.data.orderType === "existing")) {
            await insertLead({
              phone: userPhone,
              game: result.next.data.generalRequest || "בקשה כללית",
              amount: 0,
              isUrgent: !!result.next.data.isUrgent,
              isNewCustomer: false,
              raw: { ...result.next.data, type: "general", body }
            });
            console.log("[WEBHOOK] General request lead inserted successfully");
          }
        } catch (leadError) {
          console.error("[WEBHOOK] Error inserting lead:", leadError);
          // Continue even if lead insertion fails
        }
      }

      if (result.response) {
        try {
          console.log("[WEBHOOK] Sending message to:", chatId);
          console.log("[WEBHOOK] Message content:", result.response);
          if (result.buttons && result.buttons.length > 0) {
            console.log("[WEBHOOK] Sending with buttons:", result.buttons);
            const sendResult = await sendButtons(chatId, result.response, result.buttons);
            console.log("[WEBHOOK] Message with buttons sent successfully:", sendResult);
          } else {
            const sendResult = await sendMessage(chatId, result.response);
            console.log("[WEBHOOK] Message sent successfully:", sendResult);
          }
        } catch (sendError) {
          console.error("[WEBHOOK] Error sending message:", sendError);
          if (sendError instanceof Error) {
            console.error("[WEBHOOK] Send error stack:", sendError.stack);
          }
          // Log but don't fail the webhook
        }
      } else {
        console.log("[WEBHOOK] No response to send");
      }

      return res.json({ ok: true });
    } catch (processingError) {
      console.error("[WEBHOOK] Error processing message:", processingError);
      const errorMessage = processingError instanceof Error 
        ? processingError.message 
        : String(processingError);
      console.error("[WEBHOOK] Error details:", {
        message: errorMessage,
        stack: processingError instanceof Error ? processingError.stack : undefined,
        chatId,
        sender,
        text
      });
      
      // Return 500 but still acknowledge the webhook to prevent retries
      return res.status(500).json({ 
        ok: false, 
        error: "Internal server error",
        message: errorMessage
      });
    }
  } catch (error) {
    console.error("[WEBHOOK] Unexpected error:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error);
    console.error("[WEBHOOK] Error stack:", error instanceof Error ? error.stack : undefined);
    
    // Return 500 but acknowledge the webhook
    return res.status(500).json({ 
      ok: false, 
      error: "Internal server error",
      message: errorMessage
    });
  }
}
