import { randomBytes } from 'node:crypto'
import { tool } from 'ai'
import type { ToolDefinition } from 'ai-tool-retriever'
import { InMemoryStore } from 'ai-tool-retriever/providers/store/in-memory'
import { z } from 'zod'

type EmbeddingProvider = {
	dimensions: number
	getFloatEmbedding: (text: string) => Promise<number[]>
	getFloatEmbeddingsBatch: (texts: string[]) => Promise<number[][]>
}

const mockEmbeddingProvider = {
	dimensions: 4,
	getFloatEmbedding: async () => [0, 0, 0, 0],
	getFloatEmbeddingsBatch: async (texts: string[]) => {
		return texts.map(() => [Math.random(), Math.random(), Math.random(), Math.random()])
	},
}

function createMockTools(count: number): ToolDefinition[] {
	return Array.from({ length: count }, (_, i) => ({
		name: `tool_${i}`,
		tool: tool({
			description: `This is mock tool #${i}`,
			inputSchema: z.object({}),
		}),
		keywords: [randomBytes(4).toString('hex')],
	}))
}

async function runBenchmark() {
	console.log('--- Benchmark: InMemoryStore Search Scalability ---\n')
	const store = InMemoryStore.create()
	const queryEmbedding = [0.5, 0.5, 0.5, 0.5]
	const toolCounts = [10, 50, 100, 250, 500]

	for (const count of toolCounts) {
		const tools = createMockTools(count)
		await store.sync(tools, mockEmbeddingProvider as EmbeddingProvider)

		const searchIterations = 100
		const startTime = performance.now()
		for (let i = 0; i < searchIterations; i++) {
			await store.search(queryEmbedding, 5, 0)
		}
		const endTime = performance.now()

		const duration = endTime - startTime
		const avgTime = (duration / searchIterations).toFixed(4)

		console.log(`Tool Count: ${count}`)
		console.log(`  - Total Time (${searchIterations} iterations): ${duration.toFixed(2)}ms`)
		console.log(`  - Average Search Time: ${avgTime}ms\n`)
	}
}

runBenchmark()
