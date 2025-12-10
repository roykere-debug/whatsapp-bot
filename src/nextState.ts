import { UserState, UserStateName } from "./types";

const clean = (t?: string) => (t ?? "").trim();

const yes = (t: string, arr: string[]) =>
  arr.some((a) => t.toLowerCase().includes(a.toLowerCase()));

export function nextState(
  current: UserState,
  incoming: string
): { 
  next: UserState; 
  response: string | null; 
  buttons?: Array<{ buttonId: string; buttonText: string }>;
  complete: boolean;
} {
  const text = clean(incoming);
  let next = { ...current, data: { ...current.data } };
  let response: string | null = null;
  let buttons: Array<{ buttonId: string; buttonText: string }> | undefined = undefined;
  let complete = false;

  const set = (s: UserStateName) => {
    next.state = s;
    next.updatedAt = new Date().toISOString();
  };

  // --- idle ---
  if (current.state === "idle") {
    set("waiting_order_type");
    response = "הזמנה קיימת או הזמנה חדשה?";
    buttons = [
      { buttonId: "new_order", buttonText: "הזמנה חדשה" },
      { buttonId: "existing_order", buttonText: "הזמנה קיימת" }
    ];
    return { next, response, buttons, complete };
  }

  // --- waiting_order_type ---
  if (current.state === "waiting_order_type") {
    // Handle button clicks or text input
    const isNewOrder = yes(text, ["הזמנה חדשה", "חדשה", "הזמנה חדש", "new_order"]);
    const isExistingOrder = yes(text, ["הזמנה קיימת", "קיימת", "הזמנה קיים", "existing_order"]);
    
    if (isNewOrder || text === "new_order") {
      next.data.orderType = "new";
      set("waiting_package_or_tickets");
      response = "חבילה או כרטיסים?";
      buttons = [
        { buttonId: "tickets", buttonText: "כרטיסים" },
        { buttonId: "package", buttonText: "חבילה" }
      ];
      return { next, response, buttons, complete };
    }
    if (isExistingOrder || text === "existing_order") {
      next.data.orderType = "existing";
      set("waiting_urgency_general");
      response = "דחוף או לא דחוף?";
      buttons = [
        { buttonId: "urgent", buttonText: "דחוף" },
        { buttonId: "not_urgent", buttonText: "לא דחוף" }
      ];
      return { next, response, buttons, complete };
    }
    response = "תכתוב 'הזמנה קיימת' או 'הזמנה חדשה', או לחץ על אחד הכפתורים";
    buttons = [
      { buttonId: "new_order", buttonText: "הזמנה חדשה" },
      { buttonId: "existing_order", buttonText: "הזמנה קיימת" }
    ];
    return { next, response, buttons, complete };
  }

  // --- waiting_package_or_tickets ---
  if (current.state === "waiting_package_or_tickets") {
    // Handle button clicks or text input
    const isTickets = yes(text, ["כרטיסים", "כרטיס"]) || text === "tickets";
    const isPackage = yes(text, ["חבילה", "חבילות"]) || text === "package";
    
    if (isTickets) {
      next.data.requestType = "tickets";
      set("waiting_tickets_game");
      response = "עבור איזה משחק וכמה כרטיסים?";
      return { next, response, complete };
    }
    if (isPackage) {
      next.data.requestType = "package";
      set("waiting_package_details");
      response = "אני צריך את הפרטים הבאים:\n• שם המשחק/משחקים\n• מספר אנשים\n• מספר טלפון\n• דגשים והעדפות\n\nתתחיל עם שם המשחק/משחקים:";
      return { next, response, complete };
    }
    response = "תכתוב 'חבילה' או 'כרטיסים', או לחץ על אחד הכפתורים";
    buttons = [
      { buttonId: "tickets", buttonText: "כרטיסים" },
      { buttonId: "package", buttonText: "חבילה" }
    ];
    return { next, response, buttons, complete };
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
    // Normalize text for comparison (remove extra spaces, trim)
    const normalizedText = text.replace(/\s+/g, " ").trim();
    
    // Handle button clicks - buttonText comes as the text, not buttonId
    // Check for exact button text matches first
    if (normalizedText === "דחוף" || normalizedText === "urgent" || text === "urgent") {
      next.data.isUrgent = true;
      set("done");
      complete = true;
      response = "מספר טלפון חירום: 0535515522";
      return { next, response, complete };
    }
    
    if (normalizedText === "לא דחוף" || normalizedText === "not_urgent" || text === "not_urgent") {
      next.data.isUrgent = false;
      set("waiting_general_request");
      response = "תשאיר כאן את הבקשה ופרטים, נחזור אליך בהקדם";
      return { next, response, complete };
    }
    
    // Handle text input (partial matches)
    const isUrgent = yes(text, ["דחוף", "דחוף מאוד", "חירום"]);
    const isNotUrgent = yes(text, ["לא דחוף", "יכול לחכות", "רגיל", "לא"]) && 
                        !yes(text, ["דחוף"]);
    
    if (isUrgent && !isNotUrgent) {
      next.data.isUrgent = true;
      set("done");
      complete = true;
      response = "מספר טלפון חירום: 0535515522";
      return { next, response, complete };
    }
    if (isNotUrgent) {
      next.data.isUrgent = false;
      set("waiting_general_request");
      response = "תשאיר כאן את הבקשה ופרטים, נחזור אליך בהקדם";
      return { next, response, complete };
    }
    response = "תכתוב 'דחוף' או 'לא דחוף', או לחץ על אחד הכפתורים";
    buttons = [
      { buttonId: "urgent", buttonText: "דחוף" },
      { buttonId: "not_urgent", buttonText: "לא דחוף" }
    ];
    return { next, response, buttons, complete };
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
