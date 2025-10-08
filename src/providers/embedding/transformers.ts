import type { FeatureExtractionPipeline } from '@xenova/transformers'
import type { EmbeddingProvider } from '../../core/embedding'
import path from 'node:path'
import process from 'node:process'

// Use a global symbol to ensure the pipeline is a true singleton across HMR reloads
const PIPELINE_PROMISE_SYMBOL = Symbol.for('ai-tool-retriever.pipeline_promise')

type GlobalWithPipeline = typeof globalThis & {
	[PIPELINE_PROMISE_SYMBOL]?: Promise<FeatureExtractionPipeline>
}

export class TransformersEmbeddingProvider implements EmbeddingProvider {
	private static instance?: TransformersEmbeddingProvider
	private static initializationPromise: Promise<TransformersEmbeddingProvider> | null = null
	private pipe: FeatureExtractionPipeline
	public readonly dimensions: number = 384 // Dimension of the all-MiniLM-L6-v2 model

	private constructor(pipe: FeatureExtractionPipeline) {
		this.pipe = pipe
	}

	/**
	 * Gets the singleton instance of the TransformersEmbeddingProvider, initializing it if necessary.
	 */
	public static async create(): Promise<TransformersEmbeddingProvider> {
		if (this.instance)
			return this.instance

		if (!this.initializationPromise) {
			this.initializationPromise = new Promise((resolve, reject) => {
				this.getPipeline().then((pipelineInstance) => {
					this.instance = new TransformersEmbeddingProvider(pipelineInstance)
					resolve(this.instance)
				}).catch((error) => {
					console.error('Failed to initialize embedding model pipeline.')
					reject(error)
				})
			})
		}

		return this.initializationPromise
	}

	/**
	 * Disposes of the model pipeline and cleans up the singleton instance.
	 * Useful for resource management in tests or serverless environments.
	 */
	public static async dispose(): Promise<void> {
		const _global = globalThis as GlobalWithPipeline
		const pipelinePromise = _global[PIPELINE_PROMISE_SYMBOL]

		if (pipelinePromise) {
			try {
				const pipelineInstance = await pipelinePromise
				await pipelineInstance.dispose()
				console.log('Embedding model pipeline disposed successfully.')
			}
			catch (error) {
				console.error('Error disposing the embedding model pipeline:', error)
			}
			finally {
				// Clear the global symbol and reset the singleton state
				delete _global[PIPELINE_PROMISE_SYMBOL]
				this.instance = undefined
				this.initializationPromise = null
			}
		}
	}

	/**
	 * HMR-safe function to load the transformer model pipeline only once.
	 */
	private static getPipeline(): Promise<FeatureExtractionPipeline> {
		const _global = globalThis as GlobalWithPipeline

		if (!_global[PIPELINE_PROMISE_SYMBOL]) {
			_global[PIPELINE_PROMISE_SYMBOL] = (async () => {
				const { env, pipeline } = await import('@xenova/transformers')
				env.cacheDir = path.join(process.cwd(), '.models')
				env.allowLocalModels = true
				console.log('Initializing embedding model pipeline... (this may take a moment)')
				const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
				console.log('Embedding model pipeline initialized successfully.')
				return pipe
			})()
		}

		return _global[PIPELINE_PROMISE_SYMBOL]!
	}

	/**
	 * Generates a float embedding for a given text.
	 * @param text The text to embed.
	 * @returns A promise that resolves to an array of numbers (float vector).
	 */
	public async getFloatEmbedding(text: string): Promise<number[]> {
		const result = await this.pipe(text, { pooling: 'mean', normalize: true })
		return Array.from(result.data as Float32Array)
	}

	/**
	 * Generates float embeddings for a batch of texts.
	 * @param texts The array of texts to embed.
	 * @returns A promise that resolves to an array of float vectors.
	 */
	public async getFloatEmbeddingsBatch(texts: string[]): Promise<number[][]> {
		const results = await this.pipe(texts, { pooling: 'mean', normalize: true })
		// The result for a batch is a single Tensor. We need to slice it.
		const embeddings: number[][] = []
		for (let i = 0; i < results.dims[0]; i++) {
			const embedding = Array.from(results.slice([i, 0], [i + 1, -1]).data as Float32Array)
			embeddings.push(embedding)
		}
		return embeddings
	}
}
