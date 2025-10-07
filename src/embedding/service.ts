import type { FeatureExtractionPipeline } from '@xenova/transformers'
import path from 'node:path'
import process from 'node:process'

// Use a global symbol to ensure the pipeline is a true singleton across HMR reloads
const PIPELINE_PROMISE_SYMBOL = Symbol.for('ai-tool-retriever.pipeline_promise')

type GlobalWithPipeline = typeof globalThis & {
	[PIPELINE_PROMISE_SYMBOL]?: Promise<FeatureExtractionPipeline>
}

export class EmbeddingService {
	private static instance: EmbeddingService
	private static initializationPromise: Promise<EmbeddingService> | null = null
	private pipe: FeatureExtractionPipeline
	public readonly dimensions = 384 // Dimension of the all-MiniLM-L6-v2 model
	private constructor(pipe: FeatureExtractionPipeline) {
		this.pipe = pipe
	}

	/**
	 * Gets the singleton instance of the EmbeddingService, initializing it if necessary.
	 */
	public static getInstance(): Promise<EmbeddingService> {
		if (this.instance)
			return Promise.resolve(this.instance)

		if (!this.initializationPromise) {
			this.initializationPromise = new Promise((resolve, reject) => {
				this.getPipeline().then((pipelineInstance) => {
					this.instance = new EmbeddingService(pipelineInstance)
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
