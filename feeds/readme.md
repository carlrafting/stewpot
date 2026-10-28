# @stewpot/feeds

This package provides utilities for consuming feeds of different kinds
(RSS/RDF/Atom/JSON). It can also run as a standalone CLI program, if you have
[deno installed](https://docs.deno.com/runtime/getting_started/installation/) on
your system.

## CLI Install

To create a fresh installation of the CLI program, run the command displayed
below.

```sh
deno install -RWNE -g --min-dep-age=0 jsr:@stewpot/feeds/cli
```

`--min-dep-age=0` allows Deno to install a release as soon as it is published,
rather than waiting for Deno's default 24-hour minimum dependency age.

## CLI Upgrade

Update to newer versions by running the following in your terminal. The
`feeds upgrade` command checks JSR for the latest version and installs that
exact version, including releases published within the last 24 hours.

```sh
$ feeds upgrade
┏ ⚠️  Deno requests run access to "/home/user/.deno/bin/deno".
✅ Granted run access to "/home/user/.deno/bin/deno".
✅ @stewpot/feeds was successfully upgraded to latest version
```

## Documentation

Currently [there is some documentation](./docs.md) for running `@stewpot/feeds`
cli as a system service.
