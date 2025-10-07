import type { Tool } from 'ai'
import type { EmbeddingProvider } from './embedding/interface'
import type { ToolStore } from './store/interface'
import type { ToolDefinition } from './types'
import { extractToolsFromQuerySyntax } from './utils'

interface ToolRetrieverOptions {
	tools: ToolDefinition[]
	store?: ToolStore
	embeddingProvider?: EmbeddingProvider
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
	private embeddingProvider: EmbeddingProvider

	private constructor(store: ToolStore, tools: ToolDefinition[], embeddingProvider: EmbeddingProvider) {
		this.store = store
		this.allTools = new Map(tools.map(t => [t.name, t]))
		this.embeddingProvider = embeddingProvider
	}

	public static async create(options: ToolRetrieverOptions): Promise<ToolRetriever> {
		const embeddingProvider = options.embeddingProvider
			|| await (await import('./embedding/service')).EmbeddingService.getInstance()

		const store = options.store
			|| (await import('./store/in-memory')).InMemoryStore.create({ embeddingProvider })

		const retriever = new ToolRetriever(store, options.tools, embeddingProvider)

		await retriever.store.sync(options.tools)
		return retriever
	}

	public async retrieve(
		userQuery: string,
		options: RetrieveOptions = {},
	): Promise<Record<string, Tool<any, any>>> {
		const queryEmbedding = await this.embeddingProvider.getFloatEmbedding(userQuery)

		const { matchCount = 12, matchThreshold = 0, strict = false } = options
		const semanticallyMatched = await this.store.search(queryEmbedding, matchCount, matchThreshold)
		const explicitlyMentioned = extractToolsFromQuerySyntax(userQuery)

		const finalTools = new Map<string, Tool<any, any>>()

		for (const definition of semanticallyMatched)
			finalTools.set(definition.name, definition.tool)

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
