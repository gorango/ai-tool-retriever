import type { ToolDefinition } from '../types'

export interface ToolWithMetadata {
	/* Keywords and additional search terms provided by the user */
	definition: ToolDefinition
	/* The embedding vector for this tool */
	embedding: number[]
}

export interface ToolStore {
	/**
	 * Adds a collection of tools to the store, generating embeddings.
	 */
	add: (tools: ToolDefinition[]) => Promise<void>

	/**
	 * Searches the store for the most relevant tools based on a query embedding.
	 * @returns A promise that resolves to an array of relevant tool definitions.
	 */
	search: (queryEmbedding: number[], count: number) => Promise<ToolDefinition[]>
}
