#!/bin/sh

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

# pull latest images
docker-compose pull app web
# build fresh based on local changes
docker-compose build app web
