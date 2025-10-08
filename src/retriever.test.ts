import type { ToolStore } from './core/store'
import type { ToolDefinition } from './core/types'
import { tool as createTool } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ToolRetriever } from './core/retriever'

const weatherToolDef: ToolDefinition = {
	name: 'getWeather',
	tool: createTool({ description: 'Get the weather', inputSchema: z.object({ city: z.string() }) }),
}
const newsToolDef: ToolDefinition = {
	name: 'getNews',
	tool: createTool({ description: 'Get the news', inputSchema: z.object({ topic: z.string() }) }),
}

const mockStore: ToolStore = {
	sync: vi.fn().mockResolvedValue(undefined),
	search: vi.fn().mockImplementation(async (embedding, _count, threshold) => {
		// simulate finding weather tool if embedding[0] is high
		if (embedding[0] > (threshold || 0))
			return [weatherToolDef]

		// simulate finding news tool if embedding[1] is high
		if (embedding[1] > (threshold || 0))
			return [newsToolDef]

		return []
	}),
}

vi.mock('./providers/embedding-xenova', () => ({
	XenovaEmbeddingProvider: {
		create: vi.fn().mockResolvedValue({
			getFloatEmbedding: vi.fn().mockImplementation(async (query: string) => {
				if (query.includes('weather'))
					return [0.9, 0.1]
				if (query.includes('news'))
					return [0.1, 0.9]
				return [0, 0]
			}),
			getFloatEmbeddingsBatch: vi.fn().mockImplementation(async (texts: string[]) => {
				return texts.map((query) => {
					if (query.includes('weather'))
						return [0.9, 0.1]
					if (query.includes('news'))
						return [0.1, 0.9]
					return [0, 0]
				})
			}),
		}),
	},
}))

describe('ToolRetriever', () => {
	it('should retrieve tools based on semantic similarity', async () => {
		const mockEmbeddingProvider = await (await import('./providers/embedding-xenova')).XenovaEmbeddingProvider.create()
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef, newsToolDef], store: mockStore, embeddingProvider: mockEmbeddingProvider })
		const result = await retriever.retrieve('What is the weather in SF?')
		expect(Object.keys(result)).toContain('getWeather')
		expect(Object.keys(result)).not.toContain('getNews')
	})

	it('should retrieve tools based on explicit syntax', async () => {
		const mockEmbeddingProvider = await (await import('./providers/embedding-xenova')).XenovaEmbeddingProvider.create()
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef, newsToolDef], store: mockStore, embeddingProvider: mockEmbeddingProvider })
		const result = await retriever.retrieve('Some query with [getNews] explicitly mentioned')
		expect(Object.keys(result)).toContain('getNews')
	})

	it('should combine semantic and explicit results', async () => {
		const mockEmbeddingProvider = await (await import('./providers/embedding-xenova')).XenovaEmbeddingProvider.create()
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef, newsToolDef], store: mockStore, embeddingProvider: mockEmbeddingProvider })
		const result = await retriever.retrieve('What is the weather like? Also get me the news [getNews]')
		expect(Object.keys(result)).toEqual(['getWeather', 'getNews'])
	})

	it('should handle queries with no semantic matches gracefully', async () => {
		const mockEmbeddingProvider = await (await import('./providers/embedding-xenova')).XenovaEmbeddingProvider.create()
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef], store: mockStore, embeddingProvider: mockEmbeddingProvider })
		const result = await retriever.retrieve('a query with no matching terms')
		expect(Object.keys(result).length).toBe(0)
	})

	describe('strict mode', () => {
		let consoleWarnSpy: any

		beforeEach(() => {
			consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
		})

		afterEach(() => {
			consoleWarnSpy.mockRestore()
		})

		it('should throw an error for a missing explicit tool when strict is true', async () => {
			const mockEmbeddingProvider = await (await import('./providers/embedding-xenova')).XenovaEmbeddingProvider.create()
			const retriever = await ToolRetriever.create({ tools: [weatherToolDef], store: mockStore, embeddingProvider: mockEmbeddingProvider })
			const query = 'Find me the weather and [aMissingTool]'
			await expect(retriever.retrieve(query, { strict: true })).rejects.toThrow(
				'Tool \'aMissingTool\' from query syntax not found.',
			)
		})

		it('should warn and not throw for a missing explicit tool by default (strict: false)', async () => {
			const mockEmbeddingProvider = await (await import('./providers/embedding-xenova')).XenovaEmbeddingProvider.create()
			const retriever = await ToolRetriever.create({ tools: [weatherToolDef], store: mockStore, embeddingProvider: mockEmbeddingProvider })
			const query = 'Find me the weather and [aMissingTool]'
			await expect(retriever.retrieve(query)).resolves.not.toThrow()
			expect(consoleWarnSpy).toHaveBeenCalledWith('Tool \'aMissingTool\' from query syntax not found.')
		})
	})
})
