# Publier Galèrapagos : le site sur GitHub Pages, l'appli Android dans une release

Procédure **pour toi**, une étape à la fois. Les étapes 1 à 4 ne servent **qu'une fois** ; ensuite, publier une version, c'est l'étape 5.

## Ce que GitHub fournit

| Quoi | Où | Comment |
|---|---|---|
| Le **site** (page unique) | GitHub **Pages** : `https://<compte>.github.io/<dépôt>/` | [`pages.yml`](../.github/workflows/pages.yml), à chaque push sur `main` qui touche `web/`, `art/` ou `tools/` |
| L'**appli Android** signée | GitHub **Releases** : `https://github.com/<compte>/<dépôt>/releases` | [`android-release.yml`](../.github/workflows/android-release.yml), quand tu pousses une étiquette `android-vX.Y.Z` |
| Une adresse **fixe** vers la dernière version | release « `android-latest` » : `…/releases/download/android-latest/galerapagos.apk` | mise à jour par le même workflow ; c'est le lien « Installer l'appli Android » du site |
| Des versions d'**essai** (débogage) | pré-versions `android-dev-<date>` | [`android.yml`](../.github/workflows/android.yml), lancé à la main |

> **Dépôt public ou privé ?** Pages et le téléchargement de l'APK depuis le téléphone sont gratuits et sans connexion sur un dépôt **public**. Sur un dépôt privé, Pages demande un abonnement payant et l'APK ne se télécharge qu'une fois connecté à GitHub. Les illustrations du dépôt (`art/`) sont originales ; les visuels du jeu éventuels vont dans `art/originals/`, ignoré par Git : ne les publie jamais.

## Ce qu'il faut savoir avant de commencer

- La version de production est un **fichier `.apk` signé avec ta clé**, installé à la main, sans Google Play. Les mises à jour se font en installant le nouveau fichier **par-dessus**.
- **Ta clé de signature est la chose la plus importante** : si tu la perds, plus aucune version ne peut s'installer par-dessus l'ancienne (il faudrait désinstaller puis réinstaller). Fais **deux copies** (étape 1).
- **Jamais de clé ni de mot de passe dans un commit** (`*.p12`, `*.jks` et `*.keystore` sont ignorés par Git, sauf la clé de débogage publique `android/debug.keystore`).
- Les pré-versions `android-dev-…` sont signées d'une **clé de débogage publique** : ne les installe pas à la place d'une version `android-vX.Y.Z`.
- Seule l'étiquette `android-vX.Y.Z` déclenche la publication ; le workflow refuse de publier sans clé, hors de `main`, ou avec un numéro plus ancien que le dernier publié.

## Étape 1. Créer la clé de signature (une fois)

Aucun JDK à installer : on utilise celui de Docker. Crée un dossier **hors du dépôt** :

```bash
mkdir -p ~/galerapagos-cle && chmod 700 ~/galerapagos-cle
docker run --rm -it --user "$(id -u):$(id -g)" -v "$HOME/galerapagos-cle:/cle" eclipse-temurin:17-jdk-jammy \
  keytool -genkeypair -keystore /cle/galerapagos-publication.p12 -storetype PKCS12 \
  -alias galerapagos -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Galerapagos"
chmod 600 ~/galerapagos-cle/galerapagos-publication.p12
```

- Choisis un **mot de passe** long (deux fois) et enregistre-le **tout de suite** dans ton gestionnaire : sans lui, le fichier est inutilisable. Le mot de passe de la clé est le même que celui du fichier.
- Ne mets ni ton nom ni ton e-mail dans `-dname` : ce texte est public (il est dans l'application).
- **Sauvegarde** `galerapagos-publication.p12` à deux endroits qui ne sont pas ce PC.

## Étape 2. Noter l'empreinte publique du certificat (une fois)

L'empreinte n'a rien de secret : le workflow **refuse de publier** si l'APK n'est pas signé par la clé qui y correspond.

```bash
docker run --rm -it -v "$HOME/galerapagos-cle:/cle:ro" eclipse-temurin:17-jdk-jammy \
  keytool -list -v -keystore /cle/galerapagos-publication.p12 -alias galerapagos | awk '/SHA256:/ {print $2; exit}' \
  > android/release-cert.sha256
cat android/release-cert.sha256   # AA:BB:CC:... (32 groupes de deux caractères)
```

Commite `android/release-cert.sha256` dans `main` (une empreinte par ligne ; plusieurs lignes permettent de changer de clé plus tard).

## Étape 3. Poser les quatre secrets dans GitHub (une fois)

GitHub chiffre les secrets : une fois posés, personne ne peut les relire, seul le workflow les utilise. Avec `gh` connecté (`gh auth status`) :

```bash
base64 -w0 ~/galerapagos-cle/galerapagos-publication.p12 | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD            # le mot de passe de l'étape 1
gh secret set ANDROID_KEY_ALIAS --body galerapagos
gh secret set ANDROID_KEY_PASSWORD                 # le même mot de passe
gh secret list                                     # les quatre noms, jamais les valeurs
```

Sans le terminal : `Settings > Secrets and variables > Actions > New repository secret`, un secret à la fois.

Facultatif : `Settings > Environments > android-release` (créé au premier passage du workflow) permet d'exiger une approbation avant chaque publication.

## Étape 4. Activer GitHub Pages (une fois)

`Settings > Pages > Build and deployment > Source : GitHub Actions` — ou, en terminal :

```bash
gh api -X POST "repos/{owner}/{repo}/pages" -f build_type=workflow
```

Puis un push sur `main` (ou `gh workflow run pages.yml --ref main`) publie le site. L'adresse apparaît dans le résumé du workflow et dans `Settings > Pages`.

## Étape 5. Publier une version (à chaque version)

Le numéro vient de l'étiquette : `android-v1.2.3` donne `versionName 1.2.3` et le code de version `1002003`. Il ne doit jamais baisser.

```bash
git switch main && git pull
git tag android-v0.1.0
git push origin android-v0.1.0
```

Le workflow construit, teste, signe, **contrôle** (certificat attendu, version, permissions, APK non débogable), puis publie la release `android-v0.1.0` et met à jour `android-latest`. Suis-le avec `gh run watch`.

**Vérifier** : la release `android-v0.1.0` contient `galerapagos-0.1.0.apk`, `galerapagos.apk`, leurs `.sha256` et `version.json` ; elle n'est ni brouillon ni pré-version. `sha256sum -c galerapagos-0.1.0.apk.sha256` doit répondre `OK`.

## Étape 6. Installer, puis mettre à jour

1. Sur le téléphone, ouvre le site (`https://<compte>.github.io/<dépôt>/`) et touche **Installer l'appli Android**, ou va directement sur la page des releases.
2. Ouvre le fichier téléchargé, autorise l'installation depuis Chrome si Android le demande, touche **Installer** (si Play Protect hésite : **Installer quand même**).
3. **Mettre à jour** : même geste avec la version suivante, par-dessus. Les choix (hache, canne, risque) sont conservés.

## Versions d'essai (débogage)

Pour essayer une version avant de la publier : `gh workflow run android.yml --ref main` (éventuellement `-f tag=android-dev-2026-11-06b`). Elle publie une **pré-version** `android-dev-<date>` avec `galerapagos-debug.apk`. Ne l'installe pas sur le téléphone que tu utilises pour jouer vraiment : elle est signée d'une clé publique.

## Essayer la chaîne en local, sans GitHub

```bash
make android-release-selftest   # refus sans clé, réussite avec une clé jetable créée à l'instant, refus du contrôle : rien n'est conservé
```

Une vraie construction locale : `ANDROID_KEYSTORE_BASE64=… ANDROID_KEYSTORE_PASSWORD=… ANDROID_KEY_ALIAS=… ANDROID_KEY_PASSWORD=… ANDROID_VERSION_TAG=android-v0.1.0 make android-release`, puis `ANDROID_VERSION_TAG=android-v0.1.0 ANDROID_EXPECTED_CERT_SHA256="$(paste -sd, android/release-cert.sha256)" make android-release-verify`.

## Si ça ne marche pas

- **« Pas de clé de signature »** : un des quatre secrets manque (`gh secret list`). Rien n'a été construit.
- **« release-cert.sha256 manque »** ou **« mal formé »** : étape 2.
- **« une étiquette plus récente existe déjà »** : un numéro ne se republie pas ; choisis-en un plus grand.
- **« le commit de l'étiquette n'est pas dans main »** : fusionne dans `main` avant d'étiqueter.
- **« certificat inattendu »** : l'APK n'est pas signé de la clé de `release-cert.sha256` ; vérifie le secret `ANDROID_KEYSTORE_BASE64`.
- **L'installation est refusée** : désinstalle d'abord une éventuelle version d'essai (`android-dev-…`), signée d'une autre clé, puis recommence.
- **Le site n'a pas bougé** : `Settings > Pages` doit être sur « GitHub Actions » (étape 4) ; le workflow `Pages` ne se lance que si `web/`, `art/` ou `tools/` changent.
