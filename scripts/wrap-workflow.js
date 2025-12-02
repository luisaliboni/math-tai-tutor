/**
 * Build script that wraps workflow-paste.ts with exports
 * 
 * This script reads workflow-paste.ts (which can have NO exports)
 * and creates a wrapped version with proper exports.
 * 
 * Run: node scripts/wrap-workflow.js
 */

const fs = require('fs');
const path = require('path');

const workflowPastePath = path.join(__dirname, '../agents/workflow-paste.ts');
const workflowWrapperPath = path.join(__dirname, '../agents/workflow-wrapper.ts');

// Read the raw workflow file
const rawContent = fs.readFileSync(workflowPastePath, 'utf8');

// Check if myAgent and runWorkflow are already exported
const hasMyAgentExport = rawContent.includes('export const myAgent') || rawContent.includes('export const agent');
const hasRunWorkflowExport = rawContent.includes('export const runWorkflow') || rawContent.includes('export const workflow');
const hasWorkflowInputExport = rawContent.includes('export type WorkflowInput') || rawContent.includes('export interface WorkflowInput');

// If everything is already exported, we can use direct imports
if (hasMyAgentExport && hasRunWorkflowExport && hasWorkflowInputExport) {
  // Generate wrapper that just re-exports
  const wrapperContent = `/**
 * WORKFLOW WRAPPER - Auto-generated from workflow-paste.ts
 * 
 * This file automatically wraps the raw workflow from workflow-paste.ts
 * It handles exports and return statements so workflow-paste.ts can remain completely raw.
 * 
 * DO NOT modify this file manually - it's generated from workflow-paste.ts
 */

import { 
  myAgent as rawMyAgent,
  runWorkflow as rawRunWorkflow,
  type WorkflowInput as RawWorkflowInput
} from "./workflow-paste";

// Re-export the type
export type WorkflowInput = RawWorkflowInput;

// Re-export the agent
export const myAgent = rawMyAgent;

/**
 * Wrapped workflow function that ensures proper return value
 */
export const runWorkflow = async (workflow: WorkflowInput) => {
  const result = await rawRunWorkflow(workflow);
  
  if (result === undefined) {
    console.warn("Workflow function did not return a value. Returning default structure.");
    return {
      output_text: "",
      output_parsed: null
    };
  }
  
  return result;
};
`;

  fs.writeFileSync(workflowWrapperPath, wrapperContent);
  console.log('✅ Wrapper generated successfully (direct imports)');
} else {
  console.log('⚠️  workflow-paste.ts needs exports. Please add:');
  if (!hasMyAgentExport) console.log('   - export const myAgent = ...');
  if (!hasRunWorkflowExport) console.log('   - export const runWorkflow = async (workflow: WorkflowInput) => { ... }');
  if (!hasWorkflowInputExport) console.log('   - export type WorkflowInput = { input_as_text: string };');
  process.exit(1);
}


