#!/bin/bash

set -euxo pipefail

python manage.py collectstatic --noinput -v 0
