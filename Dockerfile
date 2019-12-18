FROM        node:12.13-alpine as builder

WORKDIR     /usr/src/app

RUN         apk --no-cache add --virtual .build-deps \
                build-base

COPY        package.json .
COPY        yarn.lock .
RUN         yarn install

###

FROM        node:12.13-alpine

ENV         PATH=/usr/src/app/node_modules/.bin:$PATH

WORKDIR     /usr/src/app
CMD         ["micro", "-l", "tcp://0.0.0.0:3000"]

COPY        --from=builder /usr/src/app/ .
COPY        index.js .
