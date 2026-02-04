#!/usr/bin/env bash
set -e

# Support dynamic basePath for preview deployments
EXPECTED_BASE_PATH="${PREVIEW_BASE_PATH:-/kitaab}"

pushd out

if [ ! -f index.html ]; then
  echo "ERROR: index.html missing"
  exit 1
fi

if [ ! -f 404.html ]; then
  echo "ERROR: 404.html missing (required for SPA refresh support)"
  exit 1
fi

# Quick check that basePath is present in built files
if ! grep -q "${EXPECTED_BASE_PATH}/" index.html; then
  echo "ERROR: basePath '${EXPECTED_BASE_PATH}' not found in index.html"
  echo "NODE_ENV may not be production during build. Check your build configuration."
  exit 1
fi

popd

echo "CI sanity checks: OK"
echo "- index.html exists"
echo "- 404.html exists"
echo "- basePath '${EXPECTED_BASE_PATH}' found in built files"
