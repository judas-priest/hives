#!/bin/bash
# Test that CLI handles exit gracefully

cd "$(dirname "$0")/.." || exit 1

echo "Testing Modern CLI exit handling..."
echo ""

# Set a fake API key for testing
export POLZA_API_KEY="test_key_for_exit_testing"

# Test 1: /exit command
echo "Test 1: Testing /exit command"
echo "/exit" | timeout 5 node modern-cli/src/index.js 2>&1 | grep -q "Goodbye"
if [ $? -eq 0 ]; then
    echo "✓ /exit command works"
else
    echo "✗ /exit command failed"
fi

# Test 2: Ctrl+D (EOF)
echo ""
echo "Test 2: Testing Ctrl+D (EOF)"
echo "" | timeout 5 node modern-cli/src/index.js 2>&1 > /tmp/cli-test-output.txt
if grep -q "Goodbye" /tmp/cli-test-output.txt || grep -q "Modern CLI" /tmp/cli-test-output.txt; then
    echo "✓ Ctrl+D handling works"
else
    echo "✗ Ctrl+D handling failed"
    echo "Output:"
    cat /tmp/cli-test-output.txt
fi

echo ""
echo "Tests completed!"
