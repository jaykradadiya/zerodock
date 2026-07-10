.PHONY: dev-web dev-desktop test lint bench-web deploy-web build-desktop

dev-web:
	dx serve --platform web --package zerodock-app

dev-desktop:
	dx serve --platform desktop --package zerodock-app

test:
	cargo test --workspace

lint:
	cargo clippy --workspace -- -D warnings

bench:
	cargo bench -p zerodock-indexer

build-web:
	dx bundle --platform web --package zerodock-app

build-desktop:
	dx bundle --platform desktop --package zerodock-app

deploy-web: build-web
	wrangler deploy
