import { ToolRetriever } from 'ai-tool-retriever'
import { TransformersEmbeddingProvider } from 'ai-tool-retriever/providers/embedding/transformers'
import { InMemoryStore } from 'ai-tool-retriever/providers/store/in-memory'
import { allMyTools } from './tools.js'

// centralize retriever initialization for the e2e tests
export async function initializeRetriever() {
	const embeddingProvider = await TransformersEmbeddingProvider.create()
	const store = InMemoryStore.create()

	const retriever = await ToolRetriever.create({
		tools: allMyTools,
		embeddingProvider,
		store,
	})

	return retriever
}
