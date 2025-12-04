/**
 * ⚠️ SACRED FILE - DO NOT MODIFY ⚠️
 * 
 * This file is where you paste your workflows directly.
 * You can replace the entire content of this file with a new workflow.
 * 
 * NO EXPORTS NEEDED - Paste your raw workflow code here!
 * 
 * The script (scripts/generate-workflow.js) automatically:
 * - Reads this file
 * - Adds exports to: myAgent, runWorkflow, and WorkflowInput
 * - Generates workflow-generated.ts with proper exports
 * 
 * REQUIREMENTS (variable names - NO exports needed):
 * - const myAgent = new Agent({ ... }) (or const agent = ...)
 * - const runWorkflow = async (workflow: WorkflowInput) => { ... } (or const workflow = ...)
 * - type WorkflowInput = { input_as_text: string } (or interface WorkflowInput)
 * 
 * After pasting your workflow:
 * 1. Run: node scripts/generate-workflow.js
 * 2. The script generates workflow-generated.ts with exports
 * 3. All other files import from workflow-generated.ts
 * 
 * DO NOT modify this file programmatically - only paste new workflows here.
 * DO NOT add exports - the script handles that automatically!
 */

import { z } from "zod";
import { Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";

const MyagentSchema = z.object({ message: z.string() });
const Myagent2Schema = z.object({ message: z.string() });
const myagent = new Agent({
  name: "MyAgent",
  instructions: `just answer with an equation in lates. Example: 

$$2*x+3$$
`,
  model: "gpt-5.1",
  outputType: MyagentSchema,
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

const myagent2 = new Agent({
  name: "MyAgent2",
  instructions: "you just say .. you approved",
  model: "gpt-5.1",
  outputType: Myagent2Schema,
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

const approvalRequest = (message: string) => {

  // TODO: Implement
  return true;
}

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("New workflow", async () => {
    const state = {

    };
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_690ceb2e381881909543d16f8e1af6ec0749abe400f4b4e7"
      }
    });
    const myagentResultTemp = await runner.run(
      myagent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...myagentResultTemp.newItems.map((item) => item.rawItem));

    if (!myagentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const myagentResult = {
      output_text: JSON.stringify(myagentResultTemp.finalOutput),
      output_parsed: myagentResultTemp.finalOutput
    };
    const approvalMessage = "hi.. do you wnat o proceed?";

    if (approvalRequest(approvalMessage)) {
        const myagent2ResultTemp = await runner.run(
          myagent2,
          [
            ...conversationHistory
          ]
        );
        conversationHistory.push(...myagent2ResultTemp.newItems.map((item) => item.rawItem));

        if (!myagent2ResultTemp.finalOutput) {
            throw new Error("Agent result is undefined");
        }

        const myagent2Result = {
          output_text: JSON.stringify(myagent2ResultTemp.finalOutput),
          output_parsed: myagent2ResultTemp.finalOutput
        };
    } else {

    }
  });
}
