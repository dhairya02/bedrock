#!/bin/bash

set -euxo pipefail

python manage.py collectstatic -l --noinput -v 0
