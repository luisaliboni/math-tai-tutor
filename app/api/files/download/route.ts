import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { supabaseServer } from '@/lib/supabase-server';
import { getContentType } from '@/utils/attachments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DownloadFileRequest {
  fileId: string;
  containerId: string;
  fileName: string;
  userId: string;
  conversationId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { fileId, containerId, fileName, userId, conversationId }: DownloadFileRequest = await req.json();

    if (!fileId || !containerId || !fileName || !userId) {
      return Response.json(
        { error: 'Missing required parameters: fileId, containerId, fileName, userId' },
        { status: 400 }
      );
    }

    console.log('[File Download] Downloading file from OpenAI', {
      fileId,
      containerId,
      fileName,
      userId
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Download file content from OpenAI container
    const fileContent = await openai.containers.files.content.retrieve(containerId, fileId);

    // Convert response to buffer
    const arrayBuffer = await fileContent.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[File Download] File downloaded from OpenAI', {
      fileId,
      size: buffer.length
    });

    // Upload to Supabase Storage
    const storagePath = `${userId}/${conversationId}/${fileName}`;
    const contentType = getContentType(fileName);

    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('agent-files')
      .upload(storagePath, buffer, {
        contentType: contentType,
        upsert: true // Allow re-uploading the same file
      });

    if (uploadError) {
      console.error('[File Download] Error uploading to Supabase:', uploadError);
      throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
    }

    console.log('[File Download] File uploaded to Supabase', {
      path: uploadData.path
    });

    // Generate public URL
    const { data: urlData } = supabaseServer.storage
      .from('agent-files')
      .getPublicUrl(uploadData.path);

    console.log('[File Download] Public URL generated', {
      url: urlData.publicUrl
    });

    return Response.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      fileName: fileName
    });

  } catch (error) {
    console.error('[File Download] Error:', error);

    return Response.json(
      {
        error: 'Failed to download and store file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
