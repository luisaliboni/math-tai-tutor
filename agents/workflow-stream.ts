import { AgentInputItem, Runner } from "@openai/agents";
import { myAgent, type WorkflowInput } from "./workflow-generated";
import { createMathAgent } from "./agent-factory";

type WorkflowStreamInput = {
  input_as_text: string;
  file_ids?: string[];
};

/**
 * Creates conversation history from input text
 */
function createConversationHistory(inputText: string): AgentInputItem[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: inputText
        }
      ]
    }
  ];
}

/**
 * Creates a runner with standard trace metadata
 */
function createRunner() {
  return new Runner({
    traceMetadata: {
      __trace_source__: "agent-builder",
      workflow_id: "wf_6925de9fb40c81908958e9185cdf8c6a00c338ec80f21f2f"
    }
  });
}

/**
 * Streaming workflow - simple version (no files)
 * Uses the agent from workflow-generated.ts (which reads from workflow-paste.ts)
 */
export async function createWorkflowStream(workflow: WorkflowInput) {
  const conversationHistory = createConversationHistory(workflow.input_as_text);
  const runner = createRunner();
  return await runner.run(myAgent, conversationHistory, { stream: true });
}

/**
 * Streaming workflow with file upload support
 * Creates an agent with file IDs via agent-factory (which reads from workflow-generated.ts)
 */
export async function createWorkflowStreamWithFiles(workflow: WorkflowStreamInput) {
  const agent = createMathAgent(workflow.file_ids || []);
  const conversationHistory = createConversationHistory(workflow.input_as_text);
  const runner = createRunner();
  return await runner.run(agent, conversationHistory, { stream: true });
}
