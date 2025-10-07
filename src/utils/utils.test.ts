import type { ToolDefinition } from '../types'
import { tool as createTool } from 'ai'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { cosineSimilarity, createToolContentHash, extractToolsFromQuerySyntax } from './utils'

describe('extractToolsFromQuerySyntax', () => {
	it('should extract a single tool name', () => {
		expect(extractToolsFromQuerySyntax('Some query about [myTool]')).toEqual(['myTool'])
	})

	it('should extract multiple unique tool names', () => {
		const result = extractToolsFromQuerySyntax('Use [toolA] and [toolB] for this')
		expect(result).toHaveLength(2)
		expect(result).toContain('toolA')
		expect(result).toContain('toolB')
	})

	it('should handle duplicate tool names, returning only unique names', () => {
		const result = extractToolsFromQuerySyntax('Use [toolA] and then [toolA] again')
		expect(result).toEqual(['toolA'])
	})

	it('should return an empty array if no tool syntax is present', () => {
		expect(extractToolsFromQuerySyntax('A regular query without tools')).toEqual([])
	})

	it('should handle tool names with spaces and trims them', () => {
		expect(extractToolsFromQuerySyntax('Query for [ toolA ]')).toEqual(['toolA'])
	})

	it('should return an empty array for empty brackets', () => {
		expect(extractToolsFromQuerySyntax('Query with []')).toEqual([])
	})

	it('should return an empty array for brackets with only whitespace', () => {
		expect(extractToolsFromQuerySyntax('Query with [ ]')).toEqual([])
	})

	it('should extract multiple tools mixed with other text', () => {
		const result = extractToolsFromQuerySyntax('Text [toolA] middle text [toolB] end text.')
		expect(result).toEqual(['toolA', 'toolB'])
	})
})

describe('cosineSimilarity', () => {
	it('should return 1 for identical vectors', () => {
		const vec = [1, 2, 3]
		expect(cosineSimilarity(vec, vec)).toBeCloseTo(1)
	})

	it('should return -1 for opposite vectors', () => {
		const vecA = [1, 2, 3]
		const vecB = [-1, -2, -3]
		expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1)
	})

	it('should return 0 for orthogonal vectors', () => {
		const vecA = [1, 0]
		const vecB = [0, 1]
		expect(cosineSimilarity(vecA, vecB)).toBe(0)
	})

	it('should return 0 for vectors of different lengths', () => {
		const vecA = [1, 2]
		const vecB = [1, 2, 3]
		expect(cosineSimilarity(vecA, vecB)).toBe(0)
	})

	it('should return 0 if one vector is all zeros', () => {
		const vecA = [1, 2, 3]
		const vecB = [0, 0, 0]
		expect(cosineSimilarity(vecA, vecB)).toBe(0)
	})
})

describe('createToolContentHash', () => {
	const baseTool: ToolDefinition = {
		name: 'myTool',
		tool: createTool({
			description: 'A test tool',
			inputSchema: z.object({ param: z.string() }),
		}),
		keywords: ['test', 'alpha'],
	}

	it('should be deterministic for the same tool definition', () => {
		const hash1 = createToolContentHash(baseTool)
		const hash2 = createToolContentHash(baseTool)
		expect(hash1).toBe(hash2)
		expect(hash1).toBe('9fcdb9d4de7269f1a936c267bb6eb8a54bf4f9999dea7117d5b8a652a49a8fce')
	})

	it('should produce a different hash if the description changes', () => {
		const modifiedTool: ToolDefinition = {
			...baseTool,
			tool: createTool({ ...baseTool.tool, description: 'A different description' }),
		}
		const hash1 = createToolContentHash(baseTool)
		const hash2 = createToolContentHash(modifiedTool)
		expect(hash1).not.toBe(hash2)
	})

	it('should produce a different hash if keywords are added or changed', () => {
		const modifiedTool: ToolDefinition = {
			...baseTool,
			keywords: ['test', 'alpha', 'beta'],
		}
		const hash1 = createToolContentHash(baseTool)
		const hash2 = createToolContentHash(modifiedTool)
		expect(hash1).not.toBe(hash2)
	})

	it('should produce the same hash regardless of keyword order', () => {
		const modifiedTool: ToolDefinition = {
			...baseTool,
			keywords: ['alpha', 'test'], // flipped order
		}
		const hash1 = createToolContentHash(baseTool)
		const hash2 = createToolContentHash(modifiedTool)
		expect(hash1).toBe(hash2)
	})

	it('should produce a different hash if the Zod schema changes', () => {
		const modifiedTool: ToolDefinition = {
			...baseTool,
			tool: createTool({
				...baseTool.tool,
				inputSchema: z.object({ param: z.number() }),
			}),
		}
		const hash1 = createToolContentHash(baseTool)
		const hash2 = createToolContentHash(modifiedTool)
		expect(hash1).not.toBe(hash2)
	})
})
