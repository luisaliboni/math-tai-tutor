import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getContentType } from '@/utils/attachments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AGENT_FILES_BUCKET = 'agent-files';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    const fallbackName = path?.split('/').pop() || 'download.txt';
    const filename = searchParams.get('filename') || fallbackName;
    const forceDownload = searchParams.get('download') === 'true';

    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing required query parameter: path' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[File Serve] Downloading from Supabase:', path);
    const { data, error } = await supabaseServer.storage
      .from(AGENT_FILES_BUCKET)
      .download(path);

    if (error || !data) {
      console.error('[File Serve] Error downloading file:', error);
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    
    // Check if file is empty
    if (buffer.length === 0) {
      console.error('[File Serve] File is empty:', path);
      return new Response(
        JSON.stringify({ error: 'File is empty' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const contentType = getContentType(filename);
    console.log('[File Serve] Serving file:', { path, filename, contentType, size: buffer.length });
    
    // Determine content disposition:
    // - If forceDownload is true, always use attachment
    // - If it's an image and not forcing download, serve inline for display
    // - Otherwise, serve as attachment for download
    const isImage = contentType.startsWith('image/');
    const contentDisposition = forceDownload || !isImage
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('[File Serve] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

