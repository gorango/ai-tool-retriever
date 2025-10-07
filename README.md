# AI Tool Retriever

A lightweight, zero-dependency library for dynamically selecting the most relevant tools for your Vercel AI SDK-powered agent based on user queries.

It uses in-memory semantic search to find the best tools for the job, ensuring your AI model receives only the necessary tools, saving context space and improving accuracy.

### Features

- **Dynamic Tool Selection**: Automatically selects relevant tools from a larger collection based on semantic similarity.
- **In-Memory Search**: No need for an external vector database. It uses `@xenova/transformers` to run a state-of-the-art sentence transformer model directly in your Node.js environment.
- **Keyword Enhanced**: Improve search accuracy by adding custom `keywords` to your tool definitions.
- **Explicit Tool Forcing**: Users can force tool inclusion with a simple `[toolName]` syntax in their query.
- **Configurable Retrieval**: Fine-tune results with similarity thresholds and control behavior for missing tools.
- **Idempotent Syncing**: Built-in content hashing utilities to efficiently sync tools with persistent vector stores, avoiding redundant embedding calculations.
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

### Custom Vector Store

To use a different vector database, implement the `ToolStore` interface. The `sync` method is called once during initialization to ensure the vector database is up-to-date with your tool definitions.

For persistent stores (like Supabase or Pinecone), it's crucial to implement `sync` efficiently to avoid re-calculating embeddings for unchanged tools on every application restart. The library provides a `createToolContentHash` utility to help with this.

#### Example: A Robust Supabase Store

This example demonstrates a persistent store that only generates embeddings for new or changed tools, making it highly efficient.

First, you would need a table and a search function in Supabase:

```sql
-- 1. Create a table to store tool embeddings
CREATE TABLE ai_tools (
  name TEXT PRIMARY KEY,
  description TEXT,
  content_hash TEXT NOT NULL,
  embedding VECTOR(384) -- Dimension of Xenova/all-MiniLM-L6-v2
);

-- 2. Create a function for vector similarity search
CREATE OR REPLACE FUNCTION match_ai_tools (
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
		store.embeddingService = await EmbeddingService.getInstance();
		return store;
	}

	async sync(toolDefinitions: ToolDefinition[]): Promise<void> {
		console.log("Syncing tools with Supabase...");
		const { data: existing } = await sb
			.from("ai_tools")
			.select("name, content_hash");
		const existingToolsMap = new Map(
			existing!.map((t) => [t.name, t.content_hash]),
		);

		const toolsToUpdate = toolDefinitions.filter((def) => {
			const newHash = createToolContentHash(def);
			return existingToolsMap.get(def.name) !== newHash;
		});

		if (toolsToUpdate.length > 0) {
			console.log(
				`Found ${toolsToUpdate.length} new or updated tools to embed.`,
			);
			const texts = toolsToUpdate.map(
				(t) => `${t.name}: ${t.tool.description}`,
			);
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
