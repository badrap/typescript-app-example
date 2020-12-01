FROM node:14.15.1-alpine AS base
RUN mkdir /app && chown node:node /app
WORKDIR /app

FROM base AS dev
RUN apk add --no-cache git openssh
USER node
RUN mkdir -p \
  /app/node_modules \
  /app/dist \
  /home/node/.cache/yarn \
  /home/node/.vscode-server/extensions \
  /home/node/.vscode-server-insiders/extensions

FROM base AS builder
USER node
COPY --chown=node:node package.json yarn.lock /app/
RUN yarn --no-progress --frozen-lockfile
COPY --chown=node:node . /app
RUN yarn build \
  && yarn --production --no-progress --frozen-lockfile

FROM base
USER root
RUN apk add --no-cache tini
USER node
COPY --from=builder --chown=node:node /app/dist /app/dist
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
ENV NODE_ENV production
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/index.js"]
