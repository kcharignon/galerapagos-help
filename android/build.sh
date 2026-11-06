#!/usr/bin/env bash
# Construit l'application dans le conteneur : `./build.sh apk` (APK de débogage dans ../dist) ou `./build.sh test` (tests unitaires).
set -euo pipefail
cd "$(dirname "$0")"
gradle=(./gradlew --no-daemon --console=plain)

case "${1:-apk}" in
  apk)
    "${gradle[@]}" assembleDebug
    mkdir -p ../dist
    cp app/build/outputs/apk/debug/app-debug.apk ../dist/galerapagos-debug.apk
    ls -l ../dist/galerapagos-debug.apk
    sha256sum ../dist/galerapagos-debug.apk
    ;;
  test)
    "${gradle[@]}" testDebugUnitTest
    ;;
  *)
    echo "usage : ./build.sh apk|test" >&2
    exit 2
    ;;
esac
