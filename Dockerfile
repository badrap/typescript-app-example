# Define the base image used for the rest of the steps
FROM node:24.14.0-alpine AS base
# Install Corepack to manage the package manager version. The --force
# flag is required to allow overriding pre-existing npm and yarn binaries.
RUN npm install --global --force corepack
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
RUN mkdir /app && chown node:node app
# Run as uid=1000(node) - The user needs to be numeric so that Kubernetes
# can verify user is non-root when securityContext.runAsNonRoot is true.
USER 1000
WORKDIR /app
# Ensure that the correct version of pnpm is installed
COPY --chown=node:node package.json .
RUN corepack install \
  && rm package.json

# Visual Studio Code workspace tools & dependencies
FROM base AS workspace
USER root
RUN apk add --no-cache \
  bash \
  curl \
  git \
  httpie \
  openssh \
  procps-ng \
  ripgrep \
  tmux
RUN mkdir -p /workspace \
  && chown -R node:node /workspace
# Run as uid=1000(node)
USER 1000
ENV NODE_ENV=development
# Create directories before volumes are mounted to them, so that the
# ownership will be correct.
RUN mkdir ~/.vscode-server
# Allow npm install packages with --global without sudo.
RUN mkdir ~/.npm-global \
  && npm config set -L user prefix ~/.npm-global
# Add typical tool binary locations (e.g. coding agents) to PATH.
ENV PATH="$PATH:/home/node/.local/bin:/home/node/.npm-global/bin"

FROM base AS dev-deps
COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

FROM dev-deps AS prod-deps
RUN pnpm i --prod --frozen-lockfile

FROM dev-deps AS build
COPY --chown=node:node . .
RUN pnpm build

# Final image, collect the production code & dependencies
FROM base
COPY --chown=node:node package.json pnpm-workspace.yaml ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "--run", "start"]
