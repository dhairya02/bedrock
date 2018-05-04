#!/bin/sh
#
# Runs unit_tests
#
set -ex

source docker/bin/set_git_env_vars.sh

exec docker-compose run test-image
