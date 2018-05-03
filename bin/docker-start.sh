#!/usr/bin/env bash

set -exo pipefail

docker pull mozorg/bedrock:latest
docker pull mozorg/bedrock_assets:latest
docker pull mozorg/bedrock_test:latest

exec docker-compose up web
