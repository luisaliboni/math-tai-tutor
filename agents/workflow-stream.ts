import { AgentInputItem, Runner } from "@openai/agents";
import { myAgent, type WorkflowInput } from "./workflow-generated";
import { createMathAgent } from "./agent-factory";
import { adaptAgentStream, type StreamEvent } from "@/lib/stream-adapter";

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
 * Multi-agent streaming workflow that streams outputs from multiple agents sequentially
 * - Agent 1 (myAgent): streams output to chat immediately
 * - Agent 2 (agent): runs silently, no output to chat
 * - Agent 3 (agent1): streams output to chat immediately
 */
export async function* createMultiAgentStream(workflow: WorkflowInput): AsyncGenerator<StreamEvent> {
  const conversationHistory = createConversationHistory(workflow.input_as_text);
  const runner = createRunner();
  
  // Import agents from workflow-generated
  const { myAgent, agent, agent1 } = await import("./workflow-generated");
  
  // Step 1: Stream Agent 1 (myAgent) - output appears in chat
  console.log('[MultiAgent] Starting Agent 1 (myAgent)');
  const agent1Stream = await runner.run(myAgent, conversationHistory, { stream: true });
  
  // Stream Agent 1's output - yield text events, then send message_complete
  let agent1FinalOutput: any = null;
  for await (const event of adaptAgentStream(agent1Stream, (output: any) => output.message)) {
    if (event.type === 'done') {
      // Save the output but don't yield done event (we'll continue to agent 2)
      agent1FinalOutput = event.output;
    } else {
      // Yield text events so they appear in chat immediately
      yield event;
    }
  }
  
  // Send message_complete event to signal Agent 1's message is done
  // This tells the frontend to finalize the current message and prepare for a new one
  yield {
    type: "message_complete",
    message: agent1FinalOutput?.message || ""
  };
  
  // Get Agent 1's final output and update conversation history
  const agent1Result = agent1Stream as any;
  const agent1Output = agent1Result.finalOutput || agent1FinalOutput;
  if (agent1Output && agent1Result.newItems) {
    conversationHistory.push(...agent1Result.newItems.map((item: any) => item.rawItem));
  }
  
  // Step 2: Run Agent 2 (agent) silently - no output to chat
  console.log('[MultiAgent] Running Agent 2 (agent) silently');
  const agent2Result = await runner.run(agent, conversationHistory);
  
  // Update conversation history but don't stream output
  if (agent2Result.finalOutput) {
    conversationHistory.push(...agent2Result.newItems.map((item) => item.rawItem));
  }
  
  // Step 3: Stream Agent 3 (agent1) - output appears in chat
  console.log('[MultiAgent] Starting Agent 3 (agent1)');
  const agent3Stream = await runner.run(agent1, conversationHistory, { stream: true });
  
  // Stream Agent 3's output - yield all events including final done
  let agent3FinalOutput: any = null;
  for await (const event of adaptAgentStream(agent3Stream, (output: any) => output.message)) {
    if (event.type === 'done') {
      // Save the output and yield the done event (this is the final one)
      agent3FinalOutput = event.output;
      yield event;
    } else {
      // Yield text events so they appear in chat immediately
      yield event;
    }
  }
  
  // Ensure we yield a done event if adaptAgentStream didn't
  const agent3Result = agent3Stream as any;
  const finalOutput = agent3Result.finalOutput || agent3FinalOutput;
  if (finalOutput && !agent3FinalOutput) {
    yield {
      type: "done",
      message: finalOutput.message || "",
      output: finalOutput,
      files: undefined,
      containerId: undefined
    };
  }
}

/**
 * Streaming workflow - simple version (no files)
 * Uses the multi-agent streaming workflow
 */
export async function createWorkflowStream(workflow: WorkflowInput) {
  // Return the async generator directly
  return createMultiAgentStream(workflow);
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
