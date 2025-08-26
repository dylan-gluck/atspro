#!/bin/bash

echo "🧪 Running ATSPro Test Suite"
echo "============================"

# Run unit tests
echo ""
echo "📦 Running Unit Tests..."
bun test src/lib --bail

if [ $? -ne 0 ]; then
    echo "❌ Unit tests failed"
    exit 1
fi

echo "✅ Unit tests passed"

# Run E2E tests (Chromium only)
echo ""
echo "🌐 Running E2E Tests (Chromium)..."
npm run test:e2e -- --project=chromium

if [ $? -ne 0 ]; then
    echo "❌ E2E tests failed"
    exit 1
fi

echo "✅ E2E tests passed"

# Run type checking
echo ""
echo "🔍 Running Type Check..."
bun run check

if [ $? -ne 0 ]; then
    echo "❌ Type checking failed"
    exit 1
fi

echo "✅ Type checking passed"

echo ""
echo "========================================="
echo "✅ All tests passed successfully!"
echo "========================================="