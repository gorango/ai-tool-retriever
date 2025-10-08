import type { EmbeddingProvider } from '../../core/embedding'
import type { ToolStore, ToolWithMetadata } from '../../core/store'
import type { ToolDefinition } from '../../core/types'
import { cosineSimilarity, createToolContentHash } from '../../utils'

interface InMemoryStoreOptions {
	embeddingProvider: EmbeddingProvider
}

export class InMemoryStore implements ToolStore {
	private tools: ToolWithMetadata[] = []
	private embeddingProvider: EmbeddingProvider

	// private constructor is used to enforce async initialization via `create`.
	private constructor(options: InMemoryStoreOptions) {
		this.embeddingProvider = options.embeddingProvider
	}

	/**
	 * Creates and initializes an instance of InMemoryStore.
	 * It requires an embedding provider to function.
	 */
	public static create(options: InMemoryStoreOptions): InMemoryStore {
		return new InMemoryStore(options)
	}

	async sync(toolDefinitions: ToolDefinition[]): Promise<void> {
		if (toolDefinitions.length === 0) {
			this.tools = []
			return
		}

		const textsToEmbed = toolDefinitions.map((definition) => {
			const description = definition.tool.description || ''
			const keywords = definition.keywords?.join(', ') || ''
			return `${definition.name}: ${description}. Keywords: ${keywords}`.trim()
		})

		// It uses the provider it received during creation
		const embeddings = await this.embeddingProvider.getFloatEmbeddingsBatch(textsToEmbed)

		this.tools = toolDefinitions.map((definition, i) => ({
			definition,
			embedding: embeddings[i],
			contentHash: createToolContentHash(definition),
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
