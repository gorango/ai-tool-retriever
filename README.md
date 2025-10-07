# AI Tool Retriever

A lightweight, extensible library for dynamically selecting the most relevant tools for your [AI SDK](https://ai-sdk.dev/)-powered agent based on user queries.

It uses semantic search to find the best tools for the job, ensuring your AI model receives only the necessary tools, saving context space and improving accuracy.

### Features

- **Dynamic Tool Selection**: Automatically selects relevant tools from a larger collection based on semantic similarity.
- **Embedding-Powered Search**: No need for an external vector database for simple use cases. It generates vector embeddings for your tools and queries, then finds the most relevant tools using in-memory cosine similarity search.
- **Pluggable Embedding Models**: Defaults to a high-quality local model via `@xenova/transformers`, but allows you to bring your own embedding provider (e.g., OpenAI, Cohere) by implementing a simple `EmbeddingProvider` interface.
- **Extensible Vector Storage**: Bring your own vector store (e.g., Supabase, Pinecone, Redis) by implementing a simple `ToolStore` interface.
- **Keyword Enhanced**: Improve search accuracy by adding custom `keywords` to your tool definitions.
- **Explicit Tool Forcing**: Users can force tool inclusion with a simple `[toolName]` syntax in their query.
- **Configurable Retrieval**: Fine-tune results with similarity thresholds and control behavior for missing tools.
- **Idempotent Syncing**: Built-in content hashing utilities to efficiently sync tools with persistent vector stores, avoiding redundant embedding calculations.
- **TypeScript Native**: Fully written in TypeScript with comprehensive type definitions.

### Installation

```bash
pnpm add ai-tool-retriever @xenova/transformers
```

> **Note:** `@xenova/transformers` is a `peerDependency`. It is required for the default local embedding functionality. If you provide your own custom `embeddingProvider` (e.g., to use an API like OpenAI), you do not need to install it and can safely ignore any peer dependency warnings from the package manager.

### Quick Start

The first time you use the retriever with the default settings, it will download and cache the embedding model (`~260MB`). This is a one-time operation.

> **Note:** You can also [bring your own embedding provider](#using-a-custom-embedding-provider) by implementing a simple `EmbeddingProvider` interface.

```typescript
import { ToolRetriever, ToolDefinition } from "ai-tool-retriever";
import { z } from "zod";
import { tool } from "ai";

// 1. Define all your available tools using the ToolDefinition type
const allMyTools: ToolDefinition[] = [
	{
		name: "getWeather",
		tool: tool({
			description: "Fetches the weather for a given location.",
			parameters: z.object({ city: z.string() }),
		}),
		keywords: ["forecast", "temperature", "climate", "rain", "sun"],
	},
	{
		name: "searchFinancialNews",
		tool: tool({
			description:
				"Searches for financial news articles about a company.",
			parameters: z.object({ ticker: z.string() }),
		}),
		keywords: ["stocks", "market", "earnings", "sec filings", "investing"],
	},
];

// 2. Initialize the retriever with your tools in an async context.
async function initializeRetriever() {
	console.log("Initializing retriever and indexing tools...");
	const retriever = await ToolRetriever.create({ tools: allMyTools });
	console.log("Retriever initialized.");
	return retriever;
}

// 3. Use it to get relevant tools for any query
async function processMessage(retriever: ToolRetriever, userInput: string) {
	const relevantTools = await retriever.retrieve(userInput);
	console.log(
		`Query: "${userInput}" -> Tools: [${Object.keys(relevantTools).join(", ")}]`,
	);
}

async function main() {
	const retriever = await initializeRetriever();
	await processMessage(retriever, "What are the latest earnings for TSLA?");
	await processMessage(retriever, "is it sunny in California?");
}

main();
```

### Advanced Usage

#### `retrieve()` Options

The `retrieve` method accepts an optional second argument to fine-tune its behavior.

```typescript
const relevantTools = await retriever.retrieve(
	"Some query that might also ask for [aMissingTool]",
	{
		matchCount: 5,
		matchThreshold: 0.75,
		strict: true,
	},
);
// This would throw: Error: Tool 'aMissingTool' from query syntax not found.
```

#### Using a Custom Embedding Provider

The retriever's real power comes from its flexibility. You can easily swap the default local embedding model for any external service, like the OpenAI Embeddings API, by creating your own `EmbeddingProvider`.

First, you would implement the `EmbeddingProvider` interface (you may need to add `openai` to your project):

```typescript
// src/my-openai-embedding-provider.ts
import type { EmbeddingProvider } from "ai-tool-retriever/embedding";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = "text-embedding-3-small";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
	// The vector dimension of the model you are using.
	public readonly dimensions = 1536; // for text-embedding-3-small

	async getFloatEmbedding(text: string): Promise<number[]> {
		const response = await openai.embeddings.create({
			model: EMBEDDING_MODEL,
			input: text,
		});
		return response.data.embedding;
	}

	async getFloatEmbeddingsBatch(texts: string[]): Promise<number[][]> {
		const response = await openai.embeddings.create({
			model: EMBEDDING_MODEL,
			input: texts,
		});
		return response.data.map((d) => d.embedding);
	}
}
```

Then, simply pass an instance of your custom provider during the retriever's creation.

```typescript
// index.ts
import { ToolRetriever } from "ai-tool-retriever";
import { OpenAIEmbeddingProvider } from "./my-openai-embedding-provider";

const myTools = [
	/* ... your tool definitions ... */
];

const retriever = await ToolRetriever.create({
	tools: myTools,
	embeddingProvider: new OpenAIEmbeddingProvider(),
});

// Now, all embedding operations will use the OpenAI API instead of the local model.
const relevantTools = await retriever.retrieve(
	"What's the weather like in SF?",
);
```

> **Important**: When using a custom embedding provider with a persistent vector store (like Supabase), ensure the vector column in your database is configured with the correct dimensions (e.g., `VECTOR(1536)` for OpenAI's `text-embedding-3-small`).

#### Using a Custom Vector Store

To use a different vector database, implement the `ToolStore` interface. The `sync` method is called once during initialization to ensure the vector database is up-to-date with your tool definitions.

> **Best Practice: Crafting Text for High-Quality Embeddings**
>
> The quality of the semantic search is highly dependent on the text used to generate the embedding for each tool. For best results, your `ToolStore`'s `sync` method should create a single, rich string that includes the tool's name, its detailed description, and any relevant keywords.
>
> The default `InMemoryStore` uses the following format as its best practice, and replicating this pattern in your custom store will ensure you get great search accuracy:
>
> ```ts
> const textToEmbed = `${definition.name}: ${definition.tool.description}. Keywords: ${definition.keywords?.join(", ")}`.trim();
> ```

For persistent stores (like Supabase or Pinecone), it's crucial to implement `sync` efficiently to avoid re-calculating embeddings for unchanged tools on every application restart. The library provides a `createToolContentHash` utility to help with this.

First, you would need a table and a search function in Supabase. Notice how the vector dimensions in the SQL must match the embedding model you are using.

```sql
-- 1. Create a table to store tool embeddings
CREATE TABLE ai_tools (
  name TEXT PRIMARY KEY,
  description TEXT,
  content_hash TEXT NOT NULL,
  -- Dimension of Xenova/all-MiniLM-L6-v2.
  -- CHANGE THIS to e.g. VECTOR(1536) if using OpenAI's text-embedding-3-small
  embedding VECTOR(384)
);

-- 2. Create a function for vector similarity search
CREATE OR REPLACE FUNCTION match_ai_tools (
  -- This dimension MUST match the table's embedding column
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT
) RETURNS TABLE (name TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT t.name, 1 - (t.embedding <=> query_embedding) AS similarity
  FROM ai_tools t
  WHERE 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

Next, your `ToolStore` implementation would manage syncing and searching:

```typescript
import type { ToolStore, ToolDefinition } from "ai-tool-retriever";
import {
	createToolContentHash,
	EmbeddingService,
} from "ai-tool-retriever/utils";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

/**
 * @example
 * const myTools: ToolDefinition[] = [ { ... }, { ... } ];
 * const retriever = await ToolRetriever.create({
 *   tools: myTools,
 *   store: await SupabaseStore.create(myTools),
 * });
 */
class SupabaseStore implements ToolStore {
	private embeddingService!: EmbeddingService;
	private allToolsMap: Map<string, ToolDefinition>;

	private constructor(tools: ToolDefinition[]) {
		this.allToolsMap = new Map(tools.map((t) => [t.name, t]));
	}

	public static async create(
		tools: ToolDefinition[],
	): Promise<SupabaseStore> {
		const store = new SupabaseStore(tools);
		// Note: This example assumes the default EmbeddingService is used.
		// A more advanced implementation would accept an EmbeddingProvider.
		store.embeddingService = await EmbeddingService.getInstance();
		return store;
	}

	async sync(toolDefinitions: ToolDefinition[]): Promise<void> {
		console.log("Syncing tools with Supabase...");

		const { data: existingTools } = await sb
			.from("ai_tools")
			.select("name, content_hash");

		const existingToolsMap = new Map(
			existing!.map((t) => [t.name, t.content_hash]),
		);

		const currentToolNames = new Set(toolDefinitions.map((t) => t.name));

		const toolsToDelete = Array.from(existingToolsMap.keys()).filter(
			(name) => !currentToolNames.has(name),
		);

		if (toolsToDelete.length > 0) {
			console.log(`Removing ${toolsToDelete.length} obsolete tools...`);
			await sb.from("ai_tools").delete().in("name", toolsToDelete);
		}

		const toolsToUpdate = toolDefinitions.filter((def) => {
			const newHash = createToolContentHash(def);
			// Update if the tool is new or if its content has changed
			return existingToolsMap.get(def.name) !== newHash;
		});

		if (toolsToUpdate.length > 0) {
			console.log(
				`Found ${toolsToUpdate.length} new or updated tools to embed.`,
			);
			const texts = toolsToUpdate.map((t) => {
				const description = t.tool.description || "";
				const keywords = t.keywords?.join(", ") || "";
				return `${t.name}: ${description}. Keywords: ${keywords}`.trim();
			});
			const embeddings =
				await this.embeddingService.getFloatEmbeddingsBatch(texts);

			const records = toolsToUpdate.map((tool, i) => ({
				name: tool.name,
				description: tool.tool.description,
				content_hash: createToolContentHash(tool),
				embedding: embeddings[i],
			}));

			await sb.from("ai_tools").upsert(records, { onConflict: "name" });
		} else {
			console.log("All tools are already up-to-date in Supabase.");
		}
	}

	async search(
		queryEmbedding: number[],
		count: number,
		threshold: number,
	): Promise<ToolDefinition[]> {
		const { data: results } = await sb.rpc("match_ai_tools", {
			query_embedding: queryEmbedding,
			match_count: count,
			match_threshold: threshold,
		});

		if (!results) return [];
		return results
			.map((r) => this.allToolsMap.get(r.name))
			.filter(Boolean) as ToolDefinition[];
	}
}
```

### Advanced: Managing the Embedding Model Lifecycle

> **Note:** This section applies only when using the default local embedding model (`@xenova/transformers`). Custom embedding providers are responsible for their own resource management.

The library is designed for efficiency. When you first use the retriever, it loads the embedding model (`~260MB`) into memory and keeps it there for the lifetime of your application process. This singleton pattern ensures that the model is not wastefully reloaded on every request, making subsequent retrievals very fast.

However, in some scenarios, you might want to manually unload the model to free up memory. For this, the library exposes a static `dispose` method.

#### `EmbeddingService.dispose()`

You can call `EmbeddingService.dispose()` to remove the model from memory and reset the service. This is an `async` operation.

```typescript
import { EmbeddingService } from "ai-tool-retriever/utils";

// This will unload the model and free up its memory.
await EmbeddingService.dispose();
```

> **Note:** You will need to import from the `/utils` path to access the `EmbeddingService`. After calling `dispose`, the next call to `retriever.retrieve()` using the default provider will re-initialize the model, which will take a moment.

#### Use Case 1: Automated Tests (Vitest/Jest)

The most common use case is cleaning up after tests. In test runners that use a long-running process with a watch mode (like Vitest and Jest), the model can remain in memory between test runs. Using `dispose` in a teardown hook ensures each test suite runs in a clean environment.

```typescript
// In your test file (e.g., retriever.test.ts)
import { afterAll, describe, it } from "vitest";
import { EmbeddingService } from "ai-tool-retriever/utils";

describe("My Application Logic", () => {
	// This hook runs once after all tests in this file are complete.
	afterAll(async () => {
		await EmbeddingService.dispose();
	});

	it("should do something with the tool retriever", async () => {
		// Your test logic here...
	});
});
```

#### Use Case 2: Graceful Application Shutdown

For long-running servers, it's good practice to release resources gracefully when the application is shutting down. You can hook into Node.js process signals to dispose of the model.

```typescript
// In your main server file (e.g., index.ts)
import { EmbeddingService } from "ai-tool-retriever/utils";

// ... your server setup ...

async function handleShutdown(signal: string) {
	console.log(`\nReceived ${signal}. Shutting down gracefully...`);
	await EmbeddingService.dispose();
	process.exit(0);
}

// Listen for SIGINT (e.g., Ctrl+C) and SIGTERM (e.g., from Docker or PM2)
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
```
