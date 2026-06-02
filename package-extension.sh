#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${REPO_ROOT}/release"
OUT_FILE="${OUT_DIR}/kitreal-capture-extension.zip"

mkdir -p "${OUT_DIR}"
rm -f "${OUT_FILE}"

cd "${REPO_ROOT}"
zip -rq "${OUT_FILE}" manifest.json background.js ExtPay.js popup.html popup.css popup.js README.md

echo "Created: ${OUT_FILE}"
