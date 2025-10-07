export interface EmbeddingProvider {
	/**
	 * Generates a float embedding for a given text.
	 */
	getFloatEmbedding: (text: string) => Promise<number[]>

	/**
	 * Generates float embeddings for a batch of texts.
	 */
	getFloatEmbeddingsBatch: (texts: string[]) => Promise<number[][]>

	/**
	 * The vector dimension of the embeddings produced by this provider.
	 */
	readonly dimensions: number
}
