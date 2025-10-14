import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/cli.ts'],
	format: ['esm'],
	outDir: 'dist',
	target: 'node20',
	clean: true,
	sourcemap: true,
	external: [
		'sharp',
		'@xenova/transformers',
	],
})
