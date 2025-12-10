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
    set("waiting_order_type");
    response = "הזמנה קיימת או הזמנה חדשה?";
    return { next, response, complete };
  }

  // --- waiting_order_type ---
  if (current.state === "waiting_order_type") {
    if (yes(text, ["הזמנה חדשה", "חדשה", "הזמנה חדש"])) {
      next.data.orderType = "new";
      set("waiting_package_or_tickets");
      response = "חבילה או כרטיסים?";
      return { next, response, complete };
    }
    if (yes(text, ["הזמנה קיימת", "קיימת", "הזמנה קיים"])) {
      next.data.orderType = "existing";
      set("waiting_urgency_general");
      response = "דחוף או לא דחוף?";
      return { next, response, complete };
    }
    response = "תכתוב 'הזמנה קיימת' או 'הזמנה חדשה'";
    return { next, response, complete };
  }

  // --- waiting_package_or_tickets ---
  if (current.state === "waiting_package_or_tickets") {
    if (yes(text, ["כרטיסים", "כרטיס"])) {
      next.data.requestType = "tickets";
      set("waiting_tickets_game");
      response = "עבור איזה משחק וכמה כרטיסים?";
      return { next, response, complete };
    }
    if (yes(text, ["חבילה", "חבילות"])) {
      next.data.requestType = "package";
      set("waiting_package_details");
      response = "אני צריך את הפרטים הבאים:\n• שם המשחק/משחקים\n• מספר אנשים\n• מספר טלפון\n• דגשים והעדפות\n\nתתחיל עם שם המשחק/משחקים:";
      return { next, response, complete };
    }
    response = "תכתוב 'חבילה' או 'כרטיסים'";
    return { next, response, complete };
  }

  // --- waiting_tickets_game ---
  if (current.state === "waiting_tickets_game") {
    // נסה לחלץ משחק וכמות מהטקסט
    const gameMatch = text.match(/(.+?)(?:\s+)?(\d+)/);
    if (gameMatch) {
      next.data.ticketsGame = gameMatch[1].trim();
      const amount = parseInt(gameMatch[2]);
      if (amount > 0) {
        next.data.ticketsAmount = amount;
        set("done");
        complete = true;
        response = 
          `מצוין! עבור ${next.data.ticketsGame}, ${amount} כרטיסים.\n\n` +
          `קישור לאתר: https://arenatickets.co.il/ref/2/\n\n` +
          `הסבר: תבחר את המשחק שאתה רוצה ולהבהיר שברגע שאחזור אליך תקבל קוד קופון.`;
        return { next, response, complete };
      }
    }
    // אם לא הצלחנו לחלץ, נשאל רק על המשחק
    next.data.ticketsGame = text;
    set("waiting_tickets_amount");
    response = "כמה כרטיסים?";
    return { next, response, complete };
  }

  // --- waiting_tickets_amount ---
  if (current.state === "waiting_tickets_amount") {
    const amount = parseInt(text.replace(/[^\d]/g, ""));
    if (!amount || amount <= 0) {
      response = "תכתוב מספר כרטיסים (למשל: 2)";
      return { next, response, complete };
    }
    next.data.ticketsAmount = amount;
    set("done");
    complete = true;
    response = 
      `מצוין! עבור ${next.data.ticketsGame}, ${amount} כרטיסים.\n\n` +
      `קישור לאתר: https://arenatickets.co.il/ref/2/\n\n` +
      `הסבר: תבחר את המשחק שאתה רוצה ולהבהיר שברגע שאחזור אליך תקבל קוד קופון.`;
    return { next, response, complete };
  }

  // --- waiting_package_details ---
  if (current.state === "waiting_package_details") {
    // נבדוק מה כבר יש לנו
    const hasGames = !!next.data.packageGames;
    const hasPeople = !!next.data.packagePeople;
    const hasPhone = !!next.data.phoneNumber;
    const hasNotes = !!next.data.packageNotes;

    if (!hasGames) {
      // אוספים שם משחק/משחקים
      next.data.packageGames = text;
      response = "כמה אנשים?";
      return { next, response, complete };
    }

    if (!hasPeople) {
      // אוספים מספר אנשים
      next.data.packagePeople = text;
      response = "מה מספר הטלפון?";
      return { next, response, complete };
    }

    if (!hasPhone) {
      // אוספים מספר טלפון
      const digits = text.replace(/[^\d]/g, "");
      if (digits.length < 8) {
        response = "מספר לא תקין, תנסה שוב";
        return { next, response, complete };
      }
      next.data.phoneNumber = digits;
      response = "יש דגשים או העדפות? (אם לא, כתוב 'אין')";
      return { next, response, complete };
    }

    if (!hasNotes) {
      // אוספים דגשים והעדפות
      next.data.packageNotes = text === "אין" ? "" : text;
      set("done");
      complete = true;
      response = 
        `סיכום החבילה:\n` +
        `• משחק/משחקים: ${next.data.packageGames}\n` +
        `• מספר אנשים: ${next.data.packagePeople}\n` +
        `• טלפון: ${next.data.phoneNumber}\n` +
        (next.data.packageNotes ? `• דגשים: ${next.data.packageNotes}\n` : ``) +
        `\nתודה! נחזור אליך בהקדם 💪`;
      return { next, response, complete };
    }
  }

  // --- waiting_urgency_general ---
  if (current.state === "waiting_urgency_general") {
    if (yes(text, ["דחוף", "דחוף מאוד", "חירום"])) {
      next.data.isUrgent = true;
      set("done");
      complete = true;
      response = "מספר טלפון חירום: 0535515522";
      return { next, response, complete };
    }
    if (yes(text, ["לא דחוף", "יכול לחכות", "לא", "רגיל"])) {
      next.data.isUrgent = false;
      set("waiting_general_request");
      response = "תשאיר כאן את הבקשה ופרטים, נחזור אליך בהקדם";
      return { next, response, complete };
    }
    response = "תכתוב 'דחוף' או 'לא דחוף'";
    return { next, response, complete };
  }

  // --- waiting_general_request ---
  if (current.state === "waiting_general_request") {
    next.data.generalRequest = text;
    set("done");
    complete = true;
    response = "תודה! קיבלנו את הפרטים שלך, נחזור אליך בהקדם 👍";
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
