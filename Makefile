DOCKERCOMPOSE = "bin/docker-compose.sh"

default: help
	@echo ""
	@echo "You need to specify a subcommand."
	@exit 1

help:
	@echo "build         - build docker images for dev"
	@echo "run           - docker-compose up the entire system for dev"
	@echo ""
	@echo "clean         - remove all build, test, coverage and Python artifacts"
	@echo "rebuild       - force a rebuild of all of the docker images"
	@echo "lint          - check style with flake8"
	@echo "test          - run tests against local files"
	@echo "test-image    - run tests against files in docker image"
	@echo "test-smoketest- run smoke tests against SERVER_URL"
	@echo "docs          - generate Sphinx HTML documentation, including API docs"

.env:
	@if [ ! -f .env ]; then \
		echo "Copying .env-dist to .env..."; \
		cp .env-dist .env; \
	fi

.docker-build:
	${MAKE} build

build: .env
	docker/bin/build_images.sh
	touch .docker-build

rebuild: clean .docker-build

run: .docker-build
	${DOCKERCOMPOSE} up assets app

shell: .docker-build
	${DOCKERCOMPOSE} run app python manage.py shell_plus

clean:
	# python related things
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '__pycache__' -exec rm -rf {} +
	# test related things
	-rm -f .coverage
	# docs files
	-rm -rf docs/_build/
	# static files
	-rm -rf static_build/
	# state files
	-rm -f .docker-build

lint: .docker-build
	${DOCKERCOMPOSE} run test flake8 bedrock lib tests
	${DOCKERCOMPOSE} run assets gulp js:lint css:lint

test: .docker-build
	${DOCKERCOMPOSE} run test

test-image: .docker-build
	${DOCKERCOMPOSE} run test-image

docs: .docker-build
	${DOCKERCOMPOSE} run app $(MAKE) -C docs/ clean
	${DOCKERCOMPOSE} run app $(MAKE) -C docs/ html

.PHONY: default clean build docs lint run shell test test-image test-smoketest restore-db rebuild
