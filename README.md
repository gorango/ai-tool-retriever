# AI Tool Retriever

A lightweight, zero-dependency library for dynamically selecting the most relevant tools for your Vercel AI SDK-powered agent based on user queries.

It uses in-memory semantic search to find the best tools for the job, ensuring your AI model receives only the necessary tools, saving context space and improving accuracy.

### Features

- **Dynamic Tool Selection**: Automatically selects relevant tools from a larger collection based on semantic similarity.
- **In-Memory Search**: No need for an external vector database. It uses `@xenova/transformers` to run a state-of-the-art sentence transformer model directly in your Node.js environment.
- **Keyword Enhanced**: Improve search accuracy by adding custom `keywords` to your tool definitions.
- **Explicit Tool Forcing**: Users can force tool inclusion with a simple `[toolName]` syntax in their query.
- **Configurable Retrieval**: Fine-tune results with similarity thresholds and control behavior for missing tools.
- **Extensible**: Bring your own vector store (e.g., Supabase, Pinecone, Redis) by implementing a simple `ToolStore` interface.
- **TypeScript Native**: Fully written in TypeScript with comprehensive type definitions.

### Installation

```bash
pnpm add ai-tool-retriever @xenova/transformers
```

### Quick Start

The first time you use the retriever, it will download and cache the embedding model (`~260MB`). This is a one-time operation.

```typescript
import { ToolRetriever, ToolDefinition } from "ai-tool-retriever";
import { z } from "zod";
import { tool } from "ai";
import { streamUI } from "ai/rsc";
import { openai } from "@ai-sdk/openai";

// 1. Define all your available tools using the ToolDefinition type
const allMyTools: ToolDefinition[] = [
	{
		name: "getWeather",
		tool: tool({
			description: "Fetches the weather for a given location.",
			parameters: z.object({ city: z.string() }),
			execute: async ({ city }) => ({ temperature: 22, unit: "celsius" }),
		}),
		// Optional metadata to improve retrieval
		keywords: ["forecast", "temperature", "climate", "rain", "sun"],
	},
	{
		name: "searchFinancialNews",
		tool: tool({
			description:
				"Searches for financial news articles about a company.",
			parameters: z.object({ ticker: z.string() }),
			execute: async ({ ticker }) => ({ headlines: ["..."] }),
		}),
		keywords: ["stocks", "market", "earnings", "sec filings", "investing"],
	},
];

// 2. Initialize the retriever with your tools.
// Must be done in an async context.
async function initializeRetriever() {
	console.log("Initializing retriever and indexing tools...");
	const retriever = await ToolRetriever.create({
		tools: allMyTools,
		// store: new MyCustomPineconeStore() // Optionally, bring your own store
	});
	console.log("Retriever initialized.");
	return retriever;
}

// 3. Use it to get relevant tools for any query
async function processMessage(retriever: ToolRetriever, userInput: string) {
	// Dynamically select tools based on the user's prompt
	const relevantTools = await retriever.retrieve(userInput);
	console.log(
		`Query: "${userInput}" -> Tools: [${Object.keys(relevantTools).join(", ")}]`,
	);

	// Now, pass only these dynamically selected tools to the AI model
	// const { toolResults } = await streamUI({
	// 	model: openai('gpt-4o'),
	// 	prompt: userInput,
	// 	tools: relevantTools,
	// });
	// ... handle results
}

async function main() {
	const retriever = await initializeRetriever();

	await processMessage(retriever, "What are the latest earnings for TSLA?");
	// Query: "What are the latest earnings for TSLA?" -> Tools: [searchFinancialNews]

	await processMessage(retriever, "is it sunny in California?");
	// Query: "is it sunny in California?" -> Tools: [getWeather]

	await processMessage(
		retriever,
		"Give me stock market news for NVDA and also tell me the weather in SF",
	);
	// Query: "Give me stock market news for NVDA and also tell me the weather in SF" -> Tools: [searchFinancialNews, getWeather]
}

main();
```

### Advanced Usage

#### `retrieve()` Options

The `retrieve` method accepts an optional second argument to fine-tune its behavior.

```typescript
const relevantTools = await retriever.retrieve(
	// The user query, which may contain explicit tool syntax
	"Some query that might also ask for [aMissingTool]",
	{
		// Max number of tools to return from semantic search
		matchCount: 5,

		// The minimum cosine similarity score (0 to 1) for a tool to be included
		matchThreshold: 0.75,

		// If true, throws an error if a tool in [syntax] is not found.
		// If false (default), it will console.warn and continue.
		strict: true,
	},
);
// This would throw: Error: Tool 'aMissingTool' from query syntax not found.
```

#### Custom Vector Store

To use a different vector database, simply implement the `ToolStore` interface and pass an instance to the `ToolRetriever` constructor.

```typescript
import type { ToolStore, ToolDefinition } from "ai-tool-retriever";

class MyRedisStore implements ToolStore {
	// ... Redis client setup
	async add(tools: ToolDefinition[]): Promise<void> {
		// Your logic to generate embeddings and store them in Redis
	}
	async search(
		queryEmbedding: number[],
		count: number,
		threshold: number,
	): Promise<ToolDefinition[]> {
		// Your logic to perform a vector search query in Redis,
		// respecting the count and similarity threshold.
	}
}

const retriever = await ToolRetriever.create({
	tools: allMyTools,
	store: new MyRedisStore(),
});
```

### Pre-downloading the Model

You can add a script to your `package.json` to download the model during your build or post-install step. This is highly recommended for production and serverless environments to avoid a cold start.

**`scripts/download-model.ts`**

```typescript
// You can re-export the download script from the library or create your own.
// For example, by creating this file and pointing it to the library's script.
import "ai-tool-retriever/dist/embedding/download.js";
```

**`package.json`**

```json
"scripts": {
  "postinstall": "tsx ./scripts/download-model.ts"
}
```
