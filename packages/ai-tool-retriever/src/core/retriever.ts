import type { Tool } from 'ai'
import { extractToolsFromQuerySyntax } from '../utils'
import type { EmbeddingProvider } from './embedding'
import { ToolNotFoundError } from './errors'
import type { ToolStore } from './store'
import type { ToolDefinition } from './types'

interface ToolRetrieverOptions {
	tools: ToolDefinition[]
	store: ToolStore
	embeddingProvider: EmbeddingProvider
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
		this.allTools = new Map(tools.map((t) => [t.name, t]))
		this.embeddingProvider = embeddingProvider
	}

	public static async create(options: ToolRetrieverOptions): Promise<ToolRetriever> {
		const retriever = new ToolRetriever(options.store, options.tools, options.embeddingProvider)
		await retriever.store.sync(options.tools, retriever.embeddingProvider)
		return retriever
	}

	/**
	 * Retrieves relevant tools for a user query.
	 *
	 * @param userQuery - The input text from the user.
	 * @param options - Optional settings to fine-tune retrieval.
	 * @returns A promise that resolves to a record of relevant tools.
	 * @throws {ToolNotFoundError} If `strict` is true and a tool from the query syntax is not found.
	 */
	public async retrieve(userQuery: string, options: RetrieveOptions = {}): Promise<Record<string, Tool<any, any>>> {
		const results = await this.retrieveBatch([userQuery], options)
		return results[0]
	}

	/**
	 * Retrieves relevant tools for a batch of user queries.
	 * This method is more efficient than calling `retrieve` in a loop as it
	 * calculates embeddings for all queries in a single operation.
	 * @param userQueries An array of user queries.
	 * @param options The retrieval options to apply to each query.
	 * @returns A promise that resolves to an array of tool records, with each
	 *          record corresponding to a query in the input array.
	 * @throws {ToolNotFoundError} If `strict` is true and a tool from a query's syntax is not found.
	 */
	public async retrieveBatch(
		userQueries: string[],
		options: RetrieveOptions = {},
	): Promise<Record<string, Tool<any, any>>[]> {
		const { matchCount = 12, matchThreshold = 0, strict = false } = options
		const queryEmbeddings = await this.embeddingProvider.getFloatEmbeddingsBatch(userQueries)
		const results: Record<string, Tool<any, any>>[] = []

		for (let i = 0; i < userQueries.length; i++) {
			const userQuery = userQueries[i]
			const queryEmbedding = queryEmbeddings[i]

			const semanticallyMatched = await this.store.search(queryEmbedding, matchCount, matchThreshold)
			const explicitlyMentioned = extractToolsFromQuerySyntax(userQuery)

			const finalTools = new Map<string, Tool<any, any>>()

			for (const definition of semanticallyMatched) finalTools.set(definition.name, definition.tool)

			for (const toolName of explicitlyMentioned) {
				const definition = this.allTools.get(toolName)
				if (definition) {
					finalTools.set(definition.name, definition.tool)
				} else {
					if (strict) {
						throw new ToolNotFoundError(toolName)
					} else {
						console.warn(`Tool '${toolName}' from query syntax not found.`)
					}
				}
			}
			results.push(Object.fromEntries(finalTools))
		}

		return results
	}
}
