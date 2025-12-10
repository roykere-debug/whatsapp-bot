import { UserState, UserStateName } from "./types";

const clean = (t?: string) => (t ?? "").trim();

const yes = (t: string, arr: string[]) =>
  arr.some((a) => t.toLowerCase().includes(a.toLowerCase()));

export function nextState(
  current: UserState,
  incoming: string
): { next: UserState; response: string | null; complete: boolean } {
  const text = clean(incoming);
  let next = { ...current, data: { ...current.data } };
  let response: string | null = null;
  let complete = false;

  const set = (s: UserStateName) => {
    next.state = s;
    next.updatedAt = new Date().toISOString();
  };

  // --- idle ---
  if (current.state === "idle") {
    set("waiting_client_type");
    response = "היי! אתה לקוח חדש או לקוח קיים?";
    return { next, response, complete };
  }

  // --- waiting_client_type ---
  if (current.state === "waiting_client_type") {
    if (yes(text, ["לקוח חדש"])) {
      next.data.isNewCustomer = true;
      set("waiting_urgency");
      response = "האם זה דחוף או יכול לחכות?";
      return { next, response, complete };
    }
    if (yes(text, ["לקוח קיים"])) {
      next.data.isNewCustomer = false;
      set("waiting_urgency");
      response = "דחוף או יכול לחכות?";
      return { next, response, complete };
    }
    response = "תכתוב 'לקוח חדש' או 'לקוח קיים'";
    return { next, response, complete };
  }

  // --- waiting_urgency ---
  if (current.state === "waiting_urgency") {
    if (yes(text, ["דחוף"])) {
      next.data.isUrgent = true;
      set("waiting_game");
      response = "על איזה משחק אתה צריך כרטיסים?";
      return { next, response, complete };
    }
    if (yes(text, ["יכול לחכות", "לא דחוף"])) {
      next.data.isUrgent = false;
      set("waiting_game");
      response = "סבבה! איזה משחק?";
      return { next, response, complete };
    }
    response = "רשום 'דחוף' או 'יכול לחכות'";
    return { next, response, complete };
  }

  // --- waiting_game ---
  if (current.state === "waiting_game") {
    next.data.game = text;
    set("waiting_amount");
    response = "כמה כרטיסים אתה צריך?";
    return { next, response, complete };
  }

  // --- waiting_amount ---
  if (current.state === "waiting_amount") {
    const amt = parseInt(text.replace(/[^\d]/g, ""));
    if (!amt) {
      response = "רשום מספר כרטיסים (למשל 2)";
      return { next, response, complete };
    }
    next.data.amount = amt;
    set("waiting_phone");
    response = "מה מספר הטלפון לחזרה?";
    return { next, response, complete };
  }

  // --- waiting_phone ---
  if (current.state === "waiting_phone") {
    const digits = text.replace(/[^\d]/g, "");
    if (digits.length < 8) {
      response = "מספר לא תקין, תנסה שוב";
      return { next, response, complete };
    }

    next.data.phoneNumber = digits;
    set("done");
    complete = true;

    response =
      `סיכום:\n` +
      `• חדש? ${next.data.isNewCustomer ? "כן" : "לא"}\n` +
      `• דחוף? ${next.data.isUrgent ? "כן" : "לא"}\n` +
      `• משחק: ${next.data.game}\n` +
      `• כמות: ${next.data.amount}\n` +
      `• טלפון: ${next.data.phoneNumber}\n\n` +
      `מושלם! אני מטפל בזה 💪`;

    return { next, response, complete };
  }

  // --- done ---
  if (current.state === "done") {
    set("idle");
    next.data = {};
    response = "צריך משהו נוסף? תכתוב לי 🙂";
    return { next, response, complete };
  }

  // fallback
  set("idle");
  next.data = {};
  response = "התחלתי מחדש את התהליך 🙂";
  return { next, response, complete };
}

