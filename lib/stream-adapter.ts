/**
 * Stream Adapter
 *
 * This file handles streaming logic independently from the workflow implementation.
 * When your workflow.ts changes, you only need to ensure it exports a streaming function
 * that follows the expected interface.
 */

import { Runner } from "@openai/agents";
import { FileInfo, StreamEvent } from "@/types";

export type { StreamEvent };

/**
 * Generic streaming adapter that works with OpenAI Agents SDK StreamedRunResult
 *
 * @param streamedResult - The StreamedRunResult from runner.run(..., { stream: true })
 * @param extractMessage - Function to extract the final message from the output
 */
export async function* adaptAgentStream(
  streamedResult: AsyncIterable<any>,
  extractMessage?: (output: any) => string
): AsyncGenerator<StreamEvent> {
  try {
    let fullMessage = '';
    let hasFinalOutput = false;

    for await (const event of streamedResult) {
      // Handle raw model stream events (contains the text deltas)
      if (event.type === "raw_model_stream_event") {
        const data = event.data;

        // Text streaming event - check for both text_stream and output_text_delta
        if (data.type === "text_stream" || data.type === "output_text_delta") {
          console.log('[Adapter] Found text event, full data:', JSON.stringify(data));
          const text = data.text || data.delta || data.output || '';
          if (text) {
            console.log('[Adapter] Yielding text chunk:', text);
            yield {
              type: "text",
              content: text
            };
            fullMessage += text;
          } else {
            console.log('[Adapter] No text found in delta event');
          }
        }
      }

      // Handle item stream events (messages, tool calls, etc.)
      else if (event.type === "run_item_stream_event") {
        console.log('[Adapter] Run item event:', event.name);

        // Check if it's a message output - this means the agent has finished
        if (event.name === "message_output_created" && event.item) {
          // Extract text content from the item
          const item = event.item;
          if (item.rawItem && item.rawItem.content) {
            const content = item.rawItem.content;
            console.log('[Adapter] Message content:', content);

            // Content is an array of content blocks
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                // If we haven't streamed any text yet, yield it all at once
                if (!fullMessage) {
                  fullMessage = block.text;
                  // Yield the full text as a single chunk
                  yield {
                    type: "text",
                    content: block.text
                  };
                }
              }
            }
          }
        }
      }
    }

    console.log('[Adapter] Stream completed, getting final output');

    // After the stream completes, we need to get the final output
    // The StreamedRunResult has a finalOutput property that becomes available after streaming
    const finalOutput = (streamedResult as any).finalOutput;
    const newItems = (streamedResult as any).newItems;
    const containerId = (streamedResult as any).container_id || (streamedResult as any).containerId;

    // DEBUG: Log the entire structure to understand what we're working with
    console.log('[Adapter] 🔍 DEBUG - streamedResult keys:', Object.keys(streamedResult as any));
    console.log('[Adapter] 🔍 DEBUG - streamedResult.state:', (streamedResult as any).state);
    console.log('[Adapter] 🔍 DEBUG - finalOutput:', finalOutput);
    console.log('[Adapter] 🔍 DEBUG - newItems type:', typeof newItems, 'isArray:', Array.isArray(newItems));

    // Try to find container_id in different places
    const stateContainerId = (streamedResult as any).state?.container_id;
    const currentTurnContainerId = (streamedResult as any).currentTurn?.container_id;
    console.log('[Adapter] 🔍 DEBUG - state.container_id:', stateContainerId);
    console.log('[Adapter] 🔍 DEBUG - currentTurn.container_id:', currentTurnContainerId);
    console.log('[Adapter] 🔍 DEBUG - containerId from streamedResult:', containerId);
    console.log('[Adapter] 🔍 DEBUG - fullMessage contains "sandbox":', fullMessage.includes('sandbox'));

    // Use whichever container_id we can find
    const actualContainerId = containerId || stateContainerId || currentTurnContainerId;

    // Extract file information from newItems (tool call outputs)
    const files: FileInfo[] = [];

    if (newItems && Array.isArray(newItems)) {
      console.log('[Adapter] 🔍 Checking for files in', newItems.length, 'items');

      for (const item of newItems) {
        // Check if this is a code interpreter tool call with file outputs
        if (item.rawItem?.type === 'message' && item.rawItem?.content) {
          console.log('[Adapter] Examining message item with', item.rawItem.content.length, 'content blocks');

          for (const contentBlock of item.rawItem.content) {
            // Look for files in code interpreter outputs
            if (contentBlock.type === 'output_text' && contentBlock.text) {
              let textToSearch = contentBlock.text;
              console.log('[Adapter] Searching content block, length:', textToSearch.length);

              // If the text is a JSON string, try to parse it to get the actual message
              try {
                const parsed = JSON.parse(textToSearch);
                if (parsed.message) {
                  textToSearch = parsed.message;
                  console.log('[Adapter] ✅ Extracted message from JSON wrapper');
                }
              } catch (e) {
                // Not JSON, use as is
                console.log('[Adapter] Content is not JSON, using as-is');
              }

              // Parse markdown links with sandbox:// URLs (handle both single and double slashes)
              const fileRegex = /\[([^\]]+)\]\(sandbox:\/\/?([^\)]+)\)/g;
              let match;
              let matchCount = 0;

              while ((match = fileRegex.exec(textToSearch)) !== null) {
                matchCount++;
                const fileName = match[2].split('/').pop() || 'download.txt';
                const filePath = match[2];

                console.log('[Adapter] ✅ Found file reference #' + matchCount + ':', { fileName, filePath });

                // Note: We don't have the actual file ID here, so we'll use the path
                // The actual file download will need to list files in the container
                files.push({
                  id: '', // Will be resolved later
                  path: filePath,
                  containerId: actualContainerId || '',
                  fileName: fileName
                });
              }

              if (matchCount === 0 && textToSearch.includes('sandbox:')) {
                console.warn('[Adapter] ⚠️ Found "sandbox:" in text but regex did not match');
                console.warn('[Adapter] Text sample:', textToSearch.substring(0, 200));
              }
            }
          }
        }
      }
    } else {
      console.log('[Adapter] No newItems to check for files');
    }

    // ALTERNATIVE: If newItems didn't have files, try extracting from fullMessage directly
    if (files.length === 0 && fullMessage.includes('sandbox:')) {
      console.log('[Adapter] ⚠️ No files found in newItems, trying to extract from fullMessage');
      const fileRegex = /\[([^\]]+)\]\(sandbox:\/\/?([^\)]+)\)/g;
      let match;

      while ((match = fileRegex.exec(fullMessage)) !== null) {
        const fileName = match[2].split('/').pop() || 'download.txt';
        const filePath = match[2];

        console.log('[Adapter] ✅ Extracted file from fullMessage:', { fileName, filePath });

        files.push({
          id: '',
          path: filePath,
          containerId: actualContainerId || '',
          fileName: fileName
        });
      }
    }

    if (files.length > 0) {
      console.log('[Adapter] 📁 Final files array:', files);
      console.log('[Adapter] 📁 Using containerId:', actualContainerId);
    } else {
      console.log('[Adapter] ⚠️ No files detected');
    }

    if (finalOutput) {
      const message = extractMessage
        ? extractMessage(finalOutput)
        : finalOutput.message || fullMessage;

      console.log('[Adapter] Final output message:', message);

      yield {
        type: "done",
        message: message,
        output: finalOutput,
        files: files.length > 0 ? files : undefined,
        containerId: actualContainerId
      };
    } else {
      // If no final output, use accumulated message
      console.log('[Adapter] No final output, using accumulated message:', fullMessage);
      yield {
        type: "done",
        message: fullMessage,
        output: null,
        files: files.length > 0 ? files : undefined,
        containerId: actualContainerId
      };
    }

  } catch (error) {
    console.error('Stream adapter error:', error);
    yield {
      type: "error",
      message: error instanceof Error ? error.message : 'Unknown streaming error'
    };
  }
}

/**
 * Simpler wrapper for workflows that just need basic text streaming
 *
 * @param workflowStream - Any async generator that yields text chunks
 */
export async function* wrapWorkflowStream(
  workflowStream: AsyncGenerator<{ type: string; content?: string; output?: any }>
): AsyncGenerator<StreamEvent> {
  try {
    for await (const chunk of workflowStream) {
      if (chunk.type === 'text' && chunk.content) {
        yield {
          type: 'text',
          content: chunk.content
        };
      } else if (chunk.type === 'done' && chunk.output) {
        yield {
          type: 'done',
          message: chunk.output.message,
          output: chunk.output
        };
      }
    }
  } catch (error) {
    console.error('Workflow stream wrapper error:', error);
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown streaming error'
    };
  }
}
