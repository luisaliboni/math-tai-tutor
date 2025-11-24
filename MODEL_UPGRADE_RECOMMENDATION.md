# Model Upgrade Recommendation

## Current Model
The application currently uses **`gpt-5`** in the agent configuration.

## Recommended: Most Intelligent Models

Since the `agents/` folder cannot be modified, here are the recommended model upgrades you can make manually:

### Option 1: o1-preview (Most Intelligent for Reasoning)
**Best for:** Complex mathematical reasoning, step-by-step problem solving, deep analysis

```typescript
// In agents/workflow.ts and agents/agent-factory.ts
model: "o1-preview"
```

**Pros:**
- Highest reasoning capability
- Best for complex math problems
- Excellent at step-by-step explanations

**Cons:**
- Slower response times
- More expensive
- No streaming support (may need adjustments)

### Option 2: o1 (Latest Reasoning Model)
**Best for:** Advanced reasoning with better performance than o1-preview

```typescript
// In agents/workflow.ts and agents/agent-factory.ts
model: "o1"
```

**Pros:**
- Latest reasoning model
- Better performance than o1-preview
- Excellent for complex problems

**Cons:**
- May not support streaming
- Higher cost

### Option 3: gpt-4o (Best Balance)
**Best for:** Fast responses with high quality, supports streaming

```typescript
// In agents/workflow.ts and agents/agent-factory.ts
model: "gpt-4o"
```

**Pros:**
- Fast responses
- Supports streaming (current architecture)
- High quality
- Good cost/performance balance

**Cons:**
- Not as strong in complex reasoning as o1 models

## How to Upgrade

1. **Edit `agents/workflow.ts`:**
   - Change line 19: `model: "gpt-5"` → `model: "o1-preview"` (or your preferred model)

2. **Edit `agents/agent-factory.ts`:**
   - Change line 26: `model: "gpt-5"` → `model: "o1-preview"` (or your preferred model)

3. **Note on Streaming:**
   - o1 models may not support streaming. If you use o1, you may need to adjust the streaming architecture.
   - gpt-4o fully supports streaming and works with the current implementation.

## Recommendation

For a **math tutoring application**, I recommend:
- **Primary:** `gpt-4o` - Best balance of speed, quality, and streaming support
- **Alternative:** `o1-preview` - If you prioritize reasoning quality over speed and can handle non-streaming responses

## Testing

After changing the model:
1. Test with simple questions first
2. Test with complex math problems
3. Verify streaming still works (if using gpt-4o)
4. Monitor API costs

