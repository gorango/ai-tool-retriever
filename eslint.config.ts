import antfu from '@antfu/eslint-config'

export default antfu(
	{
		stylistic: {
			indent: 'tab',
			quotes: 'single',
			semi: false,
		},
		ignores: [
			'**/*.d.ts',
			'**/*.md',
		],
	},
	{
		rules: {
			'no-console': 'off',
			'test/prefer-lowercase-title': 'off',
		},
	},
)
