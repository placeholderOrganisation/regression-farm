#!/usr/bin/env bash
# Build and push the four demo test images to Docker Hub.
#
# Usage:
#   docker login -u minteksoftware
#   ./tests-sample/build_and_push.sh                  # uses default prefix
#   IMAGE_PREFIX=youruser/regression-farm ./tests-sample/build_and_push.sh
set -euo pipefail

PREFIX="${IMAGE_PREFIX:-minteksoftware/regression-farm}"
HERE="$(cd "$(dirname "$0")" && pwd)"

VARIANTS=(pytest-pass pytest-fail pytest-flaky pytest-slow)

for v in "${VARIANTS[@]}"; do
    tag="${PREFIX}:${v}"
    echo "==> building ${tag}"
    docker build -t "${tag}" "${HERE}/${v}"
    echo "==> pushing ${tag}"
    docker push "${tag}"
done

echo
echo "Published:"
for v in "${VARIANTS[@]}"; do
    echo "  ${PREFIX}:${v}"
done
