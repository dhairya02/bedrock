#!/bin/sh

set -exo pipefail

source docker/bin/set_git_env_vars.sh

docker-compose up app assets
