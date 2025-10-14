#!/bin/bash
set -e

echo "--- E2E Test: Cold Start Performance ---"

# ensure no model cache exists
rm -rf .models

echo "Running first query (expecting slow, will download model)..."
START_TIME=$(date +%s%N)
node dist/cli.js "what is the temperature?" >/dev/null
END_TIME=$(date +%s%N)
FIRST_RUN_DURATION=$(((END_TIME - START_TIME) / 1000000))
echo "First run took ${FIRST_RUN_DURATION}ms."

echo "Running second query (expecting fast, using cached model)..."
START_TIME=$(date +%s%N)
node dist/cli.js "what are the earnings for NVDA?" >/dev/null
END_TIME=$(date +%s%N)
SECOND_RUN_DURATION=$(((END_TIME - START_TIME) / 1000000))
echo "Second run took ${SECOND_RUN_DURATION}ms."

# threshold is generous to avoid flaky tests in CI
if [ $FIRST_RUN_DURATION -gt $((SECOND_RUN_DURATION * 3)) ] && [ $FIRST_RUN_DURATION -gt 1000 ]; then
	echo "✅ PASS: First run was significantly slower than the second."
else
	echo "❌ FAIL: First run was not significantly slower than the second. Caching may not be working."
	exit 1
fi
