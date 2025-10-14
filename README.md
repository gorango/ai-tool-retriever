# AI Tool Retriever

[![NPM Version](https://img.shields.io/npm/v/ai-tool-retriever.svg)](https://www.npmjs.com/package/ai-tool-retriever)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Codecov](https://img.shields.io/codecov/c/github/gorango/ai-tool-retriever/master)](https://codecov.io/github/gorango/ai-tool-retriever)

This project provides a lightweight, extensible library for dynamically selecting the most relevant tools for your AI agent based on user queries.

## About the Project

This repository is structured as a monorepo using pnpm workspaces and contains the following packages:

-   [`packages/ai-tool-retriever`](/packages/ai-tool-retriever): The core NPM package. It's a lightweight, implementation-agnostic library for semantic tool retrieval.
-   [`packages/benchmark`](/packages/benchmark) A private package containing scripts to benchmark the performance of embedding and search operations.
-   [`packages/e2e`](/packages/e2e/) A private package with end-to-end tests to validate the library's behavior in real-world scenarios, including CLI interactions and model caching.

## Development Setup

This project uses pnpm as its package manager.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/gorango/ai-tool-retriever.git
    cd ai-tool-retriever
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Common Scripts

The following scripts can be run from the root of the repository:

-   **`pnpm lint`**: Lint and format all files in the workspace.
-   **`pnpm typecheck`**: Run TypeScript to check for type errors.
-   **`pnpm build`**: Build all public packages in the workspace.
-   **`pnpm test`**: Run unit tests for the `ai-tool-retriever` package.
-   **`pnpm test:coverage`**: Run unit tests and generate a coverage report.
-   **`pnpm e2e`**: Execute the end-to-end tests.
-   **`pnpm benchmark`**: Run the performance benchmarks.

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and ensure all tests pass.
4.  Submit a pull request with a clear description of your changes.

---

Licensed under the [MIT License](https://github.com/gorango/ai-tool-retriever/tree/main/LICENSE).
