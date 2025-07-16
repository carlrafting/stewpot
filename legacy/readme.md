```
┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
└─┐ │ ├┤ │││├─┘│ │ │
└─┘ ┴ └─┘└┴┘┴  └─┘ ┴

A delicious serving of http/https!
```

[![Deno Tests](https://github.com/carlrafting/stewpot/actions/workflows/test.yml/badge.svg)](https://github.com/carlrafting/stewpot/actions/workflows/test.yml)
[![Deno Deploy](https://github.com/carlrafting/stewpot/actions/workflows/deploy.yml/badge.svg)](https://github.com/carlrafting/stewpot/actions/workflows/deploy.yml)

⚠ WARNING: This project is young, under development and is not ready for use in
a production environment yet.

# A pretty small web framework for Deno

Stewpot is pretty small, yet it has most of what you might need. Stewpot's
ambition is not to become the _Next Big Thing_ or supporting huge _Big Tech™_
websites. Instead the ambition is a more modest one, supporting the everyday
human in building things on the web.

## Quick Start

To get started with a new project, you can use stewpot's init command to
initialize the project.

```bash
$ deno run https://${URL}/init.js path/to/project
```

Now that the project is initialized, we can run the following command:

```bash
$ deno task dev
```
