FROM node:14.16.1-buster-slim AS base
RUN mkdir /app && chown node:node /app
WORKDIR /app
RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/tini", "--"]

FROM base AS workspace
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
USER node
RUN mkdir -p \
  /app/node_modules \
  /app/dist \
  /home/node/.cache/yarn \
  /home/node/.vscode-server/extensions \
  /home/node/.vscode-server-insiders/extensions
COPY --chown=node:node package.json yarn.lock /app/
RUN --mount=type=cache,target=/home/node/.cache/yarn,uid=1000,gid=1000 \
  yarn --frozen-lockfile --no-progress

FROM base AS build
USER node
COPY --chown=node:node package.json yarn.lock /app/
RUN --mount=type=cache,target=/home/node/.cache/yarn,uid=1000,gid=1000 \
  yarn --frozen-lockfile --no-progress
COPY --chown=node:node . /app
RUN yarn build
RUN --mount=type=cache,target=/home/node/.cache/yarn,uid=1000,gid=1000 \
  yarn --production --no-progress --frozen-lockfile

FROM base
USER node
COPY --from=build --chown=node:node /app/dist /app/dist
COPY --from=build --chown=node:node /app/node_modules /app/node_modules
ENV NODE_ENV production
CMD ["node", "--enable-source-maps", "dist/index.js"]
