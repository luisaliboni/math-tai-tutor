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
    const contentType = getContentType(filename);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
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

