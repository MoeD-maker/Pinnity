#!/bin/bash

# Cypress Test Runner for Pinnity App
# This script runs all E2E tests in headless mode

set -e

echo "🚀 Starting Cypress E2E Tests for Pinnity"
echo "========================================"

# Check if server is running
if ! curl -f http://localhost:5000/api/csrf-token > /dev/null 2>&1; then
    echo "❌ Server is not running on port 5000"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo "✅ Server is running on port 5000"

# Check if Cypress is installed
if ! npx cypress --version > /dev/null 2>&1; then
    echo "❌ Cypress is not installed"
    echo "Please install with: npm install cypress"
    exit 1
fi

echo "✅ Cypress is installed"

# Create test results directory
mkdir -p cypress/results

# Run all tests
echo "🧪 Running E2E tests..."
echo ""

# Run tests with proper configuration
npx cypress run \
    --headless \
    --browser chrome \
    --config video=false,screenshotOnRunFailure=true \
    --reporter json \
    --reporter-options "toConsole=true,output=cypress/results/test-results.json" \
    --spec "cypress/integration/**/*.spec.ts"

TEST_EXIT_CODE=$?

echo ""
echo "========================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed successfully!"
    echo "📊 Test results saved to cypress/results/test-results.json"
else
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
    echo "📊 Check cypress/results/ for screenshots and detailed results"
fi

echo "🏁 Test run completed"
exit $TEST_EXIT_CODE