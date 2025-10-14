#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { env, pipeline } from '@xenova/transformers'

// This script pre-downloads the model to avoid a cold start on first use.
// It's the same logic used by the TransformersEmbeddingProvider, ensuring the same cache location.

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'
const CACHE_DIR = path.join(process.cwd(), '.models')

async function downloadModel() {
	console.log('--- Starting Model Download ---')
	console.log(`Model: ${MODEL_NAME}`)
	console.log(`Cache Directory: ${CACHE_DIR}`)

	// Configure transformers.js to use the local cache
	env.cacheDir = CACHE_DIR
	env.allowLocalModels = true

	try {
		console.log('\nDownloading model files (this may take a moment)...')
		await pipeline('feature-extraction', MODEL_NAME, {
			progress_callback: (progress: any) => {
				if (!progress.file)
					return

				const progressValue = progress.progress ?? 0
				const loadedBytes = progress.loaded ?? 0
				const totalBytes = progress.total ?? 0

				const item = progress.file.split('/').pop() || 'unknown file'
				const percentage = progressValue.toFixed(2)

				const status = (progress.status || 'downloading').padEnd(12)
				const itemName = item.padEnd(25)
				const percentStr = `${percentage.padStart(6)}%`
				const bytesStr = `${loadedBytes.toLocaleString().padStart(10)} / ${totalBytes.toLocaleString().padEnd(10)} bytes`

				process.stdout.write(`\r${status} | ${itemName} | ${percentStr} | ${bytesStr}`)
			},
		})

		process.stdout.write('\n\n--- Model Download Complete ---\n')
	}
	catch (error) {
		process.stdout.write('\n')
		console.error('\n--- Model Download Failed ---')
		console.error(error)
		process.exit(1)
	}
}

downloadModel()
