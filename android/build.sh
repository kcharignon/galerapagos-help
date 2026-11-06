#!/usr/bin/env bash
# Lancé DANS le conteneur Docker de construction, par `make android*` (jamais à la main sur la machine : ni JDK ni SDK n'y sont requis).
#
#   ./build.sh apk               l'APK de débogage : ../dist/galerapagos-debug.apk (clé de débogage publique du dépôt)
#   ./build.sh test              les tests unitaires Kotlin
#   ./build.sh release           l'APK signé : ../dist/galerapagos.apk ; refuse sans clé de signature ni étiquette de version
#   ./build.sh verify-release    contrôle l'APK signé (ou le fichier donné en argument) : signature et empreinte du certificat, version,
#                                permissions, non débogable ; écrit release-facts.env (version, empreintes) pour les notes de la release
#   ./build.sh release-selftest  prouve les refus et la réussite avec une clé jetable créée à l'instant ; rien n'est conservé
#
# Variables d'environnement : ANDROID_VERSION_TAG (android-vX.Y.Z), ANDROID_VERSION_CODE (débogage), et pour `release`
# ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD ; pour `verify-release`
# ANDROID_EXPECTED_CERT_SHA256 (empreinte PUBLIQUE du certificat attendu, plusieurs séparées par des virgules).
# Aucune commande n'écrit un secret.
set -euo pipefail
cd "$(dirname "$0")"

PACKAGE=com.galerapagos.app
DIST="${ANDROID_DIST:-../dist}"
GRADLE=(./gradlew --no-daemon --console=plain)
BUILD_TOOLS="${ANDROID_HOME}/build-tools/${ANDROID_BUILD_TOOLS}"
TAG_RE='^android-v(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})$'
# Les seules permissions que l'application a le droit de déclarer : elle fonctionne hors ligne (pas d'Internet).
ALLOWED_PERMISSIONS=("android.permission.VIBRATE" "${PACKAGE}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION")

fail() { echo "❌ $*" >&2; exit 1; }

# « AA:BB:cc » -> « aabbcc »
normalize_fingerprint() { tr -d ': \n' <<<"$1" | tr 'A-F' 'a-f'; }

# android-v1.2.3 -> « 1.2.3 1002003 »
version_from_tag() {
  [[ "$1" =~ $TAG_RE ]] || fail "« $1 » n'est pas une version android-vX.Y.Z (par exemple android-v0.1.0)."
  echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]} $((BASH_REMATCH[1] * 1000000 + BASH_REMATCH[2] * 1000 + BASH_REMATCH[3]))"
}

build_debug() {
  "${GRADLE[@]}" assembleDebug
  mkdir -p "$DIST"
  cp app/build/outputs/apk/debug/app-debug.apk "$DIST/galerapagos-debug.apk"
  ls -l "$DIST/galerapagos-debug.apk"
  sha256sum "$DIST/galerapagos-debug.apk"
}

require_release_inputs() {
  local missing=() name
  for name in ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD; do
    [ -n "${!name:-}" ] || missing+=("$name")
  done
  [ "${#missing[@]}" -eq 0 ] || fail "pas de clé de signature : variable(s) manquante(s) ${missing[*]}. Une publication se signe avec ta clé, jamais sans (android/PUBLICATION.md)."
  version_from_tag "${ANDROID_VERSION_TAG:-}" > /dev/null
}

build_release() {
  require_release_inputs
  local keystore
  keystore=$(mktemp)
  trap "rm -f '$keystore'" EXIT
  printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$keystore" || fail "ANDROID_KEYSTORE_BASE64 n'est pas du base64 valide."
  ANDROID_KEYSTORE_FILE="$keystore" "${GRADLE[@]}" :app:assembleRelease
  mkdir -p "$DIST"
  cp app/build/outputs/apk/release/app-release.apk "$DIST/galerapagos.apk"
  ls -l "$DIST/galerapagos.apk"
}

verify_release() {
  local apk="${1:-$DIST/galerapagos.apk}"
  [ -f "$apk" ] || fail "l'APK à contrôler manque : $apk (make android-release le produit)."
  [ -n "${ANDROID_EXPECTED_CERT_SHA256:-}" ] || fail "ANDROID_EXPECTED_CERT_SHA256 (l'empreinte publique du certificat attendu) manque : rien n'est contrôlé sans elle."
  local name code
  read -r name code < <(version_from_tag "${ANDROID_VERSION_TAG:-}")

  # Signature valide, certificat attendu, et jamais la clé de débogage publique.
  local signer cert debug_cert expected ok=false
  signer=$("$BUILD_TOOLS/apksigner" verify --print-certs "$apk" 2>&1) || fail "la signature de l'APK n'est pas valide : $signer"
  cert=$(normalize_fingerprint "$(awk -F': ' '/certificate SHA-256 digest/ {print $2; exit}' <<<"$signer")")
  [ -n "$cert" ] || fail "l'empreinte du certificat est introuvable dans la sortie d'apksigner."
  debug_cert=$(normalize_fingerprint "$(keytool -list -v -keystore debug.keystore -storepass android -alias androiddebugkey 2> /dev/null | awk '/SHA256:/ {print $2; exit}')")
  [ "$cert" != "$debug_cert" ] || fail "l'APK est signé de la clé de débogage PUBLIQUE : ce n'est pas une publication."
  IFS=',' read -ra expected <<<"$ANDROID_EXPECTED_CERT_SHA256"
  for e in "${expected[@]}"; do
    [ "$(normalize_fingerprint "$e")" = "$cert" ] && ok=true
  done
  "$ok" || fail "certificat inattendu : l'APK est signé de $cert, qui n'est pas dans ANDROID_EXPECTED_CERT_SHA256."

  # Paquet, version, non débogable, permissions.
  local badging package_line permissions p allowed found
  badging=$("$BUILD_TOOLS/aapt2" dump badging "$apk")
  package_line=$(grep '^package:' <<<"$badging")
  grep -q "name='$PACKAGE'" <<<"$package_line" || fail "le paquet n'est pas $PACKAGE : $package_line"
  grep -q "versionName='$name'" <<<"$package_line" || fail "la version de l'APK n'est pas $name (celle de l'étiquette) : $package_line"
  grep -q "versionCode='$code'" <<<"$package_line" || fail "le code de version de l'APK n'est pas $code : $package_line"
  ! grep -q '^application-debuggable' <<<"$badging" || fail "l'APK est débogable."
  permissions=$(sed -n "s/^uses-permission: name='\([^']*\)'.*/\1/p" <<<"$badging")
  while read -r p; do
    [ -n "$p" ] || continue
    found=false
    for allowed in "${ALLOWED_PERMISSIONS[@]}"; do [ "$p" = "$allowed" ] && found=true; done
    "$found" || fail "permission inattendue : $p (l'application ne doit déclarer que ${ALLOWED_PERMISSIONS[*]})."
  done <<<"$permissions"

  mkdir -p "$DIST"
  {
    echo "VERSION_NAME=$name"
    echo "VERSION_CODE=$code"
    echo "APK_SHA256=$(sha256sum "$apk" | cut -d' ' -f1)"
    echo "CERT_SHA256=$(tr 'a-f' 'A-F' <<<"$cert" | sed 's/../&:/g; s/:$//')"
  } > "$DIST/release-facts.env"
  echo "✅ APK contrôlé : $name (code $code), certificat $cert"
}

release_selftest() {
  local work out tag=android-v0.0.1 password cert wrong
  work=$(mktemp -d)
  trap "rm -rf '$work'" EXIT
  export ANDROID_DIST="$work/dist"

  echo "▶ 1/4 : sans clé de signature, la publication est refusée"
  if out=$(env -u ANDROID_KEYSTORE_BASE64 -u ANDROID_KEYSTORE_PASSWORD -u ANDROID_KEY_ALIAS -u ANDROID_KEY_PASSWORD ANDROID_VERSION_TAG="$tag" "$0" release 2>&1); then
    fail "auto-test : la publication a réussi sans clé."
  fi
  grep -q "pas de clé de signature" <<<"$out" || fail "auto-test : le refus sans clé n'a pas le bon message : $out"

  echo "▶ 2/4 : avec une clé jetable, la publication réussit et se laisse contrôler"
  password=$(head -c 12 /dev/urandom | base64 | tr -d '/+=')
  keytool -genkeypair -keystore "$work/test.p12" -storetype PKCS12 -alias test -keyalg RSA -keysize 2048 -validity 2 \
    -storepass "$password" -keypass "$password" -dname "CN=Cle de test jetable" > /dev/null 2>&1
  env ANDROID_KEYSTORE_BASE64="$(base64 -w0 "$work/test.p12")" ANDROID_KEYSTORE_PASSWORD="$password" \
    ANDROID_KEY_ALIAS=test ANDROID_KEY_PASSWORD="$password" ANDROID_VERSION_TAG="$tag" "$0" release > /dev/null
  "$BUILD_TOOLS/apksigner" verify --print-certs "$ANDROID_DIST/galerapagos.apk" | grep -q "Cle de test jetable" \
    || fail "auto-test : l'APK n'est pas signé de la clé jetable."
  cert=$(keytool -list -v -keystore "$work/test.p12" -storepass "$password" -alias test 2> /dev/null | awk '/SHA256:/ {print $2; exit}')
  env ANDROID_VERSION_TAG="$tag" ANDROID_EXPECTED_CERT_SHA256="$cert" "$0" verify-release > /dev/null \
    || fail "auto-test : le contrôle refuse un APK correct."
  grep -q "^VERSION_NAME=0.0.1$" "$ANDROID_DIST/release-facts.env" || fail "auto-test : release-facts.env n'a pas la bonne version."

  echo "▶ 3/4 : le contrôle refuse un mauvais certificat, une autre version et l'absence d'empreinte"
  wrong=$(sed 's/[0-9A-F]/0/g' <<<"$cert")
  expect_refused() {
    local label=$1; shift
    if env "$@" "$0" verify-release "$ANDROID_DIST/galerapagos.apk" > /dev/null 2>&1; then fail "auto-test : le contrôle a accepté ($label)."; fi
  }
  expect_refused "mauvais certificat" ANDROID_VERSION_TAG="$tag" ANDROID_EXPECTED_CERT_SHA256="$wrong"
  expect_refused "autre version" ANDROID_VERSION_TAG=android-v9.9.9 ANDROID_EXPECTED_CERT_SHA256="$cert"
  if env -u ANDROID_EXPECTED_CERT_SHA256 ANDROID_VERSION_TAG="$tag" "$0" verify-release "$ANDROID_DIST/galerapagos.apk" > /dev/null 2>&1; then
    fail "auto-test : le contrôle a accepté sans empreinte attendue."
  fi

  echo "▶ 4/4 : le contrôle refuse l'APK de débogage (clé publique, débogable)"
  "${GRADLE[@]}" assembleDebug > /dev/null
  cp app/build/outputs/apk/debug/app-debug.apk "$work/debug.apk"
  debug_cert=$(keytool -list -v -keystore debug.keystore -storepass android -alias androiddebugkey 2> /dev/null | awk '/SHA256:/ {print $2; exit}')
  if env ANDROID_VERSION_TAG="$tag" ANDROID_EXPECTED_CERT_SHA256="$debug_cert,$cert" "$0" verify-release "$work/debug.apk" > /dev/null 2>&1; then
    fail "auto-test : le contrôle a accepté l'APK de débogage."
  fi
  echo "✅ Auto-test de la publication réussi (rien n'est conservé)."
}

case "${1:-apk}" in
  apk) build_debug ;;
  test) "${GRADLE[@]}" testDebugUnitTest ;;
  release) build_release ;;
  verify-release) verify_release "${2:-}" ;;
  release-selftest) release_selftest ;;
  *) echo "usage : ./build.sh apk|test|release|verify-release|release-selftest" >&2; exit 2 ;;
esac
