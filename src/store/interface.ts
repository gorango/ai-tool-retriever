import type { ToolDefinition } from '../types'

export interface ToolWithMetadata {
	/* Keywords and additional search terms provided by the user */
	definition: ToolDefinition
	/* The embedding vector for this tool */
	embedding: number[]
	/** A hash of the tool's content (description, keywords, etc.) to detect changes. */
	contentHash: string
}

export interface ToolStore {
	/**
	 * Synchronizes the store with the provided tool definitions.
	 * It should handle adding new tools, updating changed tools (based on content),
	 * and optionally removing tools that are no longer defined.
	 * @param tools The complete list of current tool definitions.
	 */
	sync: (tools: ToolDefinition[]) => Promise<void>

	/**
	 * Searches the store for the most relevant tools based on a query embedding.
	 * @param queryEmbedding The vector representation of the user's query.
	 * @param count The maximum number of tools to return.
	 * @param threshold The minimum similarity score (0-1) required for a tool to be included.
	 * @returns A promise that resolves to an array of relevant tool definitions.
	 */
	search: (queryEmbedding: number[], count: number, threshold: number) => Promise<ToolDefinition[]>
}
