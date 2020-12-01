# typescript-app-ui

## Development with VSCode devcontainers

Instead of running docker-compose from the command line you can use Visual Studio Code's
[Remove Development extension pack](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)
to automatically bootstrap an development environment with appropriate VSCode extensions and such.

Install the extension (and other requirements - see ["Developing inside a Container"](https://code.visualstudio.com/docs/remote/containers)).

After this, whenever you open Visual Studio Code in this directory, it should suggest reopening the directory in a container.

The first time opening the directory in a container will take a while, as it installs the dependencies. Subsequent times should be much faster.

When the devcontainer is running the UI for the app is served at http://localhost:4004.

To see emulator's and the app's logs run `docker-compose logs -f` on the command line **outside the devcontainer**.

## Development without VSCode devcontainers

Start the development environment with the following command:

```sh
$ docker-compose up --build
```

## Building for production

```sh
$ docker build -t myapp .
```
