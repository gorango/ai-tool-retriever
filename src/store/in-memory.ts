import type { ToolDefinition } from '../types'
import type { ToolStore, ToolWithMetadata } from './interface'
import { EmbeddingService } from '../embedding/service'
import { cosineSimilarity } from '../utils'

export class InMemoryStore implements ToolStore {
	private tools: ToolWithMetadata[] = []
	private embeddingService!: EmbeddingService

	// A private constructor is used to enforce async initialization via `create`.
	private constructor() { }

	/**
	 * Creates and initializes an instance of InMemoryStore.
	 * This is required because the EmbeddingService is loaded asynchronously.
	 */
	public static async create(): Promise<InMemoryStore> {
		const store = new InMemoryStore()
		store.embeddingService = await EmbeddingService.getInstance()
		return store
	}

	async add(toolDefinitions: ToolDefinition[]): Promise<void> {
		if (toolDefinitions.length === 0)
			return

		const textsToEmbed = toolDefinitions.map((definition) => {
			const description = definition.tool.description || ''
			const keywords = definition.keywords?.join(', ') || ''
			return `${definition.name}: ${description}. Keywords: ${keywords}`.trim()
		})

		const embeddings = await this.embeddingService.getFloatEmbeddingsBatch(textsToEmbed)

		this.tools = toolDefinitions.map((definition, i) => ({
			definition,
			embedding: embeddings[i],
		}))
	}

	async search(queryEmbedding: number[], count: number, threshold: number = 0): Promise<ToolDefinition[]> {
		if (this.tools.length === 0)
			return []

		const scoredTools = this.tools.map(toolWithMeta => ({
			definition: toolWithMeta.definition,
			similarity: cosineSimilarity(queryEmbedding, toolWithMeta.embedding),
		}))

		return scoredTools
			.sort((a, b) => b.similarity - a.similarity)
			.filter(item => item.similarity >= threshold)
			.slice(0, count)
			.map(item => item.definition)
	}
}
