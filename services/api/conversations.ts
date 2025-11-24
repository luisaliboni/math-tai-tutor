/**
 * API service for conversation management
 */

import { Conversation } from '@/types';

const API_BASE = '/api/conversations';

export async function getConversations(userId: string): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE}?userId=${userId}`);
  const data = await response.json();
  return data.conversations || [];
}

export async function createConversation(
  userId: string,
  title: string
): Promise<Conversation> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title }),
  });
  const data = await response.json();
  if (!data.conversation) {
    throw new Error('Failed to create conversation');
  }
  return data.conversation;
}

export async function updateConversation(
  conversationId: string,
  title: string
): Promise<void> {
  const response = await fetch(API_BASE, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, title }),
  });
  if (!response.ok) {
    throw new Error('Failed to update conversation');
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}?conversationId=${conversationId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete conversation');
  }
}

