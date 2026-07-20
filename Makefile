.PHONY: install verify test lint api mobile docker-up docker-down

install:
	npm install

verify:
	npm run verify

test:
	npm test

lint:
	npm run lint

api:
	npm run start:api

mobile:
	npm run start:mobile

docker-up:
	docker compose up --build

docker-down:
	docker compose down
