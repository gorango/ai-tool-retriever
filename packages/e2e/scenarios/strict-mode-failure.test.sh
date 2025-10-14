#!/bin/bash
set -e

echo "--- E2E Test: Strict Mode Failure ---"

echo "Running query with missing tool in strict mode..."
# expect this command to fail, so negate the check
if ! node dist/cli.js "some query with [aMissingTool]" --strict 2> >(grep 'E2E_ERROR'); then
	# the command failed as expected - check the exit code.
	if [ "${PIPESTATUS[0]}" -eq 10 ]; then
		echo "✅ PASS: Command failed with the correct error message and exit code (10)."
	else
		echo "❌ FAIL: Command failed with an unexpected exit code: ${PIPESTATUS[0]}"
		exit 1
	fi
else
	echo "❌ FAIL: The command succeeded when it should have failed."
	exit 1
fi
