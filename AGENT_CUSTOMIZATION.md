# Agent Customization Guide

This guide shows you how to modify the AI agent workflow to match your needs.

## Where to Make Changes

The main agent configuration is in: [`agents/workflow.ts`](agents/workflow.ts)

## Common Customizations

### 1. Change Agent Instructions

Modify the `instructions` field to change how the agent behaves:

```typescript
const myAgent = new Agent({
  name: "Math Tutor AI",
  instructions: `You are a helpful math tutor specializing in calculus.

  Always:
  - Use LaTeX for equations (inline: $...$ and display: $$...$$)
  - Break down complex problems into steps
  - Provide examples
  - Check for understanding

  Format:
  - Start with a brief conceptual explanation
  - Show the formula
  - Work through an example
  - Suggest practice problems`,
  // ... rest of config
});
```

### 2. Change the Model

Switch between different OpenAI models:

```typescript
const myAgent = new Agent({
  // ... other config
  model: "gpt-4o",  // Options: "gpt-4o", "gpt-4-turbo", "gpt-4", "o1-preview", "o1-mini"
  // ... rest of config
});
```

**Model recommendations:**
- `gpt-4o` - Best balance of speed and quality (recommended)
- `o1-preview` - Best for complex reasoning (slower, more expensive)
- `o1-mini` - Fast and efficient for simple tasks

### 3. Modify Output Schema

The agent outputs JSON. Change what fields it returns:

```typescript
// Current schema
const MyAgentSchema = z.object({
  message: z.string(),
  needs_clarification: z.boolean().optional()
});

// Extended example - add more fields
const MyAgentSchema = z.object({
  message: z.string(),
  needs_clarification: z.boolean().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  related_topics: z.array(z.string()).optional(),
  practice_problems: z.array(z.string()).optional(),
});
```

**Important:** If you add fields to the schema, update the instructions to tell the agent to populate them!

### 4. Add or Remove Tools

The agent can use different tools:

```typescript
const myAgent = new Agent({
  // ... other config
  tools: [
    webSearchPreview,      // Allows web searches
    codeInterpreter,       // Runs Python code
    // Add more tools here
  ],
  // ... rest of config
});
```

**Available tools:**
- `webSearchTool` - Search the web for current information
- `codeInterpreterTool` - Execute Python code (great for calculations, graphing)

### 5. Adjust Reasoning Effort

Control how much "thinking" the model does:

```typescript
const myAgent = new Agent({
  // ... other config
  modelSettings: {
    reasoning: {
      effort: "medium",  // Options: "low", "medium", "high"
      summary: "auto"     // Options: "auto", "enabled", "disabled"
    },
    store: true  // Store conversations for analysis
  }
});
```

**Effort levels:**
- `low` - Fast responses, less complex reasoning
- `medium` - Balanced (recommended)
- `high` - More thorough reasoning, slower responses

## Example: Create a Calculus-Specific Tutor

Here's a complete example customized for calculus:

```typescript
const MyAgentSchema = z.object({
  message: z.string(),
  needs_clarification: z.boolean().optional(),
  step_by_step: z.boolean().optional(),
  graph_needed: z.boolean().optional(),
});

const myAgent = new Agent({
  name: "Calculus Tutor",
  instructions: `You are an expert calculus tutor specializing in derivatives, integrals, and limits.

Format all equations in LaTeX:
- Inline math: $f(x) = x^2$
- Display math: $$\\int_0^1 x^2 dx = \\frac{1}{3}$$

When solving problems:
1. State the problem clearly
2. Identify the technique needed
3. Show step-by-step work with explanations
4. Verify the answer
5. Suggest similar practice problems

Set step_by_step to true if the explanation includes multiple steps.
Set graph_needed to true if visualization would help.`,

  model: "gpt-4o",
  tools: [codeInterpreter],  // For graphing and calculations
  outputType: MyAgentSchema,

  modelSettings: {
    reasoning: {
      effort: "medium",
      summary: "auto"
    },
    store: true
  }
});
```

## Testing Your Changes

After modifying `agents/workflow.ts`:

1. Save the file
2. Restart the dev server (if running):
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```
3. Go to http://localhost:3000
4. Test with a math question
5. Check the response format and content

## Handling Different Output Formats

The app automatically extracts the `message` field from the agent's JSON output. If you want to use other fields:

1. Modify [`components/ChatInterface.tsx`](components/ChatInterface.tsx)
2. Update the `sendMessage` function to handle additional fields:

```typescript
const data = await response.json();

// Extract message
const assistantMessage: Message = {
  id: (Date.now() + 1).toString(),
  role: 'assistant',
  content: data.message,
  created_at: new Date().toISOString()
};

// Handle additional fields
if (data.fullOutput.practice_problems) {
  console.log('Practice problems:', data.fullOutput.practice_problems);
  // Could display these separately in the UI
}
```

## Best Practices

1. **Test incrementally** - Make one change at a time
2. **Keep instructions clear** - The agent performs better with specific, concise instructions
3. **Use examples in instructions** - Show the agent the format you want
4. **Validate output** - Make sure the schema matches what you need
5. **Monitor costs** - Higher reasoning effort = more expensive API calls

## Need Help?

- OpenAI Agents SDK Docs: https://platform.openai.com/docs/agents
- LaTeX Reference: https://katex.org/docs/supported.html
- Zod Schema Docs: https://zod.dev

## Common Issues

**Agent not following instructions?**
- Make instructions more specific
- Add examples of desired output format
- Try a more powerful model (e.g., gpt-4o)

**LaTeX not rendering?**
- Ensure you're using proper delimiters: `$...$` or `$$...$$`
- Escape special characters if needed
- Check browser console for KaTeX errors

**Output format wrong?**
- Verify the schema matches the instructions
- Check that the app is extracting the right field
- Look at the raw JSON in browser network tab
