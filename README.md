# Galèrapagos — compagnon bois & poisson

Appli perso pour le jeu de société **Galèrapagos** (Gigamic). Elle remplace la pioche de billes dans le sac :
le joueur choisit son risque, l'appli tire au hasard et montre le résultat dans le décor (jungle / mer).
Aucune bille n'est affichée.

- `web/index.html` : site **single page**, pensé uniquement pour smartphone (portrait). Un seul fichier, sans dépendance.
- `android/` : appli **Kotlin / Jetpack Compose** (portrait, Android 8+).
- `art/` : illustrations SVG originales, **source unique** du style graphique pour le web et pour Android.
- `tools/` : scripts Node (aucune dépendance) qui génèrent les SVG, les VectorDrawable Android et la page web.

## Graphismes

Le style suit celui du jeu (relevé sur les scans de la boîte, du plateau et des cartes) : plein jour, ciel bleu-violet et gros nuages, sable pêche, lagon turquoise, jungle vert vif, objets cernés d'un trait noir (hache et canne à pêche des cartes), bois en rondins ficelés, poisson bleu à l'œil en croix, titres blancs cernés. Tout est **redessiné** dans `tools/make-art.js` : aucune image du jeu n'est dans le dépôt. Les scans servent de référence et restent dans `art/originals/`, ignoré par Git.

## Règles implémentées

**Bois (jungle)**
- 1 planche **gratuite** (2 avec la **hache**) : toujours gardée.
- Le joueur peut tenter de 1 à 5 planches de plus : tirage simultané de ce nombre d'éléments dans un sac de 6 dont 1 serpent.
- Serpent tiré → mordu : on perd seulement les planches **du risque** ; les planches gratuites sont **toujours gardées**. Risque = `n / 6` (17 % pour 1, 83 % pour 5).
- 0 planche de plus = aucun risque.

**Poisson (mer)**
- 1 tirage dans un sac de 6 : 3× « 1 poisson », 2× « 2 poissons », 1× « 3 poissons ».
- Sans canne : on pêche à la **lance en bois** (une prise). Avec la **canne à pêche** (la ligne et son flotteur) : 2 tirages d'un coup (sans remise), **le total est la somme** → 2 à 5 poissons.
  Choix d'interprétation : si la canne doit garder seulement la meilleure prise, changer `fishing()` (web) et `GameRules.fish()` (Android).

Le hasard vient de `crypto.getRandomValues` (web) et `kotlin.random.Random` (Android).

## Docker (tout tourne dans des conteneurs)

```bash
make start         # construit et lance le site : http://localhost:8080  (WEB_PORT pour changer le port)
make test          # tests des règles de tirage du site (Node, dans un conteneur)
make android       # construit l'APK de débogage : dist/galerapagos-debug.apk, puis servi sur /galerapagos.apk
make android-test  # tests unitaires Kotlin (JDK 17 + SDK Android dans un conteneur)
make android-release-selftest  # prouve la chaîne de publication signée avec une clé jetable (android/PUBLICATION.md)
make check         # tous les tests
make build         # régénère les SVG, les drawables Android et web/index.html depuis les sources
make help          # toutes les commandes
```

- `web` : Caddy sert la page unique (CSP stricte, aucune ressource externe). L'APK construit y est téléchargeable depuis le téléphone.
- `android` / `android-test` : image JDK 17 + SDK Android (les licences du SDK sont acceptées à la construction de l'image, comme dans toute image de CI Android). Le premier lancement télécharge le SDK et Gradle (plusieurs minutes) ; le cache et la clé de débogage vivent dans le volume `android-gradle`, donc l'APK se met à jour par-dessus l'ancien.
- Sur le téléphone (même Wi-Fi) : `http://<ip-de-la-machine>:8080`.

## Web (sans Docker)

```bash
node tools/build-web.js   # régénère web/index.html depuis web/index.template.html + art/*.svg
```
Ouvrir `web/index.html` sur le téléphone (ou le servir en HTTPS). Sur ordinateur, la page s'affiche dans un cadre de téléphone.
Le bouton retour Android et les choix (hache, canne, risque) sont gérés / mémorisés.

## Android (sans Docker)

Ouvrir le dossier `android/` dans **Android Studio** (JDK 17), laisser Gradle synchroniser, lancer sur un appareil.
En ligne de commande : `cd android && ./gradlew assembleDebug` (SDK Android requis, `local.properties` créé par Android Studio).
Tests unitaires des règles : `./gradlew test`.

## GitHub : site, APK et versions

Même chaîne que `repas-front`, à la taille de ce projet (détails et marche à suivre : [`android/PUBLICATION.md`](android/PUBLICATION.md)).

| Workflow | Déclencheur | Ce qu'il fait |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | push / PR | tests des règles du site, fichiers générés à jour (`make build` ne doit rien changer), image Docker servie et vérifiée |
| [`android.yml`](.github/workflows/android.yml) | push / PR touchant `android/` ou `art/` ; à la main | tests Kotlin, APK de débogage (artefact), auto-test de la publication ; à la main sur `main` : pré-version `android-dev-<date>` |
| [`android-release.yml`](.github/workflows/android-release.yml) | étiquette `android-vX.Y.Z` | APK **signé de ta clé**, contrôlé (certificat, version, permissions, non débogable), release GitHub + release roulante `android-latest` |
| [`pages.yml`](.github/workflows/pages.yml) | push sur `main` touchant `web/`, `art/`, `tools/` | publie le site sur **GitHub Pages** (`https://<compte>.github.io/<dépôt>/`) |

Le site affiche un lien « Installer l'appli Android » (APK de `android-latest`) quand il est servi par GitHub Pages ; l'adresse du dépôt se déduit de celle de la page.

Une fois, à la main : créer la clé de signature, commiter son empreinte publique (`android/release-cert.sha256`), poser les 4 secrets, activer Pages. Puis `git tag android-v0.1.0 && git push origin android-v0.1.0` publie.

## Régénérer les illustrations

```bash
npm run build    # ou : node tools/make-art.js && node tools/svg2vd.js && node tools/build-web.js
```
`make-art.js` dessine les SVG dans `art/`, `svg2vd.js` les convertit en `android/app/src/main/res/drawable/art_*.xml`.
Ne pas éditer les fichiers générés à la main. Les visuels originaux du jeu, s'il y en a, vont dans `art/originals/` (ignoré par git).
