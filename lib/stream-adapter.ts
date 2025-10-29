/**
 * Stream Adapter
 *
 * This file handles streaming logic independently from the workflow implementation.
 * When your workflow.ts changes, you only need to ensure it exports a streaming function
 * that follows the expected interface.
 */

import { Runner } from "@openai/agents";

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'done'; message: string; output?: any }
  | { type: 'error'; message: string };

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

    if (finalOutput) {
      const message = extractMessage
        ? extractMessage(finalOutput)
        : finalOutput.message || fullMessage;

      console.log('[Adapter] Final output message:', message);

      yield {
        type: "done",
        message: message,
        output: finalOutput
      };
    } else {
      // If no final output, use accumulated message
      console.log('[Adapter] No final output, using accumulated message:', fullMessage);
      yield {
        type: "done",
        message: fullMessage,
        output: null
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
