import { codeInterpreterTool, Agent } from "@openai/agents";
import { z } from "zod";

const MyAgentSchema = z.object({ message: z.string(), boolean: z.boolean() });

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
    instructions: `Run a python code to calculate the factorial of the number the user inputs.

you have to run python to get the result numerically.

If the user has uploaded files, you can access them directly using the code interpreter. The files are automatically available in your environment.
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
}
