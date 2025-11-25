import { codeInterpreterTool, Agent } from "@openai/agents";
import { z } from "zod";

const MyAgentSchema = z.object({
  message: z.string(),
  tree_png_url: z.string()
});

/**
 * Creates an agent with the specified file IDs for Code Interpreter
 * This allows the agent to access uploaded files seamlessly
 */
export function createMathAgent(fileIds: string[] = []) {
  const codeInterpreter = codeInterpreterTool({
    container: {
      type: "auto",
      file_ids: fileIds
    }
  });

  return new Agent({
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

You can come up with values and node names . Be creative.
If the user has uploaded files, you can access them directly using the code interpreter. The files are automatically available in your environment.`,
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
}
