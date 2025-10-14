#!/bin/bash
set -e

echo "--- E2E Test: Pre-downloaded Model ---"

# ensure no model cache exists
rm -rf .models

echo "Pre-downloading the model using the CLI command..."
npx ai-tool-retriever-download

echo "Running first query with pre-downloaded model (expecting fast)..."
START_TIME=$(date +%s%N)
node dist/cli.js "is it sunny?" >/dev/null
END_TIME=$(date +%s%N)
DURATION=$(((END_TIME - START_TIME) / 1000000))
echo "First run took ${DURATION}ms."

# threshold for a "fast" start (should be well under 2 sec)
if [ $DURATION -lt 2000 ]; then
	echo "✅ PASS: The application started quickly using the pre-downloaded model."
	rm -rf .models
else
	echo "❌ FAIL: The application start was slow, suggesting it did not use the pre-downloaded model."
	rm -rf .models
	exit 1
fi
