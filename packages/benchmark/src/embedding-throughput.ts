import { randomBytes } from 'node:crypto'
import { TransformersEmbeddingProvider } from 'ai-tool-retriever/providers/embedding/transformers'

// random sentences for benchmarking
function generateRandomTexts(count: number): string[] {
	return Array.from({ length: count }, () => randomBytes(8).toString('hex'))
}

async function runBenchmark() {
	console.log('--- Benchmark: Embedding Throughput ---')
	console.log('Initializing embedding provider...')
	const provider = await TransformersEmbeddingProvider.create()
	console.log('Provider initialized.\n')

	const batchSizes = [1, 10, 50, 100, 250]

	for (const size of batchSizes) {
		const texts = generateRandomTexts(size)

		const startTime = performance.now()
		await provider.getFloatEmbeddingsBatch(texts)
		const endTime = performance.now()

		const duration = endTime - startTime
		const throughput = (size / (duration / 1000)).toFixed(2) // texts per second

		console.log(`Batch Size: ${size}`)
		console.log(`  - Total Time: ${duration.toFixed(2)}ms`)
		console.log(`  - Throughput: ${throughput} embeddings/sec\n`)
	}

	// dispose to allow the script to exit cleanly
	await TransformersEmbeddingProvider.dispose()
}

runBenchmark()
