# Galèrapagos — développer

Tout tourne dans Docker.

```bash
make start         # construit et lance le site : http://localhost:8080  (WEB_PORT pour changer le port)
make test          # tests des règles de tirage du site (Node, dans un conteneur)
make android       # construit l'APK de débogage : dist/galerapagos-debug.apk, puis servi sur /galerapagos.apk
make android-test  # tests unitaires Kotlin (JDK 17 + SDK Android dans un conteneur)
make android-release-selftest  # prouve la chaîne de publication signée avec une clé jetable
make check         # tous les tests
make build         # régénère les SVG, les drawables Android et web/index.html depuis les sources
make help          # toutes les commandes
```

- `web` : Caddy sert la page unique (CSP stricte, aucune ressource externe). L'APK construit y est téléchargeable depuis le téléphone (`/galerapagos.apk`).
- `android` / `android-test` : image JDK 17 + SDK Android (les licences du SDK sont acceptées à la construction de l'image, comme dans toute image de CI Android). Le premier lancement télécharge le SDK et Gradle (plusieurs minutes) ; le cache et la clé de débogage vivent dans le volume `android-gradle`, donc l'APK se met à jour par-dessus l'ancien.
- Sur le téléphone (même Wi-Fi) : `http://<ip-de-la-machine>:8080`.

Sans Docker :

- Site : `node tools/build-web.js` régénère `web/index.html` ; ouvrir le fichier sur le téléphone (ou le servir en HTTPS).
- Android : ouvrir `android/` dans **Android Studio** (JDK 17), laisser Gradle synchroniser, lancer sur un appareil. En ligne de commande : `cd android && ./gradlew assembleDebug` puis `./gradlew test`.

## Règles et tests

Le hasard vient de `crypto.getRandomValues` (web) et `kotlin.random.Random` (Android). Les règles sont testées
(`tests/web-logic.test.js`, `android/app/src/test/…/GameRulesTest.kt`) : probabilités de morsure, de pêche et gains garantis.

Choix d'interprétation : avec la canne à pêche, le total des deux tirages est la **somme**. Si la canne doit garder seulement la meilleure prise,
changer `fishing()` (web) et `GameRules.fish()` (Android).

## Versions et mises à jour

Chaîne Android : JDK 17, Gradle 8.14, plugin Android 8.13, Kotlin 1.9.25 avec Compose compiler 1.5.15, Compose 1.7 (BOM 2025.03.01),
`core-ktx` 1.17, `activity-compose` 1.11, `lifecycle` 2.9. **Dependabot ne propose aucune montée majeure** (`.github/dependabot.yml`) :
passer à Kotlin 2 / plugin Android 9 / JDK 25 est un chantier à faire d'un bloc, à la main. Les bibliothèques plus récentes
(`core-ktx` 1.18 et plus) exigent Kotlin 2.1 ou le plugin Android 9 et ne se construisent pas avec cette chaîne.

## Organisation du dépôt

```
art/              illustrations SVG (générées) : source unique du style pour le web et Android
tools/            scripts Node sans dépendance : make-art.js (dessins), svg2vd.js (SVG -> Android), build-web.js (page unique)
web/              page unique : index.template.html (source) et index.html (générée)
android/          appli Kotlin / Jetpack Compose, build.sh, Dockerfile, PUBLICATION.md
tests/            tests Node des règles du site
docker/ + Dockerfile + compose.yaml + Makefile    conteneurs et commandes
.github/          workflows : CI, Android, publication signée, Pages
docs/screenshots/ captures du README
```

Les fichiers générés (`art/*.svg`, `android/app/src/main/res/drawable/art_*.xml`, `web/index.html`) sont commités ;
la CI vérifie qu'ils correspondent aux sources (`make build` ne doit rien changer).

## Graphismes

Le style suit celui du jeu : plein jour, ciel bleu, soleil et gros nuages, sable pêche, lagon turquoise, jungle vert vif,
objets cernés d'un trait noir (hache à fer de métal et canne à pêche des cartes), bois en longs rondins ficelés,
poissons rouges à l'œil en croix, lance en bois, titres blancs cernés, logo de pierre dorée.

Tout est **redessiné** dans `tools/make-art.js` : aucune image du jeu n'est dans le dépôt. Les scans de référence restent
sur la machine de l'auteur, dans `art/originals/`, ignoré par Git.

```bash
npm run build    # ou : node tools/make-art.js && node tools/svg2vd.js && node tools/build-web.js
```

`make-art.js` dessine les SVG dans `art/`, `svg2vd.js` les convertit en `android/app/src/main/res/drawable/art_*.xml`,
`build-web.js` les intègre à la page unique. Ne pas éditer les fichiers générés à la main.

## GitHub : site, APK et versions

Marche à suivre complète (clé de signature, secrets, Pages, première version) : [`../android/PUBLICATION.md`](../android/PUBLICATION.md).

| Workflow | Déclencheur | Ce qu'il fait |
|---|---|---|
| [`ci.yml`](../.github/workflows/ci.yml) | push / PR | tests des règles du site, fichiers générés à jour, image Docker servie et vérifiée |
| [`android.yml`](../.github/workflows/android.yml) | push / PR touchant `android/` ou `art/` ; à la main | tests Kotlin, APK de débogage (artefact), auto-test de la publication ; à la main sur `main` : pré-version `android-dev-<date>` |
| [`android-release.yml`](../.github/workflows/android-release.yml) | étiquette `android-vX.Y.Z` | APK **signé de ta clé**, contrôlé (certificat, version, permissions, non débogable), release GitHub + release roulante `android-latest` |
| [`pages.yml`](../.github/workflows/pages.yml) | push sur `main` touchant `web/`, `art/`, `tools/` | publie le site sur **GitHub Pages** |

Une fois, à la main : créer la clé de signature, commiter son empreinte publique (`android/release-cert.sha256`),
poser les 4 secrets, activer Pages. Ensuite, `git tag android-v0.1.0 && git push origin android-v0.1.0` publie une version.
Les pré-versions `android-dev-…` sont signées d'une clé de débogage **publique** : ne pas les installer à la place d'une vraie version.
Sur le site, un bouton « Installer l'appli Android » apparaît automatiquement quand la page est servie par GitHub Pages.
