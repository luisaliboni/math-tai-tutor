import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const conversationId = req.nextUrl.searchParams.get('conversationId');

    console.log('\n========================================');
    console.log('[CHAT HISTORY API] Request received');
    console.log('[CHAT HISTORY API] userId:', userId);
    console.log('[CHAT HISTORY API] conversationId:', conversationId);

    if (!userId) {
      console.log('[CHAT HISTORY API] ERROR: Missing userId');
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabaseServer
      .from('chat_history')
      .select('*')
      .eq('user_id', userId);

    // Filter by conversation if provided
    if (conversationId) {
      console.log('[CHAT HISTORY API] Filtering by conversationId:', conversationId);
      query = query.eq('conversation_id', conversationId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.log('[CHAT HISTORY API] Database error:', error);
      throw error;
    }

    console.log('[CHAT HISTORY API] Found', data?.length || 0, 'messages');
    if (data && data.length > 0) {
      console.log('[CHAT HISTORY API] First message:', data[0]);
      console.log('[CHAT HISTORY API] Last message:', data[data.length - 1]);
    }
    console.log('========================================\n');

    return NextResponse.json({ history: data });
  } catch (error) {
    console.error('[CHAT HISTORY API] ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
