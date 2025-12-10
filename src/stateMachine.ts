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
        await insertLead({
          phone: next.phone,
          game: next.data.game || '',
          amount: next.data.amount || 0,
          isUrgent: next.data.isUrgent || false,
          isNewCustomer: next.data.isNewCustomer || false,
          raw: next.data,
        });
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
