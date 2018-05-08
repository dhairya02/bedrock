#!/bin/sh

set -eo pipefail

source docker/bin/set_git_env_vars.sh

docker-compose "$@"
