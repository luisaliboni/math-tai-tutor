import { NextRequest } from 'next/server';
import { createWorkflowStream } from '@/agents/workflow';
import { createWorkflowStreamWithFiles } from '@/agents/workflow-stream';
import { adaptAgentStream } from '@/lib/stream-adapter';
import { FileInfo } from '@/types';
import { supabaseServer } from '@/lib/supabase-server';
import OpenAI from 'openai';

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
    let files: FileInfo[] | undefined = undefined;
    let containerId: string | undefined = undefined;

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
              files = chunk.files;
              containerId = chunk.containerId;
              console.log('[API] Stream done, final message:', fullMessage);
              console.log('[API] Files detected:', files ? files.length : 0);
              console.log('[API] Container ID:', containerId);
              // NOTE: Don't send done event yet - process files first
            } else if (chunk.type === 'error') {
              throw new Error(chunk.message);
            }
          }

          console.log('[API] Finished streaming');

          // Process files if any were generated
          if (files && files.length > 0) {
            if (!containerId) {
              console.error('[API] ❌ Files detected but no containerId! Cannot download files.');
              console.error('[API] This means the OpenAI response structure may have changed.');
              console.error('[API] Files will appear as error messages to the user.');
            } else {
              console.log('[API] ⚙️ Starting file processing for', files.length, 'file(s)');

            // Initialize OpenAI client to list container files
            const openai = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY
            });

            try {
              // List all files in the container
              const containerFiles = await openai.containers.files.list(containerId);

              console.log('[API] Container files:', containerFiles.data.length);

              // Process each file reference
              for (const fileRef of files) {
                console.log('[API] 🔍 Looking for file:', fileRef.fileName, 'at path:', fileRef.path);

                // Find matching file by path/filename
                const containerFile = containerFiles.data.find(
                  (f: any) => f.path === fileRef.path || f.name === fileRef.fileName
                );

                if (containerFile) {
                  console.log('[API] ✅ Found container file:', (containerFile as any).id, (containerFile as any).name);

                  // Call the download API to fetch and store the file
                  const downloadResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/files/download`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      fileId: (containerFile as any).id,
                      containerId: containerId,
                      fileName: (containerFile as any).name,
                      userId: userId,
                      conversationId: conversationId
                    })
                  });

                  if (downloadResponse.ok) {
                    const downloadResult = await downloadResponse.json();
                    console.log('[API] ✅ File downloaded and uploaded to Supabase:', downloadResult.url);

                    // Replace sandbox:// URL with real Supabase URL in the message
                    // Try both single and double slash formats
                    const sandboxUrlDouble = `sandbox://${fileRef.path}`;
                    const sandboxUrlSingle = `sandbox:/${fileRef.path}`;

                    const messageBefore = fullMessage;
                    fullMessage = fullMessage.replace(sandboxUrlDouble, downloadResult.url);

                    if (fullMessage === messageBefore) {
                      // Try single slash format
                      fullMessage = fullMessage.replace(sandboxUrlSingle, downloadResult.url);
                    }

                    if (fullMessage === messageBefore) {
                      console.error('[API] ❌ URL replacement FAILED! Could not find sandbox URL in message');
                      console.error('[API] Tried:', sandboxUrlDouble, 'and', sandboxUrlSingle);
                      console.error('[API] Message excerpt:', messageBefore.substring(0, 500));
                    } else {
                      console.log('[API] ✅ URL replaced successfully');
                      console.log('[API] Before:', sandboxUrlDouble);
                      console.log('[API] After:', downloadResult.url);
                    }
                  } else {
                    const errorText = await downloadResponse.text();
                    console.error('[API] ❌ Failed to download file:', (containerFile as any).id);
                    console.error('[API] Error:', errorText);
                  }
                } else {
                  console.warn('[API] ⚠️ Could not find container file for:', fileRef.fileName);
                  console.warn('[API] Available files:', containerFiles.data.map((f: any) => f.name || f.path));
                }
              }

              console.log('[API] ✅ Files processed successfully');
              console.log('[API] 📝 Final message length:', fullMessage.length);
            } catch (fileError) {
              console.error('[API] ❌ Error processing files:', fileError);
              // Continue with saving the message even if file processing fails
            }
            }
          }

          // NOW send the done event with the processed message (URLs replaced)
          console.log('[API] 📤 Sending done event to client with processed message');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', message: fullMessage })}\n\n`)
          );

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
