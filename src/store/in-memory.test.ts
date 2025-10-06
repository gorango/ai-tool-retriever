import type { ToolDefinition } from '../types'
import { tool as createTool } from 'ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { InMemoryStore } from './in-memory'

// Mock tools using the CORRECT ToolDefinition structure
const toolADef: ToolDefinition = {
	name: 'toolA',
	tool: createTool({
		description: 'Does A',
		inputSchema: z.object({}),
	}),
	keywords: ['alpha', 'apple'],
}

const toolBDef: ToolDefinition = {
	name: 'toolB',
	tool: createTool({
		description: 'Does B',
		inputSchema: z.object({}),
	}),
	keywords: ['bravo', 'banana'],
}

const embeddingA = [1, 0, 0, 0]
const embeddingB = [0, 1, 0, 0]
const queryEmbedding = [0.9, 0.1, 0, 0]

vi.mock('../embedding/service', () => ({
	EmbeddingService: {
		getInstance: vi.fn().mockResolvedValue({
			getFloatEmbedding: vi.fn().mockImplementation(async (text: string) => {
				if (text.includes('toolA'))
					return embeddingA
				if (text.includes('toolB'))
					return embeddingB
				return [0, 0, 0, 0]
			}),
		}),
	},
}))

describe('InMemoryStore', () => {
	let store: InMemoryStore

	beforeEach(async () => {
		store = await InMemoryStore.create()
		vi.clearAllMocks()
	})

	it('should correctly add tools and generate their embeddings', async () => {
		await store.add([toolADef, toolBDef])
		// @ts-expect-error - accessing private property for test
		expect(store.tools.length).toBe(2)
		// @ts-expect-error - accessing private property for test
		expect(store.tools[0].embedding).toEqual(embeddingA)
		// @ts-expect-error - accessing private property for test
		expect(store.tools[1].embedding).toEqual(embeddingB)
	})

	it('should return tools sorted by cosine similarity', async () => {
		await store.add([toolADef, toolBDef])
		const results = await store.search(queryEmbedding, 2)
		expect(results.length).toBe(2)
		expect(results[0].name).toBe('toolA')
		expect(results[1].name).toBe('toolB')
	})

	it('should respect the `count` parameter', async () => {
		await store.add([toolADef, toolBDef])
		const results = await store.search(queryEmbedding, 1)
		expect(results.length).toBe(1)
		expect(results[0].name).toBe('toolA')
	})

	it('should handle an empty store gracefully', async () => {
		const results = await store.search(queryEmbedding, 5)
		expect(results.length).toBe(0)
	})
})
