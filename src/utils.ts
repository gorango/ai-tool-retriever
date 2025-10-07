import type { ToolDefinition } from './types'
import { createHash } from 'node:crypto'

/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The cosine similarity, a value between -1 and 1.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
	if (vecA.length !== vecB.length)
		return 0

	let dotProduct = 0
	let normA = 0
	let normB = 0

	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i]
		normA += vecA[i] * vecA[i]
		normB += vecB[i] * vecB[i]
	}

	const denominator = Math.sqrt(normA) * Math.sqrt(normB)
	if (denominator === 0)
		return 0

	return dotProduct / denominator
}

/**
 * A regex to find explicit tool mentions like `[toolName]` in a query.
 */
const toolSyntaxRegex = /\[([^\]]+)\]/g

/**
 * Parses a user query to find explicitly mentioned tools using `[toolName]` syntax.
 * @param query The user query string.
 * @returns A string array of unique tool names found in the query.
 */
export function extractToolsFromQuerySyntax(query: string): string[] {
	const toolNames = new Set<string>()
	const matches = query.matchAll(toolSyntaxRegex)
	for (const match of matches) {
		// The tool name is in the first capture group.
		// Trim it first to handle cases like `[ myTool ]` or `[ ]`.
		const toolName = match[1]?.trim()

		// Now, if toolName is an empty string after trimming, this condition is correctly false.
		if (toolName)
			toolNames.add(toolName)
	}
	return Array.from(toolNames)
}

/**
 * Creates a stable SHA-256 hash from a tool's content to detect changes.
 * @param definition The tool definition.
 * @returns A hex digest representing the tool's content.
 */
export function createToolContentHash(definition: ToolDefinition): string {
	const sourceText = JSON.stringify({
		name: definition.name,
		description: definition.tool.description,
		parameters: definition.tool.inputSchema, // zod schema for the hash
		keywords: definition.keywords?.sort(), // sort keywords for a stable hash
	})
	return createHash('sha256').update(sourceText).digest('hex')
}
