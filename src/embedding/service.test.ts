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

describe('EmbeddingService', () => {
	let EmbeddingService: any

	beforeEach(async () => {
		vi.resetModules()
		const module = await import('./service')
		EmbeddingService = module.EmbeddingService
	})

	afterEach(() => {
		vi.clearAllMocks()
		delete (globalThis as any)[PIPELINE_PROMISE_SYMBOL]
	})

	it('should initialize the pipeline only once on multiple getInstance calls', async () => {
		console.log = vi.fn()

		const instance1 = await EmbeddingService.getInstance()
		const instance2 = await EmbeddingService.getInstance()

		expect(instance1).toBe(instance2)
		expect(mockPipeline).toHaveBeenCalledTimes(1)
	})

	it('should call the pipeline dispose method when dispose is called', async () => {
		console.log = vi.fn()

		await EmbeddingService.getInstance()
		await EmbeddingService.dispose()

		expect(mockPipelineInstance.dispose).toHaveBeenCalledTimes(1)
	})

	it('should allow for re-initialization after being disposed', async () => {
		console.log = vi.fn()

		const instance1 = await EmbeddingService.getInstance()
		expect(mockPipeline).toHaveBeenCalledTimes(1)

		await EmbeddingService.dispose()
		expect(mockPipelineInstance.dispose).toHaveBeenCalledTimes(1)

		const instance2 = await EmbeddingService.getInstance()

		expect(instance2).not.toBe(instance1)
		expect(mockPipeline).toHaveBeenCalledTimes(2)
	})

	it('should handle calling dispose when the service was never initialized', async () => {
		await expect(EmbeddingService.dispose()).resolves.not.toThrow()
		expect(mockPipelineInstance.dispose).not.toHaveBeenCalled()
	})
})
