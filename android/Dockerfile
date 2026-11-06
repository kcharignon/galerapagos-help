# syntax=docker/dockerfile:1
# Image de construction de l'application Android : JDK 17 et SDK Android (Gradle vient du wrapper du projet, vérifié par empreinte).
# Rien n'y contacte un autre site que les dépôts officiels (Gradle, Google, Maven Central).
FROM eclipse-temurin:17-jdk-jammy

# « commandlinetools-linux-<n>_latest.zip » : numéro et empreinte du dépôt officiel de Google.
ARG CMDLINE_TOOLS=16111833
ARG CMDLINE_TOOLS_SHA256=0877a1d048fe4a24efe2eff536ca4223f7adeb58648bb81909d33c446918cfa8
ARG ANDROID_PLATFORM=36
ARG ANDROID_BUILD_TOOLS=36.0.0

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
RUN curl -fsSL -o /tmp/cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS}_latest.zip" \
    && echo "${CMDLINE_TOOLS_SHA256}  /tmp/cmdline-tools.zip" | sha256sum -c - \
    && mkdir -p "${ANDROID_HOME}/cmdline-tools" \
    && unzip -q /tmp/cmdline-tools.zip -d "${ANDROID_HOME}/cmdline-tools" \
    && mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest" \
    && rm /tmp/cmdline-tools.zip

# Les licences du SDK Android sont acceptées ici, à la construction de l'image (comme dans toute image de CI Android).
RUN (set +o pipefail; yes | "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null) \
    && "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-${ANDROID_PLATFORM}" "build-tools;${ANDROID_BUILD_TOOLS}" > /dev/null \
    && chmod -R a+rwX "${ANDROID_HOME}"

# L'image tourne avec l'identifiant de l'utilisateur de la machine (`user:` de compose) : le cache de Gradle, la clé de débogage
# (ANDROID_USER_HOME) et le dossier personnel doivent être ouverts en écriture à tout le monde. /gradle est un volume nommé.
ENV ANDROID_BUILD_TOOLS=${ANDROID_BUILD_TOOLS}
ENV GRADLE_USER_HOME=/gradle
ENV ANDROID_USER_HOME=/gradle/android
ENV HOME=/tmp/home
RUN mkdir -p /gradle/android /tmp/home && chmod -R 1777 /gradle /tmp/home

WORKDIR /work/android
