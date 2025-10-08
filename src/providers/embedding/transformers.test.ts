import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockPipelineInstance = {
	dispose: vi.fn().mockResolvedValue(undefined),
	_call: vi.fn(),
}
const mockPipeline = vi.fn().mockResolvedValue(mockPipelineInstance)

vi.mock('@xenova/transformers', () => ({
	pipeline: mockPipeline,
	env: {
		cacheDir: '.models',
		allowLocalModels: true,
	},
}))

const PIPELINE_PROMISE_SYMBOL = Symbol.for('ai-tool-retriever.pipeline_promise')

describe('TransformersEmbeddingProvider', () => {
	let TransformersEmbeddingProvider: any

	beforeEach(async () => {
		vi.resetModules()
		const module = await import('./transformers')
		TransformersEmbeddingProvider = module.TransformersEmbeddingProvider
	})

	afterEach(() => {
		vi.clearAllMocks()
		delete (globalThis as any)[PIPELINE_PROMISE_SYMBOL]
	})

	it('should initialize the pipeline only once on multiple create calls', async () => {
		console.log = vi.fn()

		const instance1 = await TransformersEmbeddingProvider.create()
		const instance2 = await TransformersEmbeddingProvider.create()

		expect(instance1).toBe(instance2)
		expect(mockPipeline).toHaveBeenCalledTimes(1)
	})

	it('should call the pipeline dispose method when dispose is called', async () => {
		console.log = vi.fn()

		await TransformersEmbeddingProvider.create()
		await TransformersEmbeddingProvider.dispose()

		expect(mockPipelineInstance.dispose).toHaveBeenCalledTimes(1)
	})

	it('should allow for re-initialization after being disposed', async () => {
		console.log = vi.fn()

		const instance1 = await TransformersEmbeddingProvider.create()
		expect(mockPipeline).toHaveBeenCalledTimes(1)

		await TransformersEmbeddingProvider.dispose()
		expect(mockPipelineInstance.dispose).toHaveBeenCalledTimes(1)

		const instance2 = await TransformersEmbeddingProvider.create()

		expect(instance2).not.toBe(instance1)
		expect(mockPipeline).toHaveBeenCalledTimes(2)
	})

	it('should handle calling dispose when the provider was never initialized', async () => {
		await expect(TransformersEmbeddingProvider.dispose()).resolves.not.toThrow()
		expect(mockPipelineInstance.dispose).not.toHaveBeenCalled()
	})

	it('should have the correct dimensions property', async () => {
		const instance = await TransformersEmbeddingProvider.create()
		expect(instance.dimensions).toBe(384)
	})
})
