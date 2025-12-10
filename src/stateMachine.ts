import type {
  UserState,
  Message,
} from './types';
import type { GreenApiClient } from './greenApiClient';
import { upsertUserState, insertLead } from './db';
import { nextState } from './nextState';

/**
 * State machine for managing ticket creation flow
 */
export class BotStateMachine {
  constructor(private apiClient: GreenApiClient) {}

  /**
   * Process incoming message and update state accordingly
   */
  async processMessage(
    message: Message,
    currentState: UserState | null
  ): Promise<void> {
    const phone = this.extractPhoneFromChatId(message.chatId);
    const state = currentState || {
      phone,
      state: 'idle',
      data: {},
      updatedAt: new Date().toISOString(),
    };

    const text = message.textMessageData?.textMessage || '';

    // Get next state and response
    const { next, response, complete } = nextState(state, text);

    // Save the new state
    await upsertUserState(next);

    // Send response if there is one
    if (response) {
      await this.apiClient.sendMessage(message.chatId, response);
    }

    // If complete, insert lead into database
    if (complete && next.state === 'done') {
      try {
        // For tickets requests
        if (next.data.requestType === "tickets" && next.data.ticketsGame && next.data.ticketsAmount) {
          await insertLead({
            phone: next.phone,
            game: next.data.ticketsGame,
            amount: next.data.ticketsAmount,
            isUrgent: false,
            isNewCustomer: next.data.orderType === "new",
            raw: { ...next.data, type: "tickets" },
          });
        }
        // For package requests
        else if (next.data.requestType === "package" && next.data.packageGames && next.data.phoneNumber) {
          await insertLead({
            phone: next.data.phoneNumber,
            game: next.data.packageGames,
            amount: parseInt(next.data.packagePeople || "1") || 1,
            isUrgent: false,
            isNewCustomer: next.data.orderType === "new",
            raw: { ...next.data, type: "package" },
          });
        }
        // For general requests
        else if (next.data.generalRequest || (next.data.isUrgent && next.data.orderType === "existing")) {
          await insertLead({
            phone: next.phone,
            game: next.data.generalRequest || "בקשה כללית",
            amount: 0,
            isUrgent: !!next.data.isUrgent,
            isNewCustomer: false,
            raw: { ...next.data, type: "general" },
          });
        }
      } catch (error) {
        console.error('Error inserting lead:', error);
      }
    }
  }

  /**
   * Extract phone number from chatId (format: "972549762201@c.us")
   */
  private extractPhoneFromChatId(chatId: string): string {
    return chatId.split('@')[0];
  }
}
