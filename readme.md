```
┌─┐┌┬┐┌─┐┬ ┬┌─┐┌─┐┌┬┐
└─┐ │ ├┤ │││├─┘│ │ │
└─┘ ┴ └─┘└┴┘┴  └─┘ ┴

A delicious serving of http/https!
```

⚠ WARNING: This project is young, under development and is not ready for use in
a production environment yet.

# A pretty small web framework for Deno

Stewpot is pretty small, yet it has most of what you might need. Stewpot's ambition is not to become the _Next Big Thing_ or supporting huge _Big Tech™_ websites. Instead the ambition is a more modest one, supporting the everyday human in building things on the web.

## Install CLI (Optional)

Stewpot provides a CLI module for running and initializing projects. Instead of
writing urls everytime you invoke a certain command, you can install it locally.

```bash
$ deno install -Af --name=stewpot ${URL}/packages/deno/cli.js
```

## Quick Start

To get started with a new project, you can use stewpot's init command to
initialize the project.

```bash
$ stewpot init path/to/project
```

Now that the project is initialized, we can run the following command:

```bash
$ deno task dev
```

If you've installed the stewpot cli, [as described above](#install-optional), you can run the following command instead:

```bash
$ stewpot serve path/to/dir path/to/main --dev
```
