# AI Tool Retriever

A lightweight, zero-dependency library for dynamically selecting the most relevant tools for your Vercel AI SDK-powered agent based on user queries.

It uses in-memory semantic search to find the best tools for the job, ensuring your AI model receives only the necessary tools, saving context space and improving accuracy.

### Features

- **Dynamic Tool Selection**: Automatically selects relevant tools from a larger collection based on semantic similarity.
- **In-Memory Search**: No need for an external vector database. It uses `@xenova/transformers` to run a state-of-the-art sentence transformer model directly in your Node.js environment.
- **Keyword Enhanced**: Improve search accuracy by adding custom `keywords` to your tool definitions.
- **Explicit Tool Forcing**: Users can force tool inclusion with a simple `[toolName]` syntax in their query.
- **Extensible**: Bring your own vector store (e.g., Supabase, Pinecone, Redis) by implementing a simple `ToolStore` interface.
- **TypeScript Native**: Fully written in TypeScript with comprehensive type definitions.

### Installation

```bash
pnpm add ai-tool-retriever @xenova/transformers
```

### Quick Start

The first time you use the retriever, it will download and cache the embedding model (`~260MB`). This is a one-time operation.

```typescript
import { ToolRetriever } from "ai-tool-retriever";
import { z } from "zod";
import type { Tool } from "ai";
import { streamUI } from "ai/rsc";
import { openai } from "@ai-sdk/openai";

// Extend the AI SDK Tool type for the retriever
type MyTool = Tool<any, any> & { keywords?: string[] };

// 1. Define all your available tools
const allMyTools: MyTool[] = [
	{
		name: "getWeather",
		description: "Fetches the weather for a given location.",
		parameters: z.object({ city: z.string() }),
		execute: async ({ city }) => ({ temperature: 22, unit: "celsius" }),
		// Custom metadata to improve retrieval
		keywords: ["forecast", "temperature", "climate", "rain", "sun"],
	},
	{
		name: "searchFinancialNews",
		description: "Searches for financial news articles about a company.",
		parameters: z.object({ ticker: z.string() }),
		execute: async ({ ticker }) => ({ headlines: ["..."] }),
		keywords: ["stocks", "market", "earnings", "sec filings", "investing"],
	},
];

// 2. Initialize the retriever with your tools
const retriever = new ToolRetriever({
	tools: allMyTools,
	// store: new MyCustomPineconeStore() // Optionally, bring your own store
});

// 3. Use it to get relevant tools for any query
async function processMessage(userInput: string) {
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
	// })

	// ... handle results
}

async function main() {
	await processMessage("What are the latest earnings for TSLA?");
	// Query: "What are the latest earnings for TSLA?" -> Tools: [searchFinancialNews]

	await processMessage("is it sunny in California?");
	// Query: "is it sunny in California?" -> Tools: [getWeather]

	await processMessage(
		"Give me stock market news for NVDA and also tell me the weather in SF",
	);
	// Query: "Give me stock market news for NVDA and also tell me the weather in SF" -> Tools: [searchFinancialNews, getWeather]
}

main();
```

### Advanced Usage: Custom Vector Store

To use a different vector database, simply implement the `ToolStore` interface and pass an instance to the `ToolRetriever` constructor.

```typescript
import type { ToolStore, ToolWithMetadata } from "ai-tool-retriever/store";
import type { Tool } from "ai";

class MyRedisStore implements ToolStore {
	// ... redis client setup
	async add(tools: Tool<any, any>[]): Promise<void> {
		// Your logic to generate embeddings and store them in Redis
	}
	async search(
		queryEmbedding: number[],
		count: number,
	): Promise<Tool<any, any>[]> {
		// Your logic to perform a vector search query in Redis
	}
}

const retriever = new ToolRetriever({
	tools: allMyTools,
	store: new MyRedisStore(),
});
```

### Pre-downloading the Model

You can add a script to your `package.json` to download the model during your build or post-install step.

**`src/embedding/download.ts`**

```typescript
import { EmbeddingService } from "./service";

console.log("Starting model download...");
// getInstance will trigger the download and cache the model
EmbeddingService.getInstance()
	.then(() => {
		console.log("Model download complete and cached successfully.");
	})
	.catch((err) => {
		console.error("Failed to download model:", err);
	});
```

**`package.json`**

```json
"scripts": {
  "postinstall": "tsx ./src/embedding/download.ts"
}
```
