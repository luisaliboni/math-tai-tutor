/**
 * API service for file operations
 */

export interface UploadFileResponse {
  fileId: string;
  filename: string;
  bytes: number;
}

export async function uploadFile(file: File): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload file');
  }

  return response.json();
}

export interface DownloadFileRequest {
  fileId: string;
  containerId: string;
  fileName: string;
  userId: string;
  conversationId: string;
}

export interface DownloadFileResponse {
  success: boolean;
  url: string;
  path: string;
  fileName: string;
}

export async function downloadAndStoreFile(
  request: DownloadFileRequest
): Promise<DownloadFileResponse> {
  const response = await fetch('/api/files/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to download file');
  }

  return response.json();
}

