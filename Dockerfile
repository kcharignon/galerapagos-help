# syntax=docker/dockerfile:1
# Compagnon Galérapagos : génération de la page (`tools`), tests (`test`), image de production (`prod`).
# Aucune dépendance npm : seuls les scripts de tools/ sont nécessaires.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS tools
WORKDIR /app
COPY package.json ./
COPY tools ./tools
COPY art ./art
COPY web ./web
RUN node tools/build-web.js

# Tests des règles de tirage du site : `make test`.
FROM tools AS test
COPY tests ./tests
CMD ["node", "--test", "tests/web-logic.test.js"]

# Production : la page unique (+ l'APK de débogage s'il a été construit) servie par Caddy.
FROM caddy:2-alpine AS prod
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=tools /app/web/index.html /srv/index.html
EXPOSE 80
