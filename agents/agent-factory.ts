import { codeInterpreterTool, Agent } from "@openai/agents";
import { myAgent } from "./workflow-generated";

/**
 * Creates an agent with the specified file IDs for Code Interpreter
 * This allows the agent to access uploaded files seamlessly
 * 
 * This function reads the base agent from workflow-generated.ts (which reads from workflow-paste.ts)
 * and creates a new instance with file support.
 */
export function createMathAgent(fileIds: string[] = []) {
  // Create code interpreter with file IDs
  const codeInterpreter = codeInterpreterTool({
    container: {
      type: "auto",
      file_ids: fileIds
    }
  });

  // Create a new agent based on the base agent configuration but with file support
  // We read the configuration from the sacred file's agent
  return new Agent({
    name: myAgent.name,
    instructions: myAgent.instructions + "\n\nIf the user has uploaded files, you can access them directly using the code interpreter. The files are automatically available in your environment.",
    model: myAgent.model,
    tools: [codeInterpreter],
    outputType: myAgent.outputType,
    modelSettings: myAgent.modelSettings
  });
}
