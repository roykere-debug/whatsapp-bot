/**
 * Type definitions for WhatsApp bot
 */

export interface GreenApiConfig {
  idInstance: string;
  apiTokenInstance: string;
}

export interface Message {
  typeMessage: string;
  textMessageData?: {
    textMessage: string;
  };
  chatId: string;
  senderName?: string;
  sender?: string;
  timestamp: number;
  idMessage?: string;
}

export interface WebhookPayload {
  typeWebhook: string;
  instanceData?: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp: number;
  idMessage?: string;
  senderData?: {
    chatId: string;
    chatName: string;
    sender: string;
    senderName: string;
  };
  messageData?: {
    typeMessage: string;
    textMessageData?: {
      textMessage: string;
    };
    extendedTextMessageData?: {
      text: string;
    };
  };
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface Button {
  buttonId: string;
  buttonText: string;
}

export interface SendButtonsRequest {
  chatId: string;
  message: string;
  footer?: string;
  buttons: Button[];
}

// Legacy types for backwards compatibility
export interface ConversationState {
  chatId: string;
  state: string;
  context?: Record<string, unknown>;
  lastActivity: number;
}

// New ticket system types
export interface UserStateData {
  isNewCustomer?: boolean;
  isUrgent?: boolean;
  game?: string;
  amount?: number;
  phoneNumber?: string;
  // New flow data
  orderType?: "existing" | "new"; // הזמנה קיימת או הזמנה חדשה
  requestType?: "package" | "tickets" | "general"; // חבילה, כרטיסים, או בקשה כללית
  ticketsGame?: string; // עבור איזה משחק (כרטיסים)
  ticketsAmount?: number; // כמה כרטיסים
  packageGames?: string; // שם המשחק/משחקים (חבילה)
  packagePeople?: string; // אנשים (חבילה)
  packageNotes?: string; // דגשים והעדפות (חבילה)
  generalRequest?: string; // פרטי הבקשה הכללית
}

export type UserStateName =
  | "idle"
  | "waiting_order_type" // הזמנה קיימת או הזמנה חדשה
  | "waiting_package_or_tickets" // חבילה או כרטיסים
  | "waiting_tickets_game" // עבור איזה משחק (כרטיסים)
  | "waiting_tickets_amount" // כמה כרטיסים
  | "waiting_package_details" // פרטי חבילה (משחק, אנשים, טלפון, הערות)
  | "waiting_urgency_general" // דחוף או לא דחוף (בקשה כללית)
  | "waiting_general_request" // פרטי הבקשה (לא דחוף)
  | "done";

export interface UserState {
  phone: string;
  state: UserStateName;
  data: UserStateData;
  updatedAt: string;
}

export interface GreenWebhookBody {
  senderData?: {
    chatId?: string;
    sender?: string;
  };
  messageData?: {
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
    buttonTextData?: { buttonText?: string };
  };
}

export interface StateContext {
  chatId: string;
  userName?: string;
  collectedData?: Record<string, unknown>;
  messageHistory?: Message[];
}

export interface RouteHandler {
  (message: Message, state: ConversationState | UserState): Promise<void>;
}
