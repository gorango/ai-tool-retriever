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
	 * @param queryEmbedding The vector representation of the user's query.
	 * @param count The maximum number of tools to return.
	 * @param threshold The minimum similarity score (0-1) required for a tool to be included.
	 * @returns A promise that resolves to an array of relevant tool definitions.
	 */
	search: (queryEmbedding: number[], count: number, threshold: number) => Promise<ToolDefinition[]>
}
