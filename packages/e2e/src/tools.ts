import type { ToolDefinition } from 'ai-tool-retriever'
import { tool } from 'ai'
import { z } from 'zod'

export const allMyTools: ToolDefinition[] = [
	{
		name: 'getWeather',
		tool: tool({
			description: 'Fetches the weather for a given location.',
			inputSchema: z.object({ city: z.string() }),
		}),
		keywords: ['forecast', 'temperature', 'climate', 'rain', 'sun'],
	},
	{
		name: 'searchFinancialNews',
		tool: tool({
			description: 'Searches for financial news articles about a company.',
			inputSchema: z.object({ ticker: z.string() }),
		}),
		keywords: ['stocks', 'market', 'earnings', 'sec filings', 'investing'],
	},
]
