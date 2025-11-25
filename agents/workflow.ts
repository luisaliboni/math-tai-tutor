import { codeInterpreterTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

// Tool definitions
const codeInterpreter = codeInterpreterTool({
  container: {
    type: "auto",
    file_ids: []
  }
});

const MyAgentSchema = z.object({
  message: z.string(),
  tree_png_url: z.string()
});

const myAgent = new Agent({
  name: "My agent",
  instructions: `you will always generate a probability tree using graphviz, no matter what the user asks. You will render it as a png image and provide the download link. 

Here is an example: 

**Probability Tree Diagram (branching with probabilities only):**

from graphviz import Digraph
from IPython.display import Image, display

dot = Digraph(format='png', graph_attr={'rankdir': 'LR'})
dot.node('Start', '', shape='point')
dot.node('R1', 'R', shape='plaintext')
dot.node('B1', 'B', shape='plaintext')
dot.node('RR', 'R', shape='plaintext')
dot.node('RB', 'B', shape='plaintext')
dot.node('BR', 'R', shape='plaintext')
dot.node('BB', 'B', shape='plaintext')
dot.edge('Start', 'R1', label='p_R')
dot.edge('Start', 'B1', label='p_B')
dot.edge('R1', 'RR', label='p_R')
dot.edge('R1', 'RB', label='p_B')
dot.edge('B1', 'BR', label='p_R')
dot.edge('B1', 'BB', label='p_B')
output_path = "/mnt/data/probability_tree"
png_path = dot.render(output_path, format="png", cleanup=True)
display(Image(filename=png_path))

You can come up with values and node names . Be creative.`,
  model: "gpt-5.1",
  tools: [
    codeInterpreter
  ],
  outputType: MyAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "high",
      summary: "auto"
    },
    store: true
  }
});

type WorkflowInput = { input_as_text: string };

// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("New workflow", async () => {
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
        workflow_id: "wf_6925de9fb40c81908958e9185cdf8c6a00c338ec80f21f2f"
      }
    });

    const myAgentResultTemp = await runner.run(myAgent, [...conversationHistory]);
    conversationHistory.push(...myAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!myAgentResultTemp.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    return {
      output_text: JSON.stringify(myAgentResultTemp.finalOutput),
      output_parsed: myAgentResultTemp.finalOutput
    };
  });
};

// Streaming version - returns a promise of the StreamedRunResult
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
      workflow_id: "wf_6925de9fb40c81908958e9185cdf8c6a00c338ec80f21f2f"
    }
  });

  return await runner.run(myAgent, conversationHistory, { stream: true });
}
