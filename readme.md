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

## Install

To get started with a new project, you can use stewpot's bin.js module to
initialize the project.

```bash
$ deno run --allow-write --allow-read $URL/bin.js path/to/project
```

## Quick Start

Now that the project is initialized, we can run the following command:

```bash
$ deno task dev
```
