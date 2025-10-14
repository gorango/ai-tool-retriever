/**
 * Base error class for all errors thrown by the AI Tool Retriever library.
 * This allows consumers to catch all library-specific errors.
 *
 * @example
 * ```typescript
 * try {
 *   // retriever logic
 * } catch (e) {
 *   if (e instanceof AI_Tool_Retriever_Error) {
 *     console.error("An error occurred in the tool retriever:", e.message);
 *   }
 * }
 * ```
 */
export class AI_Tool_Retriever_Error extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AI_Tool_Retriever_Error'
	}
}

/**
 * Thrown when a tool is explicitly requested in the query syntax (e.g., `[myTool]`)
 * but cannot be found in the list of tools provided to the retriever.
 * This error is only thrown when the `strict` option is enabled.
 */
export class ToolNotFoundError extends AI_Tool_Retriever_Error {
	public readonly toolName: string

	constructor(toolName: string) {
		super(`Tool '${toolName}' from query syntax not found.`)
		this.name = 'ToolNotFoundError'
		this.toolName = toolName
	}
}
