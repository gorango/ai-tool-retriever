export interface EmbeddingProvider {
	/**
	 * The dimensionality of the embedding vectors produced by this provider.
	 */
	readonly dimensions: number

	/**
	 * Generates an embedding for a single text.
	 * @param text The text to embed.
	 * @returns A promise that resolves to an embedding vector.
	 */
	getFloatEmbedding: (text: string) => Promise<number[]>

	/**
	 * Generates embeddings for a batch of texts.
	 * @param texts An array of texts to embed.
	 * @returns A promise that resolves to an array of embedding vectors.
	 */
	getFloatEmbeddingsBatch: (texts: string[]) => Promise<number[][]>
}
