import axios, { AxiosInstance } from 'axios';
import type { GreenApiConfig, Message, SendMessageResponse } from './types';

// Singleton client instance
let clientInstance: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!clientInstance) {
    const idInstance = process.env.GREEN_API_INSTANCE_ID;
    const apiTokenInstance = process.env.GREEN_API_TOKEN;

    if (!idInstance || !apiTokenInstance) {
      throw new Error('Missing GREEN_API_INSTANCE_ID or GREEN_API_TOKEN');
    }

    const baseUrl = 'https://api.green-api.com';
    clientInstance = axios.create({
      baseURL: `${baseUrl}/waInstance${idInstance}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    clientInstance.interceptors.request.use((request) => {
      if (request.url) {
        request.url += `?token=${apiTokenInstance}`;
      }
      return request;
    });
  }
  return clientInstance;
}

/**
 * Send a text message to a chat
 */
export async function sendMessage(
  chatId: string,
  message: string
): Promise<SendMessageResponse> {
  try {
    const client = getClient();
    const response = await client.post<SendMessageResponse>('/sendMessage', {
      chatId,
      message,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to send message: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Client for interacting with Green API (legacy class-based approach)
 */
export class GreenApiClient {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://api.green-api.com';

  constructor(private config: GreenApiConfig) {
    this.client = axios.create({
      baseURL: `${this.baseUrl}/waInstance${config.idInstance}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((request) => {
      if (request.url) {
        request.url += `?token=${config.apiTokenInstance}`;
      }
      return request;
    });
  }

  /**
   * Send a text message to a chat
   */
  async sendMessage(
    chatId: string,
    message: string
  ): Promise<SendMessageResponse> {
    try {
      const response = await this.client.post<SendMessageResponse>(
        '/sendMessage',
        {
          chatId,
          message,
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to send message: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get incoming notification (used for polling)
   */
  async receiveNotification(): Promise<{
    receiptId: number;
    body: {
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
    };
  } | null> {
    try {
      const response = await this.client.get('/receiveNotification');
      
      if (!response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // 404 means no notifications, which is normal
        if (error.response?.status === 404) {
          return null;
        }
        throw new Error(
          `Failed to receive notification: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Delete notification after processing
   */
  async deleteNotification(receiptId: number): Promise<void> {
    try {
      await this.client.delete(`/deleteNotification/${receiptId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to delete notification: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get account state
   */
  async getStateInstance(): Promise<{
    stateInstance: 'notAuthorized' | 'authorized' | 'blocked' | 'sleepMode' | 'starting';
  }> {
    try {
      const response = await this.client.get('/getStateInstance');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get state: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Convert webhook payload to Message format
   * Supports both full WebhookPayload and simplified GreenWebhookBody
   */
  parseWebhookMessage(webhookData: {
    senderData?: {
      chatId?: string;
      sender?: string;
      senderName?: string;
    };
    messageData?: {
      typeMessage?: string;
      textMessageData?: {
        textMessage?: string;
      };
      extendedTextMessageData?: {
        text?: string;
      };
    };
    timestamp?: number;
    idMessage?: string;
  }): Message | null {
    if (!webhookData.senderData || !webhookData.messageData) {
      return null;
    }

    const chatId = webhookData.senderData.chatId;
    if (!chatId) {
      return null;
    }

    const textMessage =
      webhookData.messageData.textMessageData?.textMessage ||
      webhookData.messageData.extendedTextMessageData?.text;

    if (!textMessage) {
      return null;
    }

    return {
      typeMessage: webhookData.messageData.typeMessage || 'textMessage',
      textMessageData: {
        textMessage,
      },
      chatId,
      senderName: webhookData.senderData.senderName,
      sender: webhookData.senderData.sender,
      timestamp: webhookData.timestamp || Date.now(),
      idMessage: webhookData.idMessage,
    };
  }
}
