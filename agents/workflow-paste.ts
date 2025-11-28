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

const MyAgentSchema = z.object({ message: z.string() });
const AgentSchema = z.object({ variable: z.boolean(), message: z.string() });
const AgentSchema1 = z.object({ message: z.string() });
const myAgent = new Agent({
  name: "My agent",
  instructions: `You are a helpful assistant.
Your only task is to say \"I am the first agent\". No matter what the user is asking or prompting. 

Do not answer anything taht is not the \"I am the first agent phrase.\"`,
  model: "gpt-5.1",
  outputType: MyAgentSchema,
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

const agent = new Agent({
  name: "Agent",
  instructions: `Your task is just to ouput a true value to variable. 
DO not say anythng or answer nothing in the chat. Just output variable in your output.`,
  model: "gpt-5.1",
  outputType: AgentSchema,
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

const agent1 = new Agent({
  name: "Agent",
  instructions: `Your only task is to say : \"I am the final agent\"
No matter what the user is asking or prompting. 

DO not say nothing other than \"I am the final agent\"`,
  model: "gpt-5.1",
  outputType: AgentSchema1,
  modelSettings: {
    reasoning: {
      effort: "low",
      summary: "auto"
    },
    store: true
  }
});

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("New workflow", async () => {
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_692a064a4e988190b95301e646814ef10c2419caf18a1091"
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
    const agentResultTemp = await runner.run(
      agent,
      [
        ...conversationHistory
      ]
    );

    if (!agentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const agentResult = {
      output_text: JSON.stringify(agentResultTemp.finalOutput),
      output_parsed: agentResultTemp.finalOutput
    };
    const agentResultTemp1 = await runner.run(
      agent1,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...agentResultTemp1.newItems.map((item) => item.rawItem));

    if (!agentResultTemp1.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const agentResult1 = {
      output_text: JSON.stringify(agentResultTemp1.finalOutput),
      output_parsed: agentResultTemp1.finalOutput
    };

    return agentResult1;
  });
}
