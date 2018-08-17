#! /usr/bin/env bash

set -o xtrace
set -o nounset
set -o errexit
set -o pipefail

function main() {
    local -r SELF_DIR="$(cd "$(dirname "$0")"; pwd)"
    local -r BUILD_DIR="${SELF_DIR}/../build"
    rm -rf "$BUILD_DIR/*"
    pushd "$SELF_DIR" > /dev/null
    xcodebuild -workspace ../src/Topee.xcworkspace -scheme Topee clean build CONFIGURATION=Release BUILD_DIR="$BUILD_DIR"
    pushd "$BUILD_DIR/Release" > /dev/null
    cp "${SELF_DIR}/../src/Framework/Build/topee-content.js" .
    cp "${SELF_DIR}/../src/Framework/Build/topee-iframe-resources.js" .
    zip -yr "Topee.framework.zip" .
    popd > /dev/null
    popd > /dev/null
}

main "$@"

