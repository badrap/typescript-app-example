# Define the base image used for the rest of the steps
FROM node:20-alpine AS base
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
RUN mkdir /app && chown node:node app
# Run as uid=1000(node)
USER 1000
WORKDIR /app

# Visual Studio Code workspace tools
FROM base AS workspace
USER root
RUN apk add --no-cache \
  curl \
  git \
  httpie \
  openssh \
  ripgrep
# Run as uid=1000(node)
USER 1000
ENV NODE_ENV=development

# Collect development dependencies
FROM base AS dev
COPY --chown=node:node .npmrc package.json package-lock.json /app/
RUN npm ci --no-audit --no-fund

# Collect production dependencies
FROM dev AS prod
RUN npm ci --production --no-audit --no-fund

# Build the production code
FROM dev AS build
COPY --chown=node:node . /app
RUN npm run build

# Final image, collect the production code & dependencies
FROM base
COPY --from=prod --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/dist /app/dist
ENV NODE_ENV production
CMD ["node", "--enable-source-maps", "dist/index.js"]
