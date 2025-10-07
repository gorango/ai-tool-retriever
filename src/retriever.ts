import type { Tool } from 'ai'
import type { ToolStore } from './store/interface'
import type { ToolDefinition } from './types'
import { EmbeddingService } from './embedding/service'
import { InMemoryStore } from './store/in-memory'
import { extractToolsFromQuerySyntax } from './utils'

interface ToolRetrieverOptions {
	tools: ToolDefinition[]
	store?: ToolStore
}

interface RetrieveOptions {
	matchCount?: number
	matchThreshold?: number
	/**
	 * If true, retriever will throw an error if a tool explicitly
	 * mentioned in the query (e.g., `[myTool]`) is not found.
	 * @default false
	 */
	strict?: boolean
}

export class ToolRetriever {
	private store: ToolStore
	private allTools: Map<string, ToolDefinition>
	private embeddingService!: EmbeddingService

	private constructor(store: ToolStore, tools: ToolDefinition[]) {
		this.store = store
		this.allTools = new Map(tools.map(t => [t.name, t]))
	}

	/**
	 * Creates and initializes a ToolRetriever instance.
	 */
	public static async create(options: ToolRetrieverOptions): Promise<ToolRetriever> {
		const store = options.store || (await InMemoryStore.create())
		const retriever = new ToolRetriever(store, options.tools)
		retriever.embeddingService = await EmbeddingService.getInstance()

		// Asynchronously index the tools
		await retriever.store.sync(options.tools)
		return retriever
	}

	public async retrieve(
		userQuery: string,
		options: RetrieveOptions = {},
	): Promise<Record<string, Tool<any, any>>> {
		const { matchCount = 12, matchThreshold = 0, strict = false } = options
		const queryEmbedding = await this.embeddingService.getFloatEmbedding(userQuery)

		const semanticallyMatched = await this.store.search(queryEmbedding, matchCount, matchThreshold)
		const explicitlyMentioned = extractToolsFromQuerySyntax(userQuery)

		const finalTools = new Map<string, Tool<any, any>>()

		// Add semantic results
		for (const definition of semanticallyMatched)
			finalTools.set(definition.name, definition.tool)

		// Add explicit results, overwriting is fine
		for (const toolName of explicitlyMentioned) {
			const definition = this.allTools.get(toolName)
			if (definition) {
				finalTools.set(definition.name, definition.tool)
			}
			else {
				const message = `Tool '${toolName}' from query syntax not found.`
				if (strict)
					throw new Error(message)
				else
					console.warn(message)
			}
		}

		return Object.fromEntries(finalTools)
	}
}
