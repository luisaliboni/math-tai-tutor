import { NextRequest } from 'next/server';
import { createWorkflowStream } from '@/agents/workflow';
import { createWorkflowStreamWithFiles } from '@/agents/workflow-stream';
import { adaptAgentStream } from '@/lib/stream-adapter';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message, userId, conversationId, fileIds } = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Message and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save user message to database
    console.log('[CHAT API] Saving user message to database');
    console.log('[CHAT API] userId:', userId);
    console.log('[CHAT API] conversationId:', conversationId);
    console.log('[CHAT API] message:', message);
    console.log('[CHAT API] fileIds:', fileIds);

    const { error: userMsgError } = await supabaseServer.from('chat_history').insert({
      user_id: userId,
      conversation_id: conversationId,
      message: message,
      role: 'user'
    });

    if (userMsgError) {
      console.error('[CHAT API] Error saving user message:', userMsgError);
    } else {
      console.log('[CHAT API] User message saved successfully');
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    let fullMessage = '';
    let finalOutput: any = null;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[API] Starting workflow stream for message:', message);
          console.log('[API] File IDs:', fileIds);

          // Get the streamed result from the workflow
          // Use the file-enabled workflow if files are provided
          const streamedResult = fileIds && fileIds.length > 0
            ? await createWorkflowStreamWithFiles({ input_as_text: message, file_ids: fileIds })
            : await createWorkflowStream({ input_as_text: message });
          console.log('[API] Got streamedResult');

          // Use the adapter to handle the stream events
          const adaptedStream = adaptAgentStream(
            streamedResult,
            (output) => output.message // Extract message from the final output
          );
          console.log('[API] Created adapted stream');

          // Stream the agent workflow
          for await (const chunk of adaptedStream) {
            console.log('[API] Received chunk:', chunk.type);

            if (chunk.type === 'text') {
              fullMessage += chunk.content;
              // Send text chunk as SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`)
              );
            } else if (chunk.type === 'done') {
              finalOutput = chunk.output;
              fullMessage = chunk.message;
              console.log('[API] Stream done, final message:', fullMessage);
              // Send done event
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', message: fullMessage })}\n\n`)
              );
            } else if (chunk.type === 'error') {
              throw new Error(chunk.message);
            }
          }

          console.log('[API] Finished streaming');

          // Save agent response to database
          console.log('[CHAT API] Saving assistant message to database');
          console.log('[CHAT API] fullMessage:', fullMessage);
          console.log('[CHAT API] conversationId:', conversationId);

          const { error: assistantMsgError } = await supabaseServer.from('chat_history').insert({
            user_id: userId,
            conversation_id: conversationId,
            message: fullMessage,
            role: 'assistant'
          });

          if (assistantMsgError) {
            console.error('[CHAT API] Error saving assistant message:', assistantMsgError);
          } else {
            console.log('[CHAT API] Assistant message saved successfully');
          }

          // Update conversation's updated_at timestamp
          if (conversationId) {
            await supabaseServer
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId);
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process message' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
