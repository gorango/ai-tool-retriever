import type { EmbeddingProvider } from '../../core/embedding'
import type { ToolStore, ToolWithMetadata } from '../../core/store'
import type { ToolDefinition } from '../../core/types'
import { cosineSimilarity, createToolContentHash } from '../../utils'

export class InMemoryStore implements ToolStore {
	private tools: ToolWithMetadata[] = []

	// private constructor is used to enforce async initialization via `create`.
	private constructor() { }

	/**
	 * Creates and initializes an instance of InMemoryStore.
	 * It requires an embedding provider to function.
	 */
	public static create(): InMemoryStore {
		return new InMemoryStore()
	}

	async sync(
		toolDefinitions: ToolDefinition[],
		embeddingProvider: EmbeddingProvider,
	): Promise<void> {
		if (toolDefinitions.length === 0) {
			this.tools = []
			return
		}

		const existingToolsMap = new Map(
			this.tools.map(t => [t.definition.name, t]),
		)
		const toolsToEmbed: ToolDefinition[] = []
		const newToolsWithMetadata: ToolWithMetadata[] = []

		for (const definition of toolDefinitions) {
			const newHash = createToolContentHash(definition)
			const existingTool = existingToolsMap.get(definition.name)

			if (existingTool && existingTool.contentHash === newHash)
				newToolsWithMetadata.push(existingTool)
			else
				toolsToEmbed.push(definition)
		}

		if (toolsToEmbed.length > 0) {
			const textsToEmbed = toolsToEmbed.map((definition) => {
				const description = definition.tool.description || ''
				const keywords = definition.keywords?.join(', ') || ''
				return `${definition.name}: ${description}. Keywords: ${keywords}`.trim()
			})

			const embeddings = await embeddingProvider.getFloatEmbeddingsBatch(
				textsToEmbed,
			)

			const embeddedTools = toolsToEmbed.map((definition, i) => ({
				definition,
				embedding: embeddings[i],
				contentHash: createToolContentHash(definition),
			}))

			newToolsWithMetadata.push(...embeddedTools)
		}

		this.tools = newToolsWithMetadata
	}

	async search(
		queryEmbedding: number[],
		count: number,
		threshold: number = 0,
	): Promise<ToolDefinition[]> {
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
