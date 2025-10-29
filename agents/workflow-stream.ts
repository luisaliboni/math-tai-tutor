import { AgentInputItem, Runner } from "@openai/agents";
import { createMathAgent } from "./agent-factory";

type WorkflowStreamInput = {
  input_as_text: string;
  file_ids?: string[];
};

/**
 * Streaming workflow that supports file uploads
 * This is a separate implementation that doesn't modify the original workflow.ts
 */
export async function createWorkflowStreamWithFiles(workflow: WorkflowStreamInput) {
  // Create agent with file IDs if provided
  const agent = createMathAgent(workflow.file_ids || []);

  const conversationHistory: AgentInputItem[] = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: workflow.input_as_text
        }
      ]
    }
  ];

  const runner = new Runner({
    traceMetadata: {
      __trace_source__: "agent-builder",
      workflow_id: "wf_68efcbd1f3188190bd4fd7e9153470d104693f24615e2a25"
    }
  });

  // Call run with stream: true to get StreamedRunResult (which is AsyncIterable)
  const streamedResult = await runner.run(agent, conversationHistory, { stream: true });

  // Return the async iterable stream
  return streamedResult;
}
