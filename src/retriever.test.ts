import type { ToolStore } from './store/interface'
import type { ToolDefinition } from './types'
import { tool as createTool } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ToolRetriever } from './retriever'

// Mock tools using the new ToolDefinition structure
const weatherToolDef: ToolDefinition = {
	name: 'getWeather',
	tool: createTool({
		description: 'Get the weather',
		inputSchema: z.object({ city: z.string() }),
	}),
}

const newsToolDef: ToolDefinition = {
	name: 'getNews',
	tool: createTool({
		description: 'Get the news',
		inputSchema: z.object({ topic: z.string() }),
	}),
}

// Mock Store to work with ToolDefinition
const mockStore: ToolStore = {
	add: vi.fn().mockResolvedValue(undefined),
	search: vi.fn().mockImplementation(async (embedding, count) => {
		if (embedding[0] === 1)
			return [weatherToolDef]
		if (embedding[1] === 1)
			return [newsToolDef]
		return []
	}),
}

vi.mock('./embedding/service', () => ({
	EmbeddingService: {
		getInstance: vi.fn().mockResolvedValue({
			getFloatEmbedding: vi.fn().mockImplementation(async (query: string) => {
				if (query.includes('weather'))
					return [1, 0]
				if (query.includes('news'))
					return [0, 1]
				return [0, 0]
			}),
		}),
	},
}))

describe('ToolRetriever', async () => {
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
})
