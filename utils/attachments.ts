/**
 * Attachment helper functions
 */

import { Attachment } from '@/types';

/**
 * Determine content type based on file extension
 */
export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'csv': 'text/csv',
    'json': 'application/json',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'py': 'text/x-python',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'html': 'text/html',
    'css': 'text/css'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file is an image based on extension
 */
export function isImageFile(filename: string): boolean {
  const contentType = getContentType(filename);
  return contentType.startsWith('image/');
}

/**
 * Format Markdown for an attachment
 * Files -> [Name](url)
 * Images -> ![Name](url) with download link
 */
export function formatAttachmentMarkdown(filename: string, url: string): string {
  if (isImageFile(filename)) {
    // For images, show both the image (inline) and a download link (with download=true)
    const downloadUrl = url.includes('?') ? `${url}&download=true` : `${url}?download=true`;
    return `\n\n![${filename}](${url})\n\n[Download ${filename}](${downloadUrl})\n`;
  }
  return `\n\n[📄 ${filename}](${url})\n`;
}

