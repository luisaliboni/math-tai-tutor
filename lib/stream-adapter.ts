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
    let jsonBuffer = ''; // Buffer for accumulating partial JSON

    for await (const event of streamedResult) {
      // Handle raw model stream events (contains the text deltas)
      if (event.type === "raw_model_stream_event") {
        const data = event.data;

        // Text streaming event - check for both text_stream and output_text_delta
        if (data.type === "text_stream" || data.type === "output_text_delta") {
          console.log('[Adapter] Found text event, full data:', JSON.stringify(data));
          let text = data.text || data.delta || data.output || '';
          
          // If we have a JSON buffer, add to it
          if (jsonBuffer) {
            jsonBuffer += text;
            text = ''; // Don't use original text yet
          } else if (text && (text.trim().startsWith('{') || text.includes('"message"'))) {
            // Looks like JSON, start accumulating
            jsonBuffer = text;
            text = ''; // Don't yield yet
          }
          
          // If we have a JSON buffer, try to parse it
          if (jsonBuffer) {
            try {
              const parsed = JSON.parse(jsonBuffer);
              if (parsed.message && typeof parsed.message === 'string') {
                // Successfully parsed JSON with message field - extract the message
                text = parsed.message;
                jsonBuffer = ''; // Clear buffer
                console.log('[Adapter] Extracted message from JSON:', text);
              } else {
                // JSON parsed but no message field, use buffer as-is
                text = jsonBuffer;
                jsonBuffer = '';
              }
            } catch (e) {
              // Not complete JSON yet, don't yield anything and wait for more chunks
              console.log('[Adapter] Accumulating JSON buffer, current length:', jsonBuffer.length);
              continue; // Skip yielding this chunk, wait for more
            }
          }
          
          if (text) {
            console.log('[Adapter] Yielding text chunk:', text);
            yield {
              type: "text",
              content: text
            };
            fullMessage += text;
          } else if (!jsonBuffer) {
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
                let text = block.text;
                
                // If the text looks like JSON with a message field, try to parse and extract the message
                if (text && (text.trim().startsWith('{') || text.includes('"message"'))) {
                  try {
                    const parsed = JSON.parse(text);
                    if (parsed.message && typeof parsed.message === 'string') {
                      text = parsed.message;
                      console.log('[Adapter] Extracted message from JSON in content block:', text);
                    }
                  } catch (e) {
                    // Not valid JSON or doesn't have message field, use as-is
                    console.log('[Adapter] Content block text is not JSON with message field, using as-is');
                  }
                }
                
                // If we haven't streamed any text yet, yield it all at once
                if (!fullMessage) {
                  fullMessage = text;
                  // Yield the full text as a single chunk
                  yield {
                    type: "text",
                    content: text
                  };
                }
              }
            }
          }
        }
      }
    }

    console.log('[Adapter] Stream completed, getting final output');

    // If we have a JSON buffer remaining, try to parse it one more time
    if (jsonBuffer) {
      try {
        const parsed = JSON.parse(jsonBuffer);
        if (parsed.message && typeof parsed.message === 'string') {
          // Yield the extracted message
          yield {
            type: "text",
            content: parsed.message
          };
          fullMessage += parsed.message;
          jsonBuffer = '';
        }
      } catch (e) {
        // If we can't parse it, just use the buffer as-is
        if (jsonBuffer.trim()) {
          yield {
            type: "text",
            content: jsonBuffer
          };
          fullMessage += jsonBuffer;
        }
        jsonBuffer = '';
      }
    }

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

    // Extract container ID from tool calls in newItems
    let toolCallContainerId: string | undefined = undefined;
    if (newItems && Array.isArray(newItems)) {
      for (const item of newItems) {
        // Check if this is a tool call item
        if (item.type === 'tool_call_item' || item.rawItem?.type === 'tool_call') {
          const rawItem = item.rawItem || item;
          console.log('[Adapter] 🔍 Examining tool call item:', JSON.stringify(rawItem, null, 2).substring(0, 500));
          
          // For code interpreter, check providerData but only if it's a container ID (starts with cntr_)
          // The ci_ ID is a call ID, not a container ID
          if (rawItem.providerData?.type === 'code_interpreter_call') {
            // Check if there's a container_id field in providerData
            if (rawItem.providerData.container_id && rawItem.providerData.container_id.startsWith('cntr_')) {
              toolCallContainerId = rawItem.providerData.container_id;
              console.log('[Adapter] ✅ Found container_id in providerData.container_id:', toolCallContainerId);
              break;
            }
            // Check if there's a container field
            if (rawItem.providerData.container && typeof rawItem.providerData.container === 'string' && rawItem.providerData.container.startsWith('cntr_')) {
              toolCallContainerId = rawItem.providerData.container;
              console.log('[Adapter] ✅ Found container in providerData.container:', toolCallContainerId);
              break;
            }
            // The providerData.id is a call ID (ci_), not a container ID - skip it
            console.log('[Adapter] ⚠️ providerData.id is a call ID (ci_), not a container ID. Looking elsewhere...');
          }
          
          // Code interpreter tool calls have container_id in the tool_call object
          if (rawItem.tool_call?.container_id) {
            toolCallContainerId = rawItem.tool_call.container_id;
            console.log('[Adapter] ✅ Found container_id in tool_call:', toolCallContainerId);
            break;
          }
          // Also check in the tool_call_id or container fields
          if (rawItem.container_id) {
            toolCallContainerId = rawItem.container_id;
            console.log('[Adapter] ✅ Found container_id in rawItem:', toolCallContainerId);
            break;
          }
          // Check in the tool call response
          if (rawItem.tool_call_id && rawItem.container) {
            toolCallContainerId = rawItem.container;
            console.log('[Adapter] ✅ Found container_id in container field:', toolCallContainerId);
            break;
          }
          // Check nested in tool_call object
          if (rawItem.tool_call?.id) {
            // For code interpreter, the container might be in the tool call itself
            const toolCallId = rawItem.tool_call.id;
            console.log('[Adapter] 🔍 Found tool_call.id:', toolCallId);
          }
        }
      }
    }

    // Also try to get container ID from state's generated items
    const state = (streamedResult as any).state;
    if (state?._generatedItems && Array.isArray(state._generatedItems)) {
      console.log('[Adapter] 🔍 Checking _generatedItems for container_id, count:', state._generatedItems.length);
      for (const genItem of state._generatedItems) {
        // Check if it's a tool call item
        if (genItem.type === 'tool_call_item' || genItem.rawItem?.type === 'tool_call') {
          const rawItem = genItem.rawItem || genItem;
          console.log('[Adapter] 🔍 Examining generated tool call item keys:', Object.keys(rawItem));
          // Log the full structure to find container ID
          try {
            const fullStructure = JSON.stringify(rawItem, (key, value) => {
              // Limit depth to avoid circular references
              if (key === 'agent' || key === 'rawItem') return '[Object]';
              return value;
            }, 2);
            console.log('[Adapter] 🔍 Full generated item structure (first 2000 chars):', fullStructure.substring(0, 2000));
          } catch (e) {
            console.log('[Adapter] ⚠️ Could not stringify item structure');
          }
          
          // Check output for container ID (code interpreter output might have container info)
          if (rawItem.output) {
            console.log('[Adapter] 🔍 Checking output for container_id');
            if (rawItem.output.container_id && rawItem.output.container_id.startsWith('cntr_')) {
              toolCallContainerId = rawItem.output.container_id;
              console.log('[Adapter] ✅ Found container_id in output:', toolCallContainerId);
              break;
            }
            if (rawItem.output.container && typeof rawItem.output.container === 'string' && rawItem.output.container.startsWith('cntr_')) {
              toolCallContainerId = rawItem.output.container;
              console.log('[Adapter] ✅ Found container in output:', toolCallContainerId);
              break;
            }
          }
          
          // For code interpreter, check if providerData.id starts with cntr_ (it might be the container ID)
          // But first check if there's a container field in providerData
          if (rawItem.providerData) {
            if (rawItem.providerData.container_id && rawItem.providerData.container_id.startsWith('cntr_')) {
              toolCallContainerId = rawItem.providerData.container_id;
              console.log('[Adapter] ✅ Found container_id in providerData.container_id:', toolCallContainerId);
              break;
            }
            if (rawItem.providerData.container && typeof rawItem.providerData.container === 'string' && rawItem.providerData.container.startsWith('cntr_')) {
              toolCallContainerId = rawItem.providerData.container;
              console.log('[Adapter] ✅ Found container in providerData.container:', toolCallContainerId);
              break;
            }
            // The ci_ ID is NOT the container ID, but we might need to use it to get the container
            // For now, skip it and look elsewhere
          }
          
          // Try various paths to find container_id
          if (rawItem.tool_call?.container_id && rawItem.tool_call.container_id.startsWith('cntr_')) {
            toolCallContainerId = rawItem.tool_call.container_id;
            console.log('[Adapter] ✅ Found container_id in generated item tool_call:', toolCallContainerId);
            break;
          }
          if (rawItem.container_id && rawItem.container_id.startsWith('cntr_')) {
            toolCallContainerId = rawItem.container_id;
            console.log('[Adapter] ✅ Found container_id in generated item:', toolCallContainerId);
            break;
          }
          // Check if there's a container reference
          if (rawItem.container) {
            const containerId = typeof rawItem.container === 'string' ? rawItem.container : rawItem.container.id;
            if (containerId && containerId.startsWith('cntr_')) {
              toolCallContainerId = containerId;
              console.log('[Adapter] ✅ Found container in generated item:', toolCallContainerId);
              break;
            }
          }
        }
      }
    }
    
    // Also check state's last processed response
    if (state?._lastProcessedResponse) {
      const lastResponse = state._lastProcessedResponse;
      // Check if there are tool calls with container info
      if (lastResponse.toolsUsed && lastResponse.toolsUsed.includes('code_interpreter_call')) {
        // Try to find container in the state's context or trace
        if (state._context?.container_id) {
          toolCallContainerId = state._context.container_id;
          console.log('[Adapter] ✅ Found container_id in state._context:', toolCallContainerId);
        }
      }
    }
    
    // Check model responses for container IDs
    if (state?._modelResponses && Array.isArray(state._modelResponses)) {
      console.log('[Adapter] 🔍 Checking _modelResponses for container_id, count:', state._modelResponses.length);
      for (const modelResponse of state._modelResponses) {
        if (modelResponse.output && Array.isArray(modelResponse.output)) {
          for (const outputItem of modelResponse.output) {
            // Check if this output item is a tool call with container
            if (outputItem.type === 'tool_call' || outputItem.tool_call_id) {
              if (outputItem.container_id) {
                toolCallContainerId = outputItem.container_id;
                console.log('[Adapter] ✅ Found container_id in model response output:', toolCallContainerId);
                break;
              }
              if (outputItem.tool_call?.container_id) {
                toolCallContainerId = outputItem.tool_call.container_id;
                console.log('[Adapter] ✅ Found container_id in model response tool_call:', toolCallContainerId);
                break;
              }
            }
          }
        }
        if (toolCallContainerId) break;
      }
    }

    // Use whichever container_id we can find (calculate before processing files)
    let actualContainerId = containerId || stateContainerId || currentTurnContainerId || toolCallContainerId;

    // Extract file information from newItems (tool call outputs)
    const files: FileInfo[] = [];

    if (newItems && Array.isArray(newItems)) {
      console.log('[Adapter] 🔍 Checking for files in', newItems.length, 'items');

      for (const item of newItems) {
        // First, check if this is a tool call item and try to extract container ID from it
        if (item.type === 'tool_call_item' || item.rawItem?.type === 'tool_call') {
          const rawItem = item.rawItem || item;
          // Check for container ID in various places in the tool call item
          
          // For code interpreter, check providerData but only accept container IDs (cntr_)
          if (rawItem.providerData?.type === 'code_interpreter_call') {
            if (rawItem.providerData.container_id && rawItem.providerData.container_id.startsWith('cntr_')) {
              if (!toolCallContainerId) {
                toolCallContainerId = rawItem.providerData.container_id;
                console.log('[Adapter] ✅ Found container_id in tool call providerData.container_id:', toolCallContainerId);
              }
            }
            if (rawItem.providerData.container && typeof rawItem.providerData.container === 'string' && rawItem.providerData.container.startsWith('cntr_')) {
              if (!toolCallContainerId) {
                toolCallContainerId = rawItem.providerData.container;
                console.log('[Adapter] ✅ Found container in tool call providerData.container:', toolCallContainerId);
              }
            }
          }
          
          if (rawItem.response?.container_id) {
            if (!toolCallContainerId) {
              toolCallContainerId = rawItem.response.container_id;
              console.log('[Adapter] ✅ Found container_id in tool call response:', toolCallContainerId);
            }
          }
          if (rawItem.output?.container_id) {
            if (!toolCallContainerId) {
              toolCallContainerId = rawItem.output.container_id;
              console.log('[Adapter] ✅ Found container_id in tool call output:', toolCallContainerId);
            }
          }
          // Check function call response
          if (rawItem.function?.container_id) {
            if (!toolCallContainerId) {
              toolCallContainerId = rawItem.function.container_id;
              console.log('[Adapter] ✅ Found container_id in tool call function:', toolCallContainerId);
            }
          }
          // Check if there's a function_call with container
          if (rawItem.function_call?.container_id) {
            if (!toolCallContainerId) {
              toolCallContainerId = rawItem.function_call.container_id;
              console.log('[Adapter] ✅ Found container_id in function_call:', toolCallContainerId);
            }
          }
        }
        
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

              // Fallback: detect plain sandbox:// URLs (without markdown link)
              const plainSandboxRegex = /sandbox:\/\/?([^\s\)\]]+)/g;
              let plainMatch;
              while ((plainMatch = plainSandboxRegex.exec(textToSearch)) !== null) {
                const filePath = plainMatch[1];
                const fileName = filePath.split('/').pop() || 'download.txt';

                // Avoid duplicates if we already captured this path via the markdown regex
                if (!files.some(f => f.path === filePath)) {
                  console.log('[Adapter] ✅ Found plain sandbox URL:', { fileName, filePath });
                  files.push({
                    id: '',
                    path: filePath,
                    containerId: actualContainerId || '',
                    fileName
                  });
                }
              }

              if (matchCount === 0 && files.length === 0 && textToSearch.includes('sandbox:')) {
                console.warn('[Adapter] ⚠️ Found "sandbox:" in text but regex did not capture any paths');
                console.warn('[Adapter] Text sample:', textToSearch.substring(0, 200));
              }
            }
          }
        }
      }
    } else {
      console.log('[Adapter] No newItems to check for files');
    }

    // Recalculate actualContainerId after all checks (in case we found it in the loop)
    actualContainerId = containerId || stateContainerId || currentTurnContainerId || toolCallContainerId;
    console.log('[Adapter] 🔍 DEBUG - Final containerId:', actualContainerId);
    
    // Update files array with the final container ID
    if (actualContainerId && files.length > 0) {
      files.forEach(file => {
        if (!file.containerId) {
          file.containerId = actualContainerId;
        }
      });
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
