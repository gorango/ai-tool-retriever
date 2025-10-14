import type { Tool } from 'ai'

/**
 * The input definition for a single tool provided to the Retriever.
 * It combines the tool's name with its AI SDK definition and
 * adds metadata for better searchability.
 */
export interface ToolDefinition {
	/**
	 * The unique name for the tool, used as the key in the final tools object.
	 */
	name: string
	/**
	 * The Vercel AI SDK tool definition, containing the input schema and execute function.
	 */
	tool: Tool<any, any>
	/**
	 * A list of keywords, synonyms, or example use cases.
	 * This text is combined with the tool's description to create
	 * a richer embedding for semantic search.
	 */
	keywords?: string[]
}
