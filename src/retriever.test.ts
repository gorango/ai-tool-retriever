import type { ToolStore } from './store/interface'
import type { ToolDefinition } from './types'
import { tool as createTool } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ToolRetriever } from './retriever'

const weatherToolDef: ToolDefinition = {
	name: 'getWeather',
	tool: createTool({ description: 'Get the weather', inputSchema: z.object({ city: z.string() }) }),
}
const newsToolDef: ToolDefinition = {
	name: 'getNews',
	tool: createTool({ description: 'Get the news', inputSchema: z.object({ topic: z.string() }) }),
}

const mockStore: ToolStore = {
	add: vi.fn().mockResolvedValue(undefined),
	search: vi.fn().mockImplementation(async (embedding, _count, threshold) => {
		// Simulate finding weather tool if embedding[0] is high
		if (embedding[0] > (threshold || 0))
			return [weatherToolDef]

		// Simulate finding news tool if embedding[1] is high
		if (embedding[1] > (threshold || 0))
			return [newsToolDef]

		return []
	}),
}

vi.mock('./embedding/service', () => ({
	EmbeddingService: {
		getInstance: vi.fn().mockResolvedValue({
			// This is used by the retriever to embed the user query
			getFloatEmbedding: vi.fn().mockImplementation(async (query: string) => {
				if (query.includes('weather'))
					return [0.9, 0.1]
				if (query.includes('news'))
					return [0.1, 0.9]
				return [0, 0]
			}),
			// This is used by the default InMemoryStore during .create()
			getFloatEmbeddingsBatch: vi.fn().mockImplementation(async (texts: string[]) => {
				return texts.map(_text => [0, 0, 0, 0]) // Return a default embedding for initialization
			}),
		}),
	},
}))

describe('ToolRetriever', () => {
	it('should retrieve tools based on semantic similarity', async () => {
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef, newsToolDef], store: mockStore })
		const result = await retriever.retrieve('What is the weather in SF?')
		expect(Object.keys(result)).toContain('getWeather')
		expect(Object.keys(result)).not.toContain('getNews')
	})

	it('should retrieve tools based on explicit syntax', async () => {
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef, newsToolDef], store: mockStore })
		const result = await retriever.retrieve('Some query with [getNews] explicitly mentioned')
		expect(Object.keys(result)).toContain('getNews')
	})

	it('should combine semantic and explicit results', async () => {
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef, newsToolDef], store: mockStore })
		const result = await retriever.retrieve('What is the weather like? Also get me the news [getNews]')
		expect(Object.keys(result)).toEqual(['getWeather', 'getNews'])
	})

	it('should handle queries with no semantic matches gracefully', async () => {
		const retriever = await ToolRetriever.create({ tools: [weatherToolDef], store: mockStore })
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
			const retriever = await ToolRetriever.create({ tools: [weatherToolDef] })
			const query = 'Find me the weather and [aMissingTool]'
			await expect(retriever.retrieve(query, { strict: true })).rejects.toThrow(
				'Tool \'aMissingTool\' from query syntax not found.',
			)
		})

		it('should warn and not throw for a missing explicit tool by default (strict: false)', async () => {
			const retriever = await ToolRetriever.create({ tools: [weatherToolDef] })
			const query = 'Find me the weather and [aMissingTool]'

			// Ensure it does not throw
			await expect(retriever.retrieve(query)).resolves.not.toThrow()

			// Ensure it warns
			expect(consoleWarnSpy).toHaveBeenCalledWith('Tool \'aMissingTool\' from query syntax not found.')
		})
	})
})
