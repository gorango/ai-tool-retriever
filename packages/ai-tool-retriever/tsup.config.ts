import { defineConfig } from 'tsup'

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/providers/embedding/transformers.ts',
		'src/providers/store/in-memory.ts',
		'src/utils/index.ts',
		'src/providers/embedding/download.ts',
	],
	external: [
		'sharp',
		'@xenova/transformers',
	],
	format: ['esm'],
	dts: false,
	splitting: true,
	sourcemap: true,
	clean: true,
	minify: true,
})
