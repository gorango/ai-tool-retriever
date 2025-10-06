import type { Tool } from 'ai'
import type { ToolStore } from './store/interface'
import type { ToolDefinition } from './types'
import { EmbeddingService } from './embedding/service'
import { InMemoryStore } from './store/in-memory'
import { extractToolsFromQuerySyntax } from './utils'

interface RetrieverOptions {
	tools: ToolDefinition[]
	store?: ToolStore
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
	public static async create(options: RetrieverOptions): Promise<ToolRetriever> {
		const store = options.store || (await InMemoryStore.create())
		const retriever = new ToolRetriever(store, options.tools)
		retriever.embeddingService = await EmbeddingService.getInstance()

		// Asynchronously index the tools
		await retriever.store.add(options.tools)
		return retriever
	}

	public async retrieve(
		userQuery: string,
		matchCount: number = 12,
	): Promise<Record<string, Tool<any, any>>> {
		const queryEmbedding = await this.embeddingService.getFloatEmbedding(userQuery)

		const semanticallyMatched = await this.store.search(queryEmbedding, matchCount)
		const explicitlyMentioned = extractToolsFromQuerySyntax(userQuery)

		const finalTools = new Map<string, Tool<any, any>>()

		// Add semantic results
		for (const definition of semanticallyMatched)
			finalTools.set(definition.name, definition.tool)

		// Add explicit results, overwriting is fine
		for (const toolName of explicitlyMentioned) {
			const definition = this.allTools.get(toolName)
			if (definition)
				finalTools.set(definition.name, definition.tool)
			else
				console.warn(`Tool '${toolName}' from query syntax not found.`)
		}

		return Object.fromEntries(finalTools)
	}
}
