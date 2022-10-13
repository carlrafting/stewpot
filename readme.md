# stewpot

```
┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
└─┐ │ ├┤ │││├─┘│ │ │
└─┘ ┴ └─┘└┴┘┴  └─┘ ┴

A delicious serving of http/https!
```

⚠ WARNING: This project is young, under development and is not ready for use in a production environment yet.

## Introduction

Stewpot is a small abstraction on top of node.js http/https server module, similar to Koa, express or Polka. Stewpot is taking advantage of ES Modules. That means it's only compatible with node.js versions that has support for ES Modules and not versions supporting only CommonJS.

## Install

This project is not currently available on npm, but you can install it as a npm package from Github, like this:

```bash
# from main branch
npm i carlrafting/stewpot

# a specific version (currently 0.1.0)
npm i carlrafting/stewpot@0.1.0
```

## Quick Start

Get up and running with stewpot by following these steps.

```js
// app.mjs

import stewpot from 'stewpot/app';

const app = stewpot();
app.run();
```

```json
{
    "//": "package.json",
    "scripts": {
        "start": "node app.mjs"
    },
    "dependencies": {
        "stewpot": "github:carlrafting/stewpot"
    }
}
```

```bash
# npm

npm start

# => Started web server at localhost:8080
```

## HTTPS Configuration

In order to run stewpot development server with HTTPS enabled, you'll have to make sure stewpot can bind to port 443.

### Linux & WSL

Linux doesn't allow for processes to bind to that port without root access. One way to get around that is by running this command:

```bash
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
```

Here are some useful resources you can read for more information about privileged ports on Linux:

-   [Why can only root listen to ports below 1024?](https://www.staldal.nu/tech/2007/10/31/why-can-only-root-listen-to-ports-below-1024/)
-   [Why are ports below 1024 privileged?](https://stackoverflow.com/questions/10182798/why-are-ports-below-1024-privileged)

If you are using WSL on Windows, make sure your project file are located on the Linux file system.

### macOS

It's possible to bind stewpot to port 80 whith root privileges. It is not generally recommended to run web processes with root access, so you might want to set the port to something other than 80. However, if you want to bind to port 80, there are some workarounds (without root).

-   [How can I open port 80 so a non-root process can bind to it?](https://apple.stackexchange.com/a/46804)
-   [How to bind 80 non-root](https://stackoverflow.com/a/35259958)

## File System Changes on WSL

Node.js doesn't pick up file system changes when you're running WSL and your project files is stored on the mounted Windows drive (`/c/mnt/path/to/project`). This is not recommended when running WSL, and the solution is to store those files on the Linux file system.

You could also install Node.js on the Windows side and run Node.js there instead. [Here's som information on differences between WSL versions](https://docs.microsoft.com/en-us/windows/wsl/compare-versions#performance-across-os-file-systems) from Microsofts Official Documentation on WSL.
