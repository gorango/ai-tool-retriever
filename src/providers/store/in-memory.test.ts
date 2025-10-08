import type { EmbeddingProvider } from '../../core/embedding'
import type { ToolDefinition } from '../../core/types'
import { tool as createTool } from 'ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { InMemoryStore } from './in-memory'

const toolADef: ToolDefinition = {
	name: 'toolA',
	tool: createTool({ description: 'Does A', inputSchema: z.object({}) }),
	keywords: ['alpha', 'apple'],
}
const toolBDef: ToolDefinition = {
	name: 'toolB',
	tool: createTool({ description: 'Does B', inputSchema: z.object({}) }),
	keywords: ['bravo', 'banana'],
}
const toolCDef: ToolDefinition = {
	name: 'toolC',
	tool: createTool({ description: 'Does C', inputSchema: z.object({}) }),
}

const embeddingA = [1, 0, 0, 0]
const embeddingB = [0, 1, 0, 0]
const queryEmbedding = [0.9, 0.1, 0, 0]

const mockEmbeddingProvider: EmbeddingProvider = {
	dimensions: 4,
	getFloatEmbedding: vi.fn().mockResolvedValue([0, 0, 0, 0]),
	getFloatEmbeddingsBatch: vi.fn().mockImplementation(async (texts: string[]) => {
		return texts.map((text) => {
			if (text.includes('toolA'))
				return embeddingA
			if (text.includes('toolB'))
				return embeddingB
			return [0, 0, 0, 0]
		})
	}),
}

describe('InMemoryStore', () => {
	let store: InMemoryStore

	beforeEach(async () => {
		vi.clearAllMocks()
		store = InMemoryStore.create({ embeddingProvider: mockEmbeddingProvider })
	})

	it('should correctly sync tools and generate their metadata', async () => {
		await store.sync([toolADef, toolBDef])
		// @ts-expect-error - accessing private property for test
		expect(store.tools.length).toBe(2)
		// @ts-expect-error - accessing private property for test
		expect(store.tools[0].embedding).toEqual(embeddingA)
		// @ts-expect-error - accessing private property for test
		expect(store.tools[1].embedding).toEqual(embeddingB)
		// @ts-expect-error - accessing private property for test
		expect(store.tools[0].contentHash).toBeDefined()
		// @ts-expect-error - accessing private property for test
		expect(typeof store.tools[0].contentHash).toBe('string')
	})

	it('should overwrite existing tools when re-syncing', async () => {
		// First sync
		await store.sync([toolADef])
		// @ts-expect-error - accessing private property for test
		expect(store.tools.length).toBe(1)
		// @ts-expect-error - accessing private property for test
		expect(store.tools[0].definition.name).toBe('toolA')

		// Re-sync with a different set of tools
		await store.sync([toolBDef, toolCDef])
		// @ts-expect-error - accessing private property for test
		expect(store.tools.length).toBe(2)
		// @ts-expect-error - accessing private property for test
		expect(store.tools[0].definition.name).toBe('toolB')
		// @ts-expect-error - accessing private property for test
		expect(store.tools[1].definition.name).toBe('toolC')
	})

	it('should clear the store when syncing with an empty array', async () => {
		await store.sync([toolADef])
		// @ts-expect-error - accessing private property for test
		expect(store.tools.length).toBe(1)

		await store.sync([])
		// @ts-expect-error - accessing private property for test
		expect(store.tools.length).toBe(0)
	})

	it('should return tools sorted by cosine similarity', async () => {
		await store.sync([toolADef, toolBDef])
		const results = await store.search(queryEmbedding, 2, 0)
		expect(results.length).toBe(2)
		expect(results[0].name).toBe('toolA')
		expect(results[1].name).toBe('toolB')
	})

	it('should respect the `count` parameter', async () => {
		await store.sync([toolADef, toolBDef])
		const results = await store.search(queryEmbedding, 1, 0)
		expect(results.length).toBe(1)
		expect(results[0].name).toBe('toolA')
	})

	it('should filter results by similarity threshold', async () => {
		await store.sync([toolADef, toolBDef])
		const threshold = 0.5
		const results = await store.search(queryEmbedding, 2, threshold)
		expect(results.length).toBe(1)
		expect(results[0].name).toBe('toolA')
	})

	it('should handle an empty store gracefully', async () => {
		const results = await store.search(queryEmbedding, 5, 0)
		expect(results.length).toBe(0)
	})
})
