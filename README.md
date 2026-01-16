# typescript-app-example

A starter template for building badrap.io apps with TypeScript. Use this as a foundation for creating your own apps that can be embedded into badrap.io playbooks. It's built on a mildly opinionated tech stack:

- **TypeScript** - Strict mode, .tsx support for app UI
- **Hono** - Web framework
- **pnpm** - Package manager
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Docker** - Containerized builds
- **Devcontainers** - Consistent development environment

To provide some example functionality this app lets users to add DNS names and then periodically resolves them to IP address assets.

## Development

### Getting started

Open the repository directory in VSCode with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) (or another editor with devcontainer support) and launch the devcontainer.

Open a terminal inside the running devcontainer it and start the app dev server:

```sh
pnpm dev
```

Access the app's UI through the badrap.io emulator at http://localhost:4004. To access the app server without the emulator in between, use http://localhost:4005.

The dev server restarts automatically on code changes, so you can just keep it running at all the times during active development.

### Environment variables

The app is configured through environment variables in both development and production.

During development the dev server automatically loads environment variables from two special files and restarts whenever they change:

- **dev.env** - Base development variables, committed to Git.
- **dev.local.env** - Local overrides, ignored by Git. Has precedence.

Use `dev.local.env` for temporary overrides to avoid accidentally committing sensitive values to the repository.

### Supplementary commands

Useful commands to run inside the devcontainer:

- `pnpm typecheck` - Type-check the codebase
- `pnpm lint` - Lint with Prettier + ESLint
- `pnpm fix` - Auto-fix lint and formatting issues

## App structure

The app has two main components: an HTTP server that handles UI requests, and a background worker that periodically polls and updates installations. Both are started in `index.ts` and import shared logic from `actions.ts`.

```
src/
  index.ts     # The entry point, server setup
  router.tsx   # UI endpoint handlers (POST /app/ui)
  worker.ts    # A background worker running installation updates
  actions.ts   # Shared logic (UI actions, installation updates & cleanups)
```

## Building for production

The deployable end result of this project is a Docker container image. Build it outside the devcontainer from the Dockerfile at the repository root:

```sh
docker build -t app .
```

The Dockerfile also contains a non-production target called "workspace" used as a base for the devcontainer. It's defined in the same Dockerfile to keep the bases for both production and development container images as similar as possible.

## License

This project is licensed under the MIT license. See [LICENSE](./LICENSE).
