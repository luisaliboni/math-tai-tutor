/**
 * Shared TypeScript types and interfaces
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  created_at?: string;
  user_id?: string;
}

export interface ChatHistoryItem {
  id: string;
  user_id: string;
  conversation_id: string | null;
  message: string;
  role: 'user' | 'assistant';
  created_at: string;
}

export interface UploadedFileInfo {
  name: string;
  id: string;
}

export interface FileInfo {
  id: string;
  path: string;
  containerId: string;
  fileName: string;
}

export interface Attachment {
  name: string;
  url: string;
  contentType?: string;
  isImage: boolean;
}

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'done'; message: string; output?: any; files?: FileInfo[]; containerId?: string }
  | { type: 'error'; message: string };
