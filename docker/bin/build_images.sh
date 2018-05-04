#!/bin/bash

set -exo pipefail

source docker/bin/set_git_env_vars.sh

# get legal-docs
git submodule sync
git submodule update --init --recursive

touch .env

# pull latest images
docker-compose pull app web release
# build fresh based on local changes
docker-compose build app web release

# more tags
docker tag mozorg/bedrock:latest "mozorg/bedrock:${BRANCH_NAME_SAFE}-${GIT_COMMIT}"
docker tag mozorg/bedrock_test:latest "mozorg/bedrock_test:${GIT_COMMIT}"
docker tag mozorg/bedrock_assets:latest "mozorg/bedrock_assets:${GIT_COMMIT}"
