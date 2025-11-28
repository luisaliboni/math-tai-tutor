import { NextRequest } from 'next/server';
import { createWorkflowStream, createWorkflowStreamWithFiles } from '@/agents/workflow-stream';
import { adaptAgentStream } from '@/lib/stream-adapter';
import { FileInfo } from '@/types';
import { formatAttachmentMarkdown, isImageFile } from '@/utils/attachments';
import { supabaseServer } from '@/lib/supabase-server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AGENT_FILES_BUCKET = 'agent-files';
let bucketInitialized = false;
async function ensureBucketExists() {
  if (bucketInitialized) {
    return;
  }

  try {
    const { data, error } = await supabaseServer.storage.getBucket(AGENT_FILES_BUCKET);
    if (error || !data) {
      console.warn('[API] agent-files bucket missing, creating it now');
      const { error: createError } = await supabaseServer.storage.createBucket(AGENT_FILES_BUCKET, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      });
      if (createError) {
        console.error('[API] ❌ Failed to create agent-files bucket:', createError);
        throw new Error(`Unable to create storage bucket: ${createError.message}`);
      }
    }

    bucketInitialized = true;
  } catch (bucketError) {
    console.error('[API] ❌ ensureBucketExists error:', bucketError);
    throw bucketError;
  }
}

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
            // Validate container ID - must start with 'cntr_'
            if (!containerId || !containerId.startsWith('cntr_')) {
              console.error('[API] ❌ Files detected but no valid containerId!');
              console.error('[API] Container ID:', containerId);
              console.error('[API] Container ID must start with "cntr_" but got:', containerId?.substring(0, 4));
              console.error('[API] Files will be shown as sandbox links (not downloadable).');
              // Don't process files, but continue - the sandbox links will be shown
            } else {
              console.log('[API] ⚙️ Starting file processing for', files.length, 'file(s)');
              console.log('[API] Using container ID:', containerId);

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

                // Normalize paths for comparison (handle both with and without leading slash)
                const normalizedRefPath = fileRef.path.startsWith('/') ? fileRef.path : '/' + fileRef.path;
                const normalizedRefPathNoSlash = fileRef.path.startsWith('/') ? fileRef.path.substring(1) : fileRef.path;

                // Find matching file by path/filename (try multiple path formats)
                const containerFile = containerFiles.data.find(
                  (f: any) => {
                    const filePath = f.path || '';
                    const fileName = f.name || '';
                    
                    console.log('[API] 🔍 Comparing:', {
                      filePath,
                      fileName,
                      refPath: fileRef.path,
                      refFileName: fileRef.fileName,
                      normalizedRefPath,
                      normalizedRefPathNoSlash
                    });
                    
                    // Try exact match, normalized match, and filename match
                    return filePath === fileRef.path || 
                           filePath === normalizedRefPath ||
                           filePath === normalizedRefPathNoSlash ||
                           fileName === fileRef.fileName ||
                           filePath.endsWith('/' + fileRef.fileName) ||
                           filePath.endsWith(fileRef.fileName);
                  }
                );

                if (containerFile) {
                  console.log('[API] ✅ Found container file:', (containerFile as any).id, (containerFile as any).name);

                  try {
                    // Download file directly (no HTTP fetch needed)
                    const fileId = (containerFile as any).id;
                    const fileName = (containerFile as any).name || fileRef.fileName;
                    
                    console.log('[API] Downloading file from OpenAI', { fileId, containerId, fileName });

                    // Download file content from OpenAI container
                    const fileContent = await openai.containers.files.content.retrieve(
                      fileId,
                      { container_id: containerId }
                    );

                    // Convert response to buffer
                    const arrayBuffer = await fileContent.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    console.log('[API] File downloaded from OpenAI', { fileId, size: buffer.length });

                    // Upload to Supabase Storage (ensure bucket exists first)
                    await ensureBucketExists();

                    const { getContentType } = await import('@/utils/attachments');
                    const storagePath = `${userId}/${conversationId || 'no-convo'}/${fileName}`;
                    const contentType = getContentType(fileName);

                    const { data: uploadData, error: uploadError } = await supabaseServer.storage
                      .from(AGENT_FILES_BUCKET)
                      .upload(storagePath, buffer, {
                        contentType: contentType,
                        upsert: true
                      });

                    if (uploadError) {
                      console.error('[API] Error uploading to Supabase:', uploadError);
                      throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
                    }

                    console.log('[API] File uploaded to Supabase', { path: uploadData.path });

                    // Generate public URL
                    const serveUrl = `/api/files/serve?path=${encodeURIComponent(
                      uploadData.path
                    )}&filename=${encodeURIComponent(fileName)}`;

                    console.log('[API] ✅ File downloaded and uploaded to Supabase:', serveUrl);

                    const downloadResult = { url: serveUrl, path: uploadData.path, fileName };

                    // Replace sandbox:// URL with real Supabase URL in the message
                    // Try multiple formats: sandbox://path, sandbox:/path, and in markdown links
                    const sandboxUrlDouble = `sandbox://${fileRef.path}`;
                    const sandboxUrlSingle = `sandbox:/${fileRef.path}`;
                    const sandboxUrlInLink = `[${fileRef.fileName}](sandbox:/${fileRef.path})`;
                    const sandboxUrlInLinkDouble = `[${fileRef.fileName}](sandbox://${fileRef.path})`;

                    // Also try filename-only patterns which sometimes appear
                    const sandboxUrlFilenameOnly = `(sandbox:/mnt/data/${fileRef.fileName})`;
                    const sandboxUrlFilenameOnlyDouble = `(sandbox://mnt/data/${fileRef.fileName})`;

                    let messageBefore = fullMessage;
                    let fallbackAppended = false;

                    // Try replacing the full markdown link first (most common case)
                    fullMessage = fullMessage.replace(sandboxUrlInLink, `[${fileRef.fileName}](${downloadResult.url})`);
                    if (fullMessage === messageBefore) {
                      fullMessage = fullMessage.replace(sandboxUrlInLinkDouble, `[${fileRef.fileName}](${downloadResult.url})`);
                    }
                    
                    // Try matching just the URL part in parentheses (common in markdown links)
                    if (fullMessage === messageBefore) {
                       fullMessage = fullMessage.replace(sandboxUrlFilenameOnly, `(${downloadResult.url})`);
                    }
                    if (fullMessage === messageBefore) {
                       fullMessage = fullMessage.replace(sandboxUrlFilenameOnlyDouble, `(${downloadResult.url})`);
                    }
                    
                    // Then try replacing just the URL part
                    if (fullMessage === messageBefore) {
                      fullMessage = fullMessage.replace(sandboxUrlSingle, downloadResult.url);
                    }
                    if (fullMessage === messageBefore) {
                      fullMessage = fullMessage.replace(sandboxUrlDouble, downloadResult.url);
                    }

                    // If no replacement happened (maybe no link in text), append it
                    if (fullMessage === messageBefore) {
                      console.log('[API] No link found in text, appending attachment markdown');
                      fullMessage += formatAttachmentMarkdown(fileRef.fileName, downloadResult.url);
                      fallbackAppended = true;
                    } else {
                      console.log('[API] ✅ URL replaced successfully');
                      console.log('[API] Message before:', messageBefore.substring(0, 200));
                      console.log('[API] Message after:', fullMessage.substring(0, 200));
                    }

                    // Ensure image previews are visible even if link text already existed
                    if (isImageFile(fileRef.fileName) && !fallbackAppended) {
                      const previewMarkdown = formatAttachmentMarkdown(fileRef.fileName, downloadResult.url);
                      if (!fullMessage.includes(previewMarkdown.trim())) {
                        fullMessage += previewMarkdown;
                      }
                    }
                  } catch (downloadError) {
                    console.error('[API] ❌ Failed to download file:', (containerFile as any).id);
                    console.error('[API] Error:', downloadError);
                    // Continue - the sandbox URL will remain in the message
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
