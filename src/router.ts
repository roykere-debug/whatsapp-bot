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
  const body = req.body as GreenWebhookBody;

  const chatId = body.senderData?.chatId || "";
  const sender = body.senderData?.sender || "";

  const expectedChatId = `${TEST}@c.us`;

  // SAFE MODE — ONLY YOU
  const isYou =
    chatId === expectedChatId &&
    !chatId.includes("-") &&
    sender === TEST;

  if (!isYou) {
    console.log("[SAFE] ignored:", chatId, sender);
    return res.json({ ok: true, ignored: true });
  }

  const text = getText(body);
  if (!text) return res.json({ ok: true });

  const state = await getUserState(TEST);
  const result = nextState(state, text);

  await upsertUserState(result.next);

  if (result.complete && result.next.data.game && result.next.data.amount) {
    await insertLead({
      phone: result.next.data.phoneNumber!,
      game: result.next.data.game!,
      amount: result.next.data.amount!,
      isUrgent: !!result.next.data.isUrgent,
      isNewCustomer: !!result.next.data.isNewCustomer,
      raw: body
    });
  }

  if (result.response) {
    await sendMessage(expectedChatId, result.response);
  }

  res.json({ ok: true });
}
