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
 * Supports both single-agent and multi-agent workflows
 * - Single agent: streams myAgent output to chat
 * - Multi-agent: 
 *   - Agent 1 (myAgent): streams output to chat immediately
 *   - Agent 2 (agent): runs silently, no output to chat (if exists)
 *   - Agent 3 (agent1): streams output to chat immediately (if exists)
 */
export async function* createMultiAgentStream(workflow: WorkflowInput): AsyncGenerator<StreamEvent> {
  const conversationHistory = createConversationHistory(workflow.input_as_text);
  const runner = createRunner();
  
  // Dynamically import agents from workflow-generated to check what's available
  const workflowModule = await import("./workflow-generated");
  const { myAgent } = workflowModule;
  
  // Check if multi-agent workflow (agent and agent1 exist)
  const hasAgent2 = 'agent' in workflowModule;
  const hasAgent3 = 'agent1' in workflowModule;
  const isMultiAgent = hasAgent2 || hasAgent3;
  
  // Step 1: Stream Agent 1 (myAgent) - output appears in chat
  console.log('[Stream] Starting Agent 1 (myAgent)');
  // runner.run() with { stream: true } returns a Promise that resolves to an async iterable
  const agent1Stream = await runner.run(myAgent, conversationHistory, { stream: true });
  
  // Stream Agent 1's output
  let agent1FinalOutput: any = null;
  for await (const event of adaptAgentStream(agent1Stream, (output: any) => output.message)) {
    if (event.type === 'done') {
      agent1FinalOutput = event.output;
      // For single-agent workflow, yield the done event immediately
      if (!isMultiAgent) {
        yield event;
      }
    } else {
      // Yield text events so they appear in chat immediately
      yield event;
    }
  }
  
  // Get Agent 1's final output and update conversation history
  // When streaming, we can't access finalOutput/newItems directly from the stream
  // We rely on the output collected from stream events (agent1FinalOutput)
  // For conversation history, we'll need to reconstruct from the streamed output
  if (agent1FinalOutput) {
    // Add the agent's response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: [{ type: "output_text", text: typeof agent1FinalOutput === 'string' ? agent1FinalOutput : agent1FinalOutput.message || "" }]
    });
  }
  
  // Check if approval is needed before continuing to next agent
  // If there's a second agent (agent1/myagent2), we need approval before continuing
  const needsApproval = isMultiAgent && hasAgent3; // hasAgent3 means there's a second agent (agent1/myagent2)
  
  if (needsApproval || !isMultiAgent) {
    // Request approval before continuing
    const approvalMessage = "hi.. do you wnat o proceed?"; // From workflow-paste.ts
    
    // Generate a unique approval ID
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send approval request event
    yield {
      type: "approval_request",
      message: approvalMessage,
      approvalId: approvalId
    };
    
    // Wait for approval response (poll every 500ms, max 60 seconds)
    let approved: boolean | null = null;
    const maxWaitTime = 60000; // 60 seconds
    const pollInterval = 500; // 500ms
    const startTime = Date.now();
    
    console.log('[Workflow] Waiting for user approval...');
    
    while (approved === null && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      try {
        // Import and use the checkApproval function directly
        const { checkApproval } = await import('@/lib/approval-store');
        const approvalResult = checkApproval(approvalId);
        if (approvalResult !== null) {
          approved = approvalResult;
          console.log('[Workflow] Approval received:', approved);
        }
      } catch (error) {
        console.error('[Workflow] Error checking approval:', error);
      }
    }
    
    if (approved === null) {
      // Timeout - default to reject
      approved = false;
      console.log('[Workflow] Approval timeout, defaulting to reject');
    }
    
    // Continue workflow based on approval
    if (!approved) {
      // Rejected - stop workflow
      console.log('[Workflow] Approval rejected, stopping...');
      yield {
        type: "done",
        message: "Workflow stopped by user.",
        output: null,
        files: undefined,
        containerId: undefined
      };
      return;
    }
    
    // Approved - continue with workflow
    console.log('[Workflow] Approval granted, continuing...');
    
    // If single-agent workflow, we're done after approval
    if (!isMultiAgent) {
      // Ensure we yield a done event if we didn't already
      if (!agent1FinalOutput) {
        const finalOutput = agent1Result.finalOutput;
        if (finalOutput) {
          yield {
            type: "done",
            message: typeof finalOutput === 'string' ? finalOutput : finalOutput.message || "",
            output: finalOutput,
            files: undefined,
            containerId: undefined
          };
        }
      }
      return;
    }
  }
  
  // Multi-agent workflow continues after approval...
  
  // Send message_complete event to signal Agent 1's message is done
  // This tells the frontend to finalize the current message and prepare for a new one
  yield {
    type: "message_complete",
    message: agent1FinalOutput?.message || ""
  };
  
  // Step 2: Run Agent 2 (agent) silently - no output to chat (if exists)
  if (hasAgent2) {
    console.log('[Stream] Running Agent 2 (agent) silently');
    const agent2 = (workflowModule as any).agent;
    const agent2Result = await runner.run(agent2, conversationHistory);
    
    // Update conversation history but don't stream output
    if (agent2Result.finalOutput && agent2Result.newItems) {
      conversationHistory.push(...agent2Result.newItems.map((item: any) => item.rawItem));
    }
  }
  
  // Step 3: Stream Agent 3 (agent1/myagent2) - output appears in chat (if exists)
  if (hasAgent3) {
    console.log('[Stream] Starting Agent 3 (agent1)');
    const agent3 = (workflowModule as any).agent1;
    // runner.run() with { stream: true } returns a Promise that resolves to an async iterable
    const agent3Stream = await runner.run(agent3, conversationHistory, { stream: true });

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
    // When streaming, we can't access finalOutput directly from the stream
    // We rely on the output collected from stream events (agent3FinalOutput)
    if (agent3FinalOutput) {
      // Update conversation history with agent3's response
      conversationHistory.push({
        role: "assistant",
        content: [{ type: "output_text", text: typeof agent3FinalOutput === 'string' ? agent3FinalOutput : agent3FinalOutput.message || "" }]
      });
    } else {
      // If no final output was collected, yield a done event with empty message
      yield {
        type: "done",
        message: "",
        output: null,
        files: undefined,
        containerId: undefined
      };
    }
  } else {
    // If no agent3, yield final done event
    yield {
      type: "done",
      message: agent1FinalOutput?.message || "",
      output: agent1FinalOutput,
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
