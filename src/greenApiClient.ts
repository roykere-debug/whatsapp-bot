import axios, { AxiosInstance } from 'axios';
import type { GreenApiConfig, Message, SendMessageResponse, SendButtonsRequest } from './types';

// Singleton client instance
let clientInstance: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!clientInstance) {
    console.log("[GREEN_API] Initializing Green API client...");
    const idInstance = process.env.GREEN_API_INSTANCE_ID;
    const apiTokenInstance = process.env.GREEN_API_TOKEN;

    if (!idInstance || !apiTokenInstance) {
      console.error("[GREEN_API] ❌ Missing credentials");
      throw new Error('Missing GREEN_API_INSTANCE_ID or GREEN_API_TOKEN');
    }

    // Use the standard Green API base URL (no subdomain needed)
    const baseUrl = 'https://api.green-api.com';
    const apiUrl = `${baseUrl}/waInstance${idInstance}`;
    
    console.log("[GREEN_API] Base URL:", apiUrl);
    console.log("[GREEN_API] Instance ID:", idInstance);
    console.log("[GREEN_API] Token:", apiTokenInstance ? "✅ Set" : "❌ Missing");
    
    clientInstance = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests as query parameter
    clientInstance.interceptors.request.use((request) => {
      if (request.url) {
        // Check if token is already in URL
        if (!request.url.includes('token=') && !request.url.includes(`/${apiTokenInstance}`)) {
          request.url += (request.url.includes('?') ? '&' : '?') + `token=${apiTokenInstance}`;
        }
      }
      console.log("[GREEN_API] Making request to:", request.url);
      return request;
    });
    
    console.log("[GREEN_API] ✅ Client initialized");
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
  console.log("[GREEN_API] sendMessage called");
  console.log("[GREEN_API] chatId:", chatId);
  console.log("[GREEN_API] message length:", message.length);
  try {
    const idInstance = process.env.GREEN_API_INSTANCE_ID;
    const apiTokenInstance = process.env.GREEN_API_TOKEN;
    
    if (!idInstance || !apiTokenInstance) {
      throw new Error('Missing GREEN_API_INSTANCE_ID or GREEN_API_TOKEN');
    }

    // Use the standard Green API format: /sendMessage/{token}
    const baseUrl = 'https://api.green-api.com';
    const url = `${baseUrl}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    
    console.log("[GREEN_API] Sending POST to:", url);
    const response = await axios.post<SendMessageResponse>(url, {
      chatId,
      message,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log("[GREEN_API] ✅ Message sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("[GREEN_API] ❌ Error sending message:", error);
    if (axios.isAxiosError(error)) {
      console.error("[GREEN_API] Response status:", error.response?.status);
      console.error("[GREEN_API] Response data:", error.response?.data);
      throw new Error(
        `Failed to send message: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Send a message with interactive buttons
 */
export async function sendButtons(
  chatId: string,
  message: string,
  buttons: Array<{ buttonId: string; buttonText: string }>,
  footer?: string
): Promise<SendMessageResponse> {
  console.log("[GREEN_API] sendButtons called");
  console.log("[GREEN_API] chatId:", chatId);
  console.log("[GREEN_API] message:", message);
  console.log("[GREEN_API] buttons count:", buttons.length);
  try {
    const idInstance = process.env.GREEN_API_INSTANCE_ID;
    const apiTokenInstance = process.env.GREEN_API_TOKEN;
    
    if (!idInstance || !apiTokenInstance) {
      throw new Error('Missing GREEN_API_INSTANCE_ID or GREEN_API_TOKEN');
    }

    // Use the standard Green API format: /SendButtons/{token}
    const baseUrl = 'https://api.green-api.com';
    const url = `${baseUrl}/waInstance${idInstance}/SendButtons/${apiTokenInstance}`;
    
    const requestBody: SendButtonsRequest = {
      chatId,
      message,
      buttons,
    };
    
    if (footer) {
      requestBody.footer = footer;
    }
    
    console.log("[GREEN_API] Sending POST to:", url);
    console.log("[GREEN_API] Request body:", JSON.stringify(requestBody, null, 2));
    const response = await axios.post<SendMessageResponse>(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log("[GREEN_API] ✅ Buttons sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("[GREEN_API] ❌ Error sending buttons:", error);
    if (axios.isAxiosError(error)) {
      console.error("[GREEN_API] Response status:", error.response?.status);
      console.error("[GREEN_API] Response data:", error.response?.data);
      // Fallback to regular message if buttons fail
      console.log("[GREEN_API] Falling back to regular message...");
      return sendMessage(chatId, `${message}\n\n${buttons.map((b, i) => `${i + 1}. ${b.buttonText}`).join('\n')}`);
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
    // Use the standard Green API base URL (no subdomain needed)
    const baseUrl = 'https://api.green-api.com';
    
    this.client = axios.create({
      baseURL: `${baseUrl}/waInstance${config.idInstance}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests as query parameter
    this.client.interceptors.request.use((request) => {
      if (request.url) {
        // Check if token is already in URL
        if (!request.url.includes('token=') && !request.url.includes(`/${config.apiTokenInstance}`)) {
          request.url += (request.url.includes('?') ? '&' : '?') + `token=${config.apiTokenInstance}`;
        }
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
      // Use the standard Green API format: /sendMessage/{token}
      const url = `/sendMessage/${this.config.apiTokenInstance}`;
      const response = await this.client.post<SendMessageResponse>(
        url,
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
