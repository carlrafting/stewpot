# stewpot

```
┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
└─┐ │ ├┤ │││├─┘│ │ │ 
└─┘ ┴ └─┘└┴┘┴  └─┘ ┴ 

Serving you a delicious stew of http/https!
```

  ⚠ WARNING: This project is young, under development and is not ready for use yet.

## Install

This project is not currently available on npm, but you can install it as a npm package with github, like this:

```
# from master branch
npm i carlrafting/stewpot/master

# a specific version (currently 0.0.0)
npm i carlrafting/stewpot@0.0.0
```

## HTTPS Configuration

In order to run stewpot development server with HTTPS enabled, you'll have to make sure stewpot can bind to port 443.

### Linux & WSL

Linux doesn't allow for processes to bind to that port without root access. One way to get around that is by running this command:

```
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=0
```

Here are some useful resources you can read for more information about privileged ports on Linux:

- [Why can only root listen to ports below 1024?](https://www.staldal.nu/tech/2007/10/31/why-can-only-root-listen-to-ports-below-1024/)
- [Why are ports below 1024 privileged?](https://stackoverflow.com/questions/10182798/why-are-ports-below-1024-privileged)

If you are using WSL on Windows, make sure your project file are located on the Linux file system.

### macOS

To get the development server running on macOS you'll have to run `stewpot start` as `sudo`. Like this:

```
sudo bin/stewpot start
```

## File System Changes on WSL

Node.js doesn't pick up file system changes when you're running WSL and your project files is stored on the mounted Windows drive (`/c/mnt/path/to/project`). This is not recommended when running WSL, and the solution is to store those files on the Linux file system.

You could also install Node.js on the Windows side and run deno there instead. [Here's som information on differences between WSL versions](https://docs.microsoft.com/en-us/windows/wsl/compare-versions#performance-across-os-file-systems) from Microsofts Official Documentation on WSL.
