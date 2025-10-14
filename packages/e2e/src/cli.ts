import process from 'node:process'
import { ToolNotFoundError } from 'ai-tool-retriever'
import { initializeRetriever } from './retriever.js'

async function main() {
	const args = process.argv.slice(2)
	const query = args[0]
	const strictMode = args.includes('--strict')

	if (!query) {
		console.error('Usage: node dist/cli.js <query> [--strict]')
		process.exit(1)
	}

	try {
		const retriever = await initializeRetriever()
		const relevantTools = await retriever.retrieve(query, { strict: strictMode })
		const toolNames = Object.keys(relevantTools)

		// output tool names one per line for easy parsing in shell
		if (toolNames.length > 0) {
			console.log(toolNames.join('\n'))
		}

		process.exit(0)
	}
	catch (e) {
		if (e instanceof ToolNotFoundError) {
			console.error(`E2E_ERROR: ${e.message}`)
			process.exit(10) // custom exit code for specific error
		}
		else {
			if (e instanceof Error) {
				console.error(`An unexpected error occurred: ${e.message}`)
			}
			else {
				console.error('An unexpected and unknown error occurred:', e)
			}
			process.exit(1)
		}
	}
}

main()
