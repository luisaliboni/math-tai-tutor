import { NextRequest, NextResponse } from 'next/server';
import { storeApproval, checkApproval } from '@/lib/approval-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { approvalId, approved, userId, conversationId } = await req.json();

    if (!approvalId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing approvalId or approved status' },
        { status: 400 }
      );
    }

    // Store the approval response
    storeApproval(approvalId, approved);
    console.log('[Approval API] Stored approval response:', { approvalId, approved });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Approval API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const approvalId = searchParams.get('approvalId');

    if (!approvalId) {
      return NextResponse.json(
        { error: 'Missing approvalId' },
        { status: 400 }
      );
    }

    const approved = checkApproval(approvalId);

    if (approved === null) {
      return NextResponse.json(
        { approved: null, message: 'Approval not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({ approved });
  } catch (error: any) {
    console.error('[Approval API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get approval' },
      { status: 500 }
    );
  }
}

