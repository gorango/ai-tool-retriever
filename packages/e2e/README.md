# End-to-End (E2E) Tests

This package contains end-to-end tests for the `ai-tool-retriever` library. It is not intended for public consumption.

## Purpose

These tests validate the library's behavior in a simulated real-world environment. They use a command-line interface (`cli.ts`) to interact with the retriever and verify outcomes using shell scripts.

The test scenarios include:

1.  **Cold Start Performance**: Verifying that the embedding model is downloaded on first use and cached for subsequent runs.
3.  **Strict Mode**: Confirming that the retriever correctly throws an error when a non-existent tool is explicitly requested in strict mode.

## Usage

Tests are run from the root of the monorepo.

```bash
# Run all E2E tests
pnpm e2e
```
