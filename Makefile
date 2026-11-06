.DEFAULT_GOAL := help
DOCKER_COMPOSE ?= docker compose
WEB_PORT ?= 8080
# Les conteneurs qui écrivent dans le dépôt (build, android) tournent avec ton identifiant, pas root.
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g)

## —— Site 🌴 ————————————————————————————————————————————————————————————————
.PHONY: start stop restart logs status build test

start: ## Build and start the site on http://localhost:8080 (APK on /galerapagos.apk after `make android`)
	@mkdir -p dist
	@$(DOCKER_COMPOSE) up -d --build --wait web
	@echo "🌴 Site : http://localhost:$(WEB_PORT)"
	@test -f dist/galerapagos-debug.apk && echo "📱 APK  : http://localhost:$(WEB_PORT)/galerapagos.apk" || echo "📱 APK  : 'make android' pour le construire"

stop: ## Stop everything
	@$(DOCKER_COMPOSE) --profile test --profile build --profile android down --remove-orphans

restart: ## Rebuild and restart the site
	@$(MAKE) stop
	@$(MAKE) start

logs: ## Follow the site logs
	@$(DOCKER_COMPOSE) logs -f web

status: ## Show the containers and check the site answers
	@$(DOCKER_COMPOSE) ps
	@printf "Santé (/healthz) : "
	@curl -s --max-time 5 http://localhost:$(WEB_PORT)/healthz || echo "injoignable (make start ?)"
	@echo

build: ## Regenerate art/*.svg, the Android drawables and web/index.html from the sources
	@mkdir -p dist
	@$(DOCKER_COMPOSE) --profile build run --rm build

test: ## Run the unit tests of the site's draw rules
	@$(DOCKER_COMPOSE) --profile test run --rm test

## —— Android 🤖 —————————————————————————————————————————————————————————————
.PHONY: android android-test check

android: ## Build the debug APK: dist/galerapagos-debug.apk (first run downloads the SDK and Gradle: several minutes)
	@mkdir -p dist
	@$(DOCKER_COMPOSE) --profile android run --rm android

android-test: ## Run the Kotlin unit tests of the draw rules
	@$(DOCKER_COMPOSE) --profile android run --rm android-test

check: test android-test ## Run all the tests

## —— Aide ———————————————————————————————————————————————————————————————————
.PHONY: help
help: ## Outputs this help screen
	@grep -E '(^[a-zA-Z0-9_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}{printf "\033[32m%-20s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'
