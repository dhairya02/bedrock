########
# assets builder and dev server
#
FROM node:6-slim AS assets

ENV PATH=/app/node_modules/.bin:$PATH
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --pure-lockfile && rm -rf /usr/local/share/.cache/yarn
RUN npm install gulp-cli -g
COPY gulpfile.js static-bundles.json ./
COPY ./media ./media
RUN gulp build --production

########
# django app container
#
FROM python:2-stretch AS webapp

# Extra python env
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# add non-priviledged user
RUN adduser --uid 1000 --disabled-password --gecos '' --no-create-home webdev

# Add apt script
COPY docker/bin/apt-install /usr/local/bin/

WORKDIR /app
EXPOSE 8000
CMD ["./bin/run.sh"]

RUN apt-install gettext build-essential libxml2-dev libxslt1-dev libxslt1.1 git

COPY requirements/base.txt \
     requirements/compiled.txt \
     requirements/docker.txt \
     requirements/prod.txt ./requirements/

# Install Python deps
RUN pip install --no-cache-dir -r requirements/prod.txt
RUN pip install --no-cache-dir -r requirements/docker.txt

# changes infrequently
COPY ./bin ./bin
COPY ./etc ./etc
COPY ./lib ./lib
COPY ./root_files ./root_files
COPY ./scripts ./scripts
COPY ./wsgi ./wsgi
COPY manage.py LICENSE newrelic.ini contribute.json ./

# changes more frequently
COPY ./docker ./docker
COPY ./vendor-local ./vendor-local
COPY ./bedrock ./bedrock
COPY ./media ./media
COPY --from=assets /app/static_build /app/static_build
RUN honcho run --env docker/envfiles/prod.env docker/bin/build_staticfiles.sh

# build args
ARG GIT_SHA=latest
ARG BRANCH_NAME=master
ENV GIT_SHA=${GIT_SHA}
ENV BRANCH_NAME=${BRANCH_NAME}

# rely on build args
RUN bin/run-sync-all.sh

RUN echo "${GIT_SHA}" > ./static/revision.txt

# Change User
RUN chown webdev.webdev -R .
USER webdev

########
# expanded webapp image for testing and dev
#
FROM webapp AS devapp

CMD ["./bin/run-tests.sh"]
USER root

COPY requirements/dev.txt \
     requirements/test.txt ./requirements/
RUN pip install --no-cache-dir -r requirements/test.txt
COPY ./setup.cfg ./
COPY ./tests ./tests

RUN chown webdev.webdev -R .
USER webdev
