# AI Tool Retriever

A lightweight, extensible library for dynamically selecting the most relevant tools for your [AI SDK](https://ai-sdk.dev/)-powered agent based on user queries.

It uses semantic search to find the best tools for the job, ensuring your AI model receives only the necessary tools, saving context space and improving accuracy.

This library provides a lean core and a set of optional providers, allowing you to choose your own embedding models and vector stores without inheriting unnecessary dependencies.

## Features

- **Dynamic Tool Selection**: Automatically selects relevant tools from a larger collection based on semantic similarity.
- **Pluggable Architecture**: The core library is implementation-agnostic. You explicitly choose and provide your embedding model and vector store.
- **Default Providers Included**: Get started quickly with a high-quality local embedding model (`@xenova/transformers`) and an in-memory vector store, available as optional providers.
- **Bring Your Own Tech**: Easily use external services like OpenAI, Cohere, Supabase, Pinecone, or Redis by implementing simple `EmbeddingProvider` and `ToolStore` interfaces.
- **Keyword Enhanced**: Improve search accuracy by adding custom `keywords` to your tool definitions.
- **Explicit Tool Forcing**: Users can force tool inclusion with a simple `[toolName]` syntax in their query.
- **Configurable Retrieval**: Fine-tune results with similarity thresholds and control behavior for missing tools.
- **Idempotent Syncing**: Built-in content hashing utilities to efficiently sync tools with persistent vector stores, avoiding redundant embedding calculations.
- **TypeScript Native**: Comprehensive type definitions with helpful JSDocs.

### Core Library

First, install the core retriever library. It is implementation-agnostic and has a peer dependency on the Vercel AI SDK.

```bash
pnpm add ai-tool-retriever ai
```

#### Optional: Default Local Embeddings

If you want to use the default, in-memory provider powered by a local model, you must also install its dependency, `@xenova/transformers`.

```bash
pnpm add @xenova/transformers
```

> **Note:** `@xenova/transformers` is **only** required if you import from `ai-tool-retriever/providers/embedding/transformers`. If you provide your own embedding solution (e.g., using the OpenAI API), you do not need to install it.

## Quick Start

You must explicitly initialize and provide the embedding model and tool store. The library provides defaults for a local model and an in-memory store.

The first time you use the default `TransformersEmbeddingProvider`, it will download and cache the embedding model (`~260MB`). This is a one-time operation.

```typescript
import { ToolRetriever, ToolDefinition } from "ai-tool-retriever";
import { TransformersEmbeddingProvider } from "ai-tool-retriever/providers/embedding/transformers";
import { InMemoryStore } from "ai-tool-retriever/providers/store/in-memory";
import { z } from "zod";
import { tool } from "ai";

// 1. Define all your available tools
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

// 2. Initialize the retriever with your chosen providers in an async context.
async function initializeRetriever() {
	console.log("Initializing retriever and indexing tools...");

	// Explicitly create your embedding provider
	const embeddingProvider = await TransformersEmbeddingProvider.create();

	// Explicitly create your store
	const store = new InMemoryStore();

	// Pass the components to the retriever. The retriever handles the rest.
	const retriever = await ToolRetriever.create({
		tools: allMyTools,
		embeddingProvider,
		store,
	});

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

---

## Advanced Usage

### `retrieve()` Options

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
// This would throw: ToolNotFoundError: Tool 'aMissingTool' from query syntax not found.
```

***

### Using a Custom Embedding Provider

The retriever's real power comes from its flexibility. You can easily use any external service, like the OpenAI Embeddings API, by creating your own `EmbeddingProvider`.

First, you would implement the `EmbeddingProvider` interface (you may need to add `openai` to your project):

```typescript
// src/my-openai-embedding-provider.ts
import type { EmbeddingProvider } from "ai-tool-retriever";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = "text-embedding-3-small";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
	// It's good practice to expose the dimensions for vector store setup.
	public readonly dimensions = 1536; // for text-embedding-3-small

	async getFloatEmbeddingsBatch(texts: string[]): Promise<number[][]> {
		const response = await openai.embeddings.create({
			model: EMBEDDING_MODEL,
			input: texts,
		});
		return response.data.map((d) => d.embedding);
	}
}
```

Then, simply create an instance of your custom provider and pass it to the retriever during creation.

```typescript
// index.ts
import { ToolRetriever } from "ai-tool-retriever";
import { OpenAIEmbeddingProvider } from "./my-openai-embedding-provider";
import { InMemoryStore } from "ai-tool-retriever/providers/store/in-memory";

const myTools = [
	/* ... your tool definitions ... */
];
const embeddingProvider = new OpenAIEmbeddingProvider();
const store = new InMemoryStore();

const retriever = await ToolRetriever.create({
	tools: myTools,
	embeddingProvider,
	store,
});

// Now, all embedding operations will use the OpenAI API.
const relevantTools = await retriever.retrieve(
	"What's the weather like in SF?",
);
```

> **Important**: When using a custom embedding provider with a persistent vector store (like Supabase), ensure the vector column in your database is configured with the correct dimensions (e.g., `VECTOR(1536)` for OpenAI's `text-embedding-3-small`).

***

### Using a Custom Vector Store

To use a different vector database, implement the `ToolStore` interface. The `sync` method is called once during initialization to ensure the vector database is up-to-date with your tool definitions.

> **Best Practice: Crafting Text for High-Quality Embeddings**
>
> The quality of the semantic search is highly dependent on the text used to generate the embedding for each tool. For best results, your `ToolStore`'s `sync` method should create a single, rich string that includes the tool's name, its detailed description, and any relevant keywords.
>
> The default `InMemoryStore` uses the following format as its best practice, and replicating this pattern in your custom store will ensure you get great search accuracy:
>
> ```ts
> const textToEmbed =
> 	`${definition.name}: ${definition.tool.description}. Keywords: ${definition.keywords?.join(", ")}`.trim();
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

***

### Managing the Embedding Model Lifecycle

> **Note:** This section applies only when using the default local embedding provider, `TransformersEmbeddingProvider`. Custom embedding providers are responsible for their own resource management.

The default provider is designed for efficiency. When you first use it, it loads the embedding model (`~260MB`) into memory and keeps it there as a singleton.

In some scenarios, like during automated tests, you might want to manually unload the model to free up memory. For this, the provider exposes a static `dispose` method.

#### `TransformersEmbeddingProvider.dispose()`

You can call this method to remove the model from memory.

```typescript
import { TransformersEmbeddingProvider } from "ai-tool-retriever/providers/embedding/transformers";

// This will unload the model and free up its memory.
await TransformersEmbeddingProvider.dispose();
```

A common use case is cleaning up after tests in Vitest or Jest.

```typescript
// In your test file (e.g., retriever.test.ts)
import { afterAll, describe, it } from "vitest";
import { TransformersEmbeddingProvider } from "ai-tool-retriever/providers/embedding/transformers";

describe("My Application Logic", () => {
	// This hook runs once after all tests in this file are complete.
	afterAll(async () => {
		await TransformersEmbeddingProvider.dispose();
	});

	it("should do something with the tool retriever", async () => {
		// Your test logic here...
	});
});
```

#### Pre-downloading the Embedding Model

The library includes a command-line utility to pre-download and cache the default embedding model. This is highly recommended for CI/CD pipelines or when building Docker containers to avoid a slow cold start on the first run of your application.

After installing the library, you can run the following command in your project's root directory:

```bash
npx ai-tool-retriever-download
```

This will execute the same download logic that runs on first use, placing the model files into the `.models` cache directory. By doing this during your build step, your application will be ready to perform embeddings immediately upon starting.
