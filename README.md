# AI Tool Retriever

[![NPM Version](https://img.shields.io/npm/v/ai-tool-retriever.svg)](https://www.npmjs.com/package/ai-tool-retriever)
[![Codecov](https://img.shields.io/codecov/c/github/gorango/ai-tool-retriever/master)](https://codecov.io/github/gorango/ai-tool-retriever)

This project provides a lightweight, extensible library for dynamically selecting the most relevant tools for your AI agent based on user queries.

## Installation

```bash
npm install ai-tool-retriever
```

## Usage

```typescript
const retriever = await ToolRetriever.create({
	tools: allMyTools,
	embeddingProvider: anyEmbeddingProvider,
	store: inMemoryOrPersistentStore,
})

const relevantTools = await retriever.retrieve(userPrompt)
```

## About

This repo contains the following packages:

-   [`packages/ai-tool-retriever`](/packages/ai-tool-retriever): The core library for semantic tool retrieval.
-   [`packages/benchmark`](/packages/benchmark) A package to benchmark the performance of embedding and search operations.
-   [`packages/e2e`](/packages/e2e/) A package to validate behavior in real-world scenarios.
