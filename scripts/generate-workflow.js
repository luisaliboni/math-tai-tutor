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

let agentName = null; // Track which agent name was found

// Try to find and export myAgent first (most common)
// Check for various case variations
if (generatedContent.includes('const myAgent = new Agent(')) {
  generatedContent = generatedContent.replace(/const\s+myAgent\s*=\s*new\s+Agent\(/g, 'export const myAgent = new Agent(');
  agentFound = true;
  agentName = 'myAgent';
} else if (generatedContent.includes('const myagent = new Agent(')) {
  // Export as 'myagent' first, then create alias as 'myAgent'
  generatedContent = generatedContent.replace(/const\s+myagent\s*=\s*new\s+Agent\(/g, 'export const myagent = new Agent(');
  agentFound = true;
  agentName = 'myagent';
} else if (generatedContent.includes('const agent = new Agent(')) {
  // Export as 'agent' first
  const beforeReplace = generatedContent;
  generatedContent = generatedContent.replace(/const\s+agent\s*=\s*new\s+Agent\(/g, 'export const agent = new Agent(');
  if (!generatedContent.includes('export const agent = new Agent(')) {
    console.error('❌ Failed to export agent! Replacement did not work.');
    console.error('Before replace had const agent:', beforeReplace.includes('const agent = new Agent('));
    console.error('After replace has export const agent:', generatedContent.includes('export const agent = new Agent('));
  }
  agentFound = true;
  agentName = 'agent';
} else if (generatedContent.includes('const mainAgent = new Agent(')) {
  generatedContent = generatedContent.replace(/const\s+mainAgent\s*=\s*new\s+Agent\(/g, 'export const mainAgent = new Agent(');
  agentFound = true;
  agentName = 'mainAgent';
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

// 3. Find and export runWorkflow function (or workflow, executeWorkflow, etc.)
// First, remove any existing export keyword
generatedContent = generatedContent.replace(/export\s+const\s+runWorkflow\s*=\s*async/g, 'const runWorkflow = async');
generatedContent = generatedContent.replace(/export\s+const\s+workflow\s*=\s*async/g, 'const workflow = async');
generatedContent = generatedContent.replace(/export\s+async\s+function\s+runWorkflow/g, 'async function runWorkflow');
generatedContent = generatedContent.replace(/export\s+async\s+function\s+workflow/g, 'async function workflow');

if (generatedContent.includes('const runWorkflow = async')) {
  generatedContent = generatedContent.replace(/const\s+runWorkflow\s*=\s*async/g, 'export const runWorkflow = async');
  workflowFound = true;
} else if (generatedContent.includes('const workflow = async')) {
  generatedContent = generatedContent.replace(/const\s+workflow\s*=\s*async/g, 'export const workflow = async');
  workflowFound = true;
} else if (generatedContent.includes('async function runWorkflow')) {
  generatedContent = generatedContent.replace(/async\s+function\s+runWorkflow/g, 'export async function runWorkflow');
  workflowFound = true;
}

if (!workflowFound) {
  console.warn('⚠️  Could not find workflow function. Looking for: const runWorkflow = async( or async function runWorkflow(');
}

// Wrap the workflow function to ensure it always returns a value
// We'll rename the original to rawRunWorkflow and create a wrapped version
if (workflowFound) {
  // Find the workflow function name
  let workflowName = 'runWorkflow';
  if (generatedContent.includes('export const workflow = async')) {
    workflowName = 'workflow';
  } else if (generatedContent.includes('export async function workflow')) {
    workflowName = 'workflow';
  }
  
  // Rename the exported function to rawRunWorkflow (internal)
  generatedContent = generatedContent.replace(
    new RegExp(`export const ${workflowName} = async`, 'g'),
    `const rawRunWorkflow = async`
  );
  generatedContent = generatedContent.replace(
    new RegExp(`export async function ${workflowName}`, 'g'),
    `async function rawRunWorkflow`
  );
  
  // Add wrapped version at the end
  const wrapperCode = `

/**
 * Wrapped workflow function that ensures proper return value
 * This wraps the raw workflow function and ensures it always returns a value
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
  generatedContent = generatedContent + wrapperCode;
}

// Add myAgent export alias if agent was found with a different name
if (agentFound && agentName && agentName !== 'myAgent') {
  const aliasCode = `

// Export alias for compatibility with existing codebase
export const myAgent = ${agentName};
`;
  generatedContent = generatedContent + aliasCode;
}

// Also export agent1 alias if myagent2 exists (for multi-agent workflows)
if (generatedContent.includes('const myagent2 = new Agent(') || generatedContent.includes('export const myagent2 = new Agent(')) {
  // Export myagent2 as agent1 for compatibility
  if (!generatedContent.includes('export const agent1 =')) {
    const agent1Alias = `

// Export alias for multi-agent workflow compatibility
export const agent1 = myagent2;
`;
    generatedContent = generatedContent + agent1Alias;
  }
}

// Add header comment
const header = `/**
 * AUTO-GENERATED FILE - DO NOT MODIFY MANUALLY
 * 
 * This file is automatically generated from workflow-paste.ts
 * It adds exports and wraps the workflow function to ensure proper return values.
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

// Verify and fix exports before writing (safety check)
if (agentFound && agentName === 'agent') {
  if (!generatedContent.includes('export const agent = new Agent(')) {
    console.warn('⚠️  Agent export missing, fixing...');
    generatedContent = generatedContent.replace(/const\s+agent\s*=\s*new\s+Agent\(/g, 'export const agent = new Agent(');
  }
  // Ensure myAgent alias exists
  if (!generatedContent.includes('export const myAgent = agent') && !generatedContent.includes('export const myAgent =')) {
    // Add myAgent alias at the end (before the wrapper code if it exists)
    const aliasCode = '\n\n// Export alias for compatibility with existing codebase\nexport const myAgent = agent;';
    // Insert before the wrapper code section
    if (generatedContent.includes('Wrapped workflow function')) {
      generatedContent = generatedContent.replace(/(\n\/\*\*\n \* Wrapped workflow function)/, aliasCode + '$1');
    } else {
      generatedContent = generatedContent + aliasCode;
    }
  }
}

// Write the generated file
fs.writeFileSync(workflowGeneratedPath, generatedContent, 'utf-8');

console.log('✅ Generated workflow-generated.ts from workflow-paste.ts');
console.log(`   - Agent found: ${agentFound ? '✅' : '❌'}`);
console.log(`   - Type found: ${typeFound ? '✅' : '❌'}`);
console.log(`   - Workflow found: ${workflowFound ? '✅' : '❌'}`);

