import { codeInterpreterTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";


// Tool definitions
const codeInterpreter = codeInterpreterTool({
  container: {
    type: "auto",
    file_ids: []
  }
})
const MyAgentSchema = z.object({ message: z.string(), boolean: z.boolean() });
const myAgent = new Agent({
  name: "My agent",
  instructions: `Run a python code to calculate the factorial of the number the user inputs.

you have to run python to get the result numerically.
`,
  model: "gpt-5",
  tools: [
    codeInterpreter
  ],
  outputType: MyAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "medium",
      summary: "auto"
    },
    store: true
  }
});

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("test", async () => {
    const state = {

    };
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
    const myAgentResultTemp = await runner.run(
      myAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...myAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!myAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const myAgentResult = {
      output_text: JSON.stringify(myAgentResultTemp.finalOutput),
      output_parsed: myAgentResultTemp.finalOutput
    };

    return myAgentResult;
  });
}

// Streaming version - returns a promise of the StreamedRunResult
// This function is minimal - you can change the workflow above without affecting streaming
export async function createWorkflowStream(workflow: WorkflowInput) {
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
  const streamedResult = await runner.run(myAgent, conversationHistory, { stream: true });

  // Return the async iterable stream - the adapter in lib/stream-adapter.ts handles the rest
  return streamedResult;
}
