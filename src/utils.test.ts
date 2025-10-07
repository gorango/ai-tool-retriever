import { describe, expect, it } from 'vitest'
import { cosineSimilarity, extractToolsFromQuerySyntax } from './utils'

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
