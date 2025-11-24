/**
 * API service for chat operations
 */

import { ChatHistoryItem } from '@/types';

const API_BASE = '/api/chat-history';

export async function getChatHistory(
  userId: string,
  conversationId?: string
): Promise<ChatHistoryItem[]> {
  const url = conversationId
    ? `${API_BASE}?userId=${userId}&conversationId=${conversationId}`
    : `${API_BASE}?userId=${userId}`;
  
  const response = await fetch(url);
  const data = await response.json();
  return data.history || [];
}

