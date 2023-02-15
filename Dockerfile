FROM debian:sid-slim

LABEL name=jobman
MAINTAINER "Andy S Alic (asalic)"
COPY src /opt/jobman/src
COPY bin /opt/jobman/bin
COPY jest.config.* package-lock.json package.json tsconfig.json /opt/jobman/

RUN apt-get -y update \
    && apt-get -y install curl bash \
    && curl -fsSL https://deb.nodesource.com/setup_19.x | bash - \
    && apt-get install -y nodejs \
    && cd /opt/jobman/ \
    && ls -al \
    && npm install \
    && npx tsc \
    && ln -s /opt/jobman/bin/jobman /usr/bin/

ENTRYPOINT echo "Default infinite loading command for jobman" \
    && jobman \
    && tail -f /dev/null