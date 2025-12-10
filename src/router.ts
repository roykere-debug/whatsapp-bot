import { Request, Response } from "express";
import { GreenWebhookBody } from "./types";
import { getUserState, upsertUserState, insertLead } from "./db";
import { nextState } from "./nextState";
import { sendMessage } from "./greenApiClient";

const TEST = process.env.TEST_USER_PHONE || "972549762201";

function getText(b: GreenWebhookBody): string {
  return (
    b.messageData?.textMessageData?.textMessage ||
    b.messageData?.extendedTextMessageData?.text ||
    ""
  );
}

export async function webhook(req: Request, res: Response) {
  try {
    console.log("[WEBHOOK] Received request");
    const body = req.body as GreenWebhookBody;

    const chatId = body.senderData?.chatId || "";
    const sender = body.senderData?.sender || "";

    console.log("[WEBHOOK] chatId:", chatId, "sender:", sender);

    const expectedChatId = `${TEST}@c.us`;
    console.log("[WEBHOOK] Expected chatId:", expectedChatId, "TEST:", TEST);

    // SAFE MODE — ONLY YOU
    const isYou =
      chatId === expectedChatId &&
      !chatId.includes("-") &&
      sender === TEST;

    console.log("[WEBHOOK] isYou check:", isYou);

    if (!isYou) {
      console.log("[SAFE] ignored:", chatId, sender);
      return res.json({ ok: true, ignored: true });
    }

    const text = getText(body);
    console.log("[WEBHOOK] Text received:", text);
    
    if (!text) {
      console.log("[WEBHOOK] No text, returning");
      return res.json({ ok: true });
    }

    console.log("[WEBHOOK] Processing message...");
    
    try {
      const state = await getUserState(TEST);
      const result = nextState(state, text);

      await upsertUserState(result.next);

      if (result.complete && result.next.data.game && result.next.data.amount) {
        try {
          await insertLead({
            phone: result.next.data.phoneNumber!,
            game: result.next.data.game!,
            amount: result.next.data.amount!,
            isUrgent: !!result.next.data.isUrgent,
            isNewCustomer: !!result.next.data.isNewCustomer,
            raw: body
          });
        } catch (leadError) {
          console.error("[WEBHOOK] Error inserting lead:", leadError);
          // Continue even if lead insertion fails
        }
      }

      if (result.response) {
        try {
          await sendMessage(expectedChatId, result.response);
        } catch (sendError) {
          console.error("[WEBHOOK] Error sending message:", sendError);
          // Log but don't fail the webhook
        }
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
