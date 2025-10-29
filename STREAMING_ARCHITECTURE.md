# Streaming Architecture

This document explains how streaming is implemented in a way that's independent from your workflow changes.

## Architecture Overview

```
User Message → API Route → Workflow → Stream Adapter → SSE → Frontend
```

## Key Files

### 1. **`lib/stream-adapter.ts`** (The Abstraction Layer)
This file contains the streaming logic that adapts OpenAI Agents SDK streams into a consistent format.

- `adaptAgentStream()`: Converts OpenAI Agents SDK `StreamedRunResult` into standardized events
- `wrapWorkflowStream()`: A simpler wrapper for custom stream implementations

**Key benefit**: All streaming logic is isolated here. When the SDK or your workflow changes, you only need to update this adapter if the stream format changes.

### 2. **`agents/workflow.ts`** (Your Workflow)
Your workflow file now has two functions:

- `runWorkflow()`: Non-streaming version (waits for complete response)
- `createWorkflowStream()`: Streaming version (returns `StreamedRunResult`)

**Key benefit**: The `createWorkflowStream()` function is minimal (just ~25 lines). You can change everything in `runWorkflow()` without affecting streaming. Just make sure:
- Your agent is exported or accessible
- The `createWorkflowStream()` calls `runner.run()` with `{ stream: true }`

### 3. **`app/api/chat/route.ts`** (API Route)
Uses both the workflow and adapter:

```typescript
// Get streamed result from workflow
const streamedResult = await createWorkflowStream({ input_as_text: message });

// Adapt it to standardized events
const adaptedStream = adaptAgentStream(
  streamedResult,
  (output) => output.message // How to extract the final message
);

// Stream to frontend via SSE
for await (const chunk of adaptedStream) {
  // Send to client
}
```

### 4. **Frontend Components** (`components/ChatInterface.tsx`, etc.)
Consume the SSE stream and update the UI in real-time.

## Event Types

The stream adapter produces three event types:

```typescript
type StreamEvent =
  | { type: 'text'; content: string }      // Incremental text chunks
  | { type: 'done'; message: string; output?: any }  // Final output
  | { type: 'error'; message: string }     // Errors
```

## When You Change Your Workflow

### Scenario 1: Changing Agent Instructions/Tools
✅ **No streaming changes needed**

Just update the agent configuration in `workflow.ts`:
```typescript
const myAgent = new Agent({
  name: "My agent",
  instructions: "Your new instructions...",
  tools: [newTool, anotherTool],
  // ...
});
```

### Scenario 2: Changing the Output Schema
⚠️ **Minor change needed**

1. Update your schema in `workflow.ts`:
```typescript
const MyAgentSchema = z.object({
  response: z.string(),  // Changed from 'message'
  confidence: z.number()
});
```

2. Update the message extractor in `app/api/chat/route.ts`:
```typescript
const adaptedStream = adaptAgentStream(
  streamedResult,
  (output) => output.response  // Changed from output.message
);
```

### Scenario 3: Using a Different SDK or Completely Custom Streaming
⚠️ **Update the adapter**

If you switch to a different SDK or custom implementation:

1. Create a new adapter function in `lib/stream-adapter.ts`
2. Update `app/api/chat/route.ts` to use the new adapter
3. Keep the same event types (`StreamEvent`) for consistency

## Testing Streaming

To test if streaming is working:

1. Open the chat interface
2. Send a message
3. You should see the response appear word-by-word, not all at once
4. Check browser DevTools → Network → Find the request → Should show `text/event-stream`

## Benefits of This Architecture

1. **Separation of Concerns**: Workflow logic is separate from streaming logic
2. **Easy Maintenance**: Change your workflow without touching streaming code
3. **Consistent Interface**: Frontend always receives the same event types
4. **Testable**: Each layer can be tested independently
5. **Flexible**: Easy to swap out the streaming implementation if needed
