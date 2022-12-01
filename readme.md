# stewpot

```
┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
└─┐ │ ├┤ │││├─┘│ │ │
└─┘ ┴ └─┘└┴┘┴  └─┘ ┴

A delicious serving of http/https!
```

⚠ WARNING: This project is young, under development and is not ready for use in
a production environment yet.

## Introduction

Stewpot is a small abstraction on top of Deno's http/https server module,
inspired by the simplicity of
[deno_blog](https://github.com/denoland/deno_blog). There is currently a version
of Stewpot that is compatible with node.js versions that has support for ES
Modules and not versions supporting only CommonJS, with very different APIs. The
reason is that stewpot for a long time, was targeting node.js projects, but has
recently switched to targeting Deno environments. Source code for node.js will
eventually be deprecated when the relevant implementations are ported to the
Deno platform.

## Install (Optional)

Stewpot provides a CLI module for running and initializing projects. Instead of
writing urls everytime you invoke a certain command, you can install it locally.

```bash
$ deno install -Af --name=stewpot ${URL}/packages/deno/cli.js
```

To get started with a new project, you can use stewpot's init command to
initialize the project.

```bash
$ stewpot init path/to/project
```

## Quick Start

Now that the project is initialized, we can run the following command:

```bash
$ deno task dev
```

If you've installed the stewpot cli, [as described above](#install), you can also run the following command:

```bash
$ stewpot serve path/to/dir path/to/main --dev
```
