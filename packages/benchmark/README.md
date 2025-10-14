# Benchmark Suite

This package contains scripts for benchmarking the performance of the `ai-tool-retriever` library. It is not intended for public consumption.

## Purpose

The benchmarks measure two key areas:

1.  **Embedding Throughput**: How many text embeddings can be generated per second by the `TransformersEmbeddingProvider`.
2.  **Search Scalability**: How the search performance of the `InMemoryStore` degrades as the number of tools increases.

## Usage

Scripts are run from the root of the monorepo.

```bash
# Run all benchmark tests
pnpm benchmark

# Run a specific test
pnpm --filter benchmark test:throughput
pnpm --filter benchmark test:scalability
```
