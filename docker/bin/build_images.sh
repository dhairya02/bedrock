#!/bin/bash

set -exo pipefail

BIN_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $BIN_DIR/set_git_env_vars.sh

BUILD_IMAGE_TAG="mozorg/bedrock_build:${GIT_COMMIT}"
CODE_IMAGE_TAG="mozorg/bedrock_code:${GIT_COMMIT}"
DOCKER_REBUILD=false
DOCKER_CP_ITERATION=1

# test mode will build the unit testing image containing the testing requirements
TEST_MODE=false

# parse cli args
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -r|--rebuild)
            DOCKER_REBUILD=true
            ;;
        -t|--test)
            TEST_MODE=true
            ;;
    esac
    shift # past argument or value
done

function imageExists() {
    if $DOCKER_REBUILD; then
        return 1
    fi
    if [[ "$1" == "l10n" ]]; then
        DOCKER_TAG="${BRANCH_NAME/\//-}-${GIT_COMMIT}"
    else
        DOCKER_TAG="${GIT_COMMIT}"
    fi
    docker history -q "mozorg/bedrock_${1}:${DOCKER_TAG}" > /dev/null 2>&1
    return $?
}

function docker_cp() {
    image_tag="mozorg/bedrock_${1}:${GIT_COMMIT}"
    container_name="bedrock_${1}_${GIT_COMMIT}_${DOCKER_CP_ITERATION}"
    DOCKER_CP_ITERATION=$(( DOCKER_CP_ITERATION + 1 ))
    cp_src="$2"
    cp_dst="$3"
    docker create --name "$container_name" "$image_tag"
    docker cp "${container_name}:${cp_src}" "${cp_dst}"
    # don't do this part if it's running on CircleCI
    if [[ -z "$CIRCLE_SHA1" ]]; then
        docker rm "${container_name}"
    fi
}

# pull latest images to build cache
# but don't fail build if it fails
docker pull mozorg/bedrock:latest || true
docker pull mozorg/bedrock_assets:latest || true

if ! imageExists "assets"; then
    docker/bin/docker_build.sh --pull "assets"
fi

if ! imageExists "app"; then
    docker_cp assets /app/static_build/. ./static_build
    docker/bin/docker_build.sh --pull "app"
fi

# build a tester image for non-demo deploys
if $TEST_MODE && ! imageExists "test"; then
    docker/bin/docker_build.sh "test"
fi
