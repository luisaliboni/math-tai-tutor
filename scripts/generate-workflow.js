/**
 * Script that generates workflow-generated.ts from workflow-paste.ts
 * 
 * This script reads the raw workflow-paste.ts (with NO exports) and generates
 * workflow-generated.ts with proper exports added.
 * 
 * Run: node scripts/generate-workflow.js
 */

const fs = require('fs');
const path = require('path');

const workflowPastePath = path.join(__dirname, '../agents/workflow-paste.ts');
const workflowGeneratedPath = path.join(__dirname, '../agents/workflow-generated.ts');

// Read the raw workflow file
let rawContent = fs.readFileSync(workflowPastePath, 'utf-8');

let generatedContent = rawContent;
let agentFound = false;
let typeFound = false;
let workflowFound = false;

// 1. Find and export myAgent (or agent, mainAgent, etc.)
// First, remove any existing export keyword
generatedContent = generatedContent.replace(/export\s+const\s+myAgent\s*=/g, 'const myAgent =');
generatedContent = generatedContent.replace(/export\s+const\s+agent\s*=\s*new\s+Agent\(/g, 'const agent = new Agent(');
generatedContent = generatedContent.replace(/export\s+const\s+mainAgent\s*=\s*new\s+Agent\(/g, 'const mainAgent = new Agent(');

// Try to find and export myAgent first (most common)
if (generatedContent.includes('const myAgent = new Agent(')) {
  generatedContent = generatedContent.replace(/const\s+myAgent\s*=\s*new\s+Agent\(/g, 'export const myAgent = new Agent(');
  agentFound = true;
} else if (generatedContent.includes('const agent = new Agent(')) {
  generatedContent = generatedContent.replace(/const\s+agent\s*=\s*new\s+Agent\(/g, 'export const agent = new Agent(');
  agentFound = true;
} else if (generatedContent.includes('const mainAgent = new Agent(')) {
  generatedContent = generatedContent.replace(/const\s+mainAgent\s*=\s*new\s+Agent\(/g, 'export const mainAgent = new Agent(');
  agentFound = true;
}

if (!agentFound) {
  console.warn('⚠️  Could not find agent declaration. Looking for: const myAgent = new Agent({ or const agent = new Agent({');
}

// 2. Find and export WorkflowInput type
// First, remove any existing export keyword
generatedContent = generatedContent.replace(/export\s+type\s+WorkflowInput\s*=/g, 'type WorkflowInput =');
generatedContent = generatedContent.replace(/export\s+interface\s+WorkflowInput/g, 'interface WorkflowInput');

if (generatedContent.includes('type WorkflowInput =')) {
  generatedContent = generatedContent.replace(/type\s+WorkflowInput\s*=/g, 'export type WorkflowInput =');
  typeFound = true;
} else if (generatedContent.includes('interface WorkflowInput')) {
  generatedContent = generatedContent.replace(/interface\s+WorkflowInput/g, 'export interface WorkflowInput');
  typeFound = true;
}

if (!typeFound) {
  console.warn('⚠️  Could not find WorkflowInput type. Looking for: type WorkflowInput = or interface WorkflowInput');
  // Add a default if not found
  if (!generatedContent.includes('WorkflowInput')) {
    generatedContent = `export type WorkflowInput = { input_as_text: string };\n\n${generatedContent}`;
    typeFound = true;
  }
}

// 3. Find runWorkflow function and wrap it with return handling
// First, remove any existing export keyword
generatedContent = generatedContent.replace(/export\s+const\s+runWorkflow\s*=\s*async/g, 'const runWorkflow = async');
generatedContent = generatedContent.replace(/export\s+const\s+workflow\s*=\s*async/g, 'const workflow = async');
generatedContent = generatedContent.replace(/export\s+async\s+function\s+runWorkflow/g, 'async function runWorkflow');
generatedContent = generatedContent.replace(/export\s+async\s+function\s+workflow/g, 'async function workflow');

let rawWorkflowName = null;
let rawWorkflowPattern = null;

if (generatedContent.includes('const runWorkflow = async')) {
  rawWorkflowName = 'runWorkflow';
  rawWorkflowPattern = /const\s+runWorkflow\s*=\s*async/g;
  workflowFound = true;
} else if (generatedContent.includes('const workflow = async')) {
  rawWorkflowName = 'workflow';
  rawWorkflowPattern = /const\s+workflow\s*=\s*async/g;
  workflowFound = true;
} else if (generatedContent.includes('async function runWorkflow')) {
  rawWorkflowName = 'runWorkflow';
  rawWorkflowPattern = /async\s+function\s+runWorkflow/g;
  workflowFound = true;
}

if (!workflowFound) {
  console.warn('⚠️  Could not find workflow function. Looking for: const runWorkflow = async( or async function runWorkflow(');
} else {
  // Rename the original function to rawRunWorkflow (internal)
  generatedContent = generatedContent.replace(rawWorkflowPattern, `const rawRunWorkflow = async`);
  if (rawWorkflowPattern.source.includes('function')) {
    generatedContent = generatedContent.replace(rawWorkflowPattern, `async function rawRunWorkflow`);
  }
  
  // Add wrapped version at the end of the file
  const wrapperCode = `

/**
 * Wrapped workflow function that ensures proper return value
 * This wraps the raw workflow function and ensures it always returns a value
 */
export const runWorkflow = async (workflow: WorkflowInput) => {
  // Call the raw workflow function
  const result = await rawRunWorkflow(workflow);

  // Ensure we return something - if the raw workflow doesn't return, we handle it
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
  generatedContent = generatedContent + wrapperCode;
}

// Add header comment
const header = `/**
 * AUTO-GENERATED FILE - DO NOT MODIFY MANUALLY
 * 
 * This file is automatically generated from workflow-paste.ts
 * It adds the necessary exports and wrapper logic so other files can import from it.
 * 
 * To regenerate: node scripts/generate-workflow.js
 * 
 * The source file (workflow-paste.ts) has NO exports - it's completely raw.
 * This file:
 * - Adds exports to myAgent, WorkflowInput, and runWorkflow
 * - Wraps runWorkflow to ensure it always returns a value
 */

`;

generatedContent = header + generatedContent;

// Write the generated file
fs.writeFileSync(workflowGeneratedPath, generatedContent, 'utf-8');

console.log('✅ Generated workflow-generated.ts from workflow-paste.ts');
console.log(`   - Agent found: ${agentFound ? '✅' : '❌'}`);
console.log(`   - Type found: ${typeFound ? '✅' : '❌'}`);
console.log(`   - Workflow found: ${workflowFound ? '✅' : '❌'}`);

