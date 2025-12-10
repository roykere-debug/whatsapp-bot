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
}

export type UserStateName =
  | "idle"
  | "waiting_client_type"
  | "waiting_urgency"
  | "waiting_game"
  | "waiting_amount"
  | "waiting_phone"
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
