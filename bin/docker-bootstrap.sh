#!/usr/bin/env bash

set -exo pipefail

source docker/bin/set_git_env_vars.sh

# get legal-docs
git submodule sync
git submodule update --init --recursive

# clean up
find . -name '*.egg-info' -exec rm -rf {} +
find . -name '*.egg' -exec rm -f {} +
find . -name '*.pyc' -exec rm -f {} +
find . -name '*.pyo' -exec rm -f {} +
find . -name '__pycache__' -exec rm -rf {} +
rm -rf static_build

# pull prod docker images
docker pull mozorg/bedrock:latest
docker pull mozorg/bedrock_assets:latest
docker pull mozorg/bedrock_test:latest

# build fresh based on local changes
docker-compose build app
docker-compose build web
