#!/bin/bash
# Needs DOCKER_USERNAME, DOCKER_PASSWORD, DOCKER_REPOSITORY,
# FROM_DOCKER_REPOSITORY environment variables.
#
# To set them go to Job -> Configure -> Build Environment -> Inject
# passwords and Inject env variables
#
set -exo pipefail

BIN_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source $BIN_DIR/set_git_env_vars.sh

docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD

if [[ "$FROM_DOCKER_REPOSITORY" == "mozorg/bedrock" ]]; then
    DOCKER_TAG="${BRANCH_NAME_SAFE}-${GIT_COMMIT}"
else
    DOCKER_TAG="${GIT_COMMIT}"
fi

# Push to docker hub
docker push $FROM_DOCKER_REPOSITORY:${DOCKER_TAG}

if [[ "$GIT_TAG_DATE_BASED" == true ]]; then
    docker tag $FROM_DOCKER_REPOSITORY:${DOCKER_TAG} $FROM_DOCKER_REPOSITORY:$GIT_TAG
    docker push $DOCKER_REPOSITORY:$GIT_TAG
    docker push $DOCKER_REPOSITORY:latest
fi
