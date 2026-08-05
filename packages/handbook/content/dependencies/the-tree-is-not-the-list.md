---
title: The tree is not the list
question: I never installed this package. Why is it in node_modules, and why can I import it?
order: 2
practise:
  - dep-phantom-import
  - dep-one-package-two-versions
  - dep-who-pulled-it-in
  - dep-why-paths
  - dep-workspace-protocol-publishes
sources:
  - author: Node.js
    title: 'Modules: CommonJS modules'
    url: https://nodejs.org/api/modules.html
  - author: pnpm
    title: Motivation
    url: https://pnpm.io/motivation
  - author: pnpm
    title: Symlinked node_modules structure
    url: https://pnpm.io/symlinked-node-modules-structure
  - author: pnpm
    title: Node-Modules & Hoisting Settings
    url: https://pnpm.io/settings/node-modules
  - author: pnpm
    title: pnpm why
    url: https://pnpm.io/cli/why
verified: 2026-08-04
---

Every tree and every count below was measured on this repository or on a scratch project beside it,
with pnpm 11.5.0 and Node 24.16.0. Layout is where the package managers disagree most, so nothing
here says "package managers" without naming one.

## The model

You declare a list. You install a graph. `apps/server/package.json` names nineteen packages; the
workspace they resolve into holds several hundred, and you did not choose any of them.

Two separate decisions produce that graph, and confusing them is what makes the whole area feel
arbitrary.

**Resolution** decides which versions exist. Every package in the tree declares its own ranges, and
the resolver has to satisfy every edge at once. Where two ranges overlap it can use one copy for
both. Where they do not, it installs both versions, and a package appearing twice is the normal
outcome of that arithmetic rather than a bug. `pnpm why esbuild -r` reports three esbuild versions
in this repo, at 0.18.20, 0.25.12 and 0.28.1, pulled in by drizzle-kit, vite and tsx.

**Layout** decides where those versions sit on disk, and it is a separate choice made by your
package manager. It matters because Node's resolution algorithm is a directory walk: for a bare
specifier it "starts at the directory of the current module, and adds `/node_modules`", and "if it is
not found there, then it moves to the parent directory, and so on, until the root of the file system
is reached". Node asks for a name and takes the first `node_modules` that has one. It never checks
whether you declared it.

That walk is what makes a flat layout work, and it is also what makes a **phantom dependency**
possible: you import something you never declared, it resolves because a package manager put it
somewhere your walk passes through, and your build breaks the day that package manager arranges the
tree differently.

```
hoisted (npm, Yarn Classic, pnpm --node-linker=hoisted)

  node_modules/
    express/            declared
    qs/                 not declared, hoisted out of express
    body-parser/        not declared
    ... 62 more         not declared

  require('qs') from your code -> walks up -> finds it -> works, until it does not


isolated (pnpm's default)

  node_modules/
    express -> .pnpm/express@5.2.1/node_modules/express
    .pnpm/
      express@5.2.1/node_modules/
        express/        the package
        qs -> ...       reachable only from inside express
        body-parser -> ...

  require('qs') from your code -> walks up -> nothing -> MODULE_NOT_FOUND
```

pnpm's default is `isolated`, where "dependencies are symlinked from a virtual store at
`node_modules/.pnpm`", and it "uses symlinks to add only the direct dependencies of the project into
the root of the modules directory". The refusal is the feature, not a side effect: "a great bonus of
this layout is that only packages that are really in the dependencies are accessible." Setting
`nodeLinker: hoisted` gives you back "a flat `node_modules` without symlinks", described in pnpm's
own docs as the "same as the `node_modules` created by npm or Yarn Classic".

### One kind of edge is not a download at all

In a workspace, some nodes are your own packages. `apps/server` declares
`"@hone/shared": "workspace:*"`, and pnpm "will refuse to resolve to anything other than a local
workspace package". The lockfile records a path where every other entry has a version and a hash,
because there is nothing to fetch:

```
'@hone/shared':
  specifier: workspace:*
  version: link:../../packages/shared
```

On disk it is a symlink straight at the source directory, so there is no copy to go stale, and
`packages/shared/package.json` still decides what a consumer sees: its `exports` point at `dist`,
which is why `pnpm dev` builds that package before starting anything. The specifier is also
temporary. On the way out, pnpm replaces `workspace:` dependencies with "the corresponding version in
the target workspace", so a published package carries an ordinary range and nobody downstream ever
sees the protocol.

## Worked example

One scratch project, one dependency, `express@^5.1.0`. Same manifest and same lockfile both times;
the only thing that changes is the linker.

```
$ pnpm install                                 # isolated, the default
  top-level entries: 1  -> express
  require('express')     ok
  require('qs')          MODULE_NOT_FOUND
  require('body-parser') MODULE_NOT_FOUND

$ pnpm install --config.node-linker=hoisted
  top-level packages: 65
  require('express')     ok
  require('qs')          ok
  require('body-parser') ok
```

Sixty-four packages went from unimportable to importable, and nothing about what you declared
changed. Every one of them is a phantom dependency waiting to happen.

The same install also shows resolution and layout pulling in different directions. Sixty-six packages
were installed but only sixty-five could sit at the top, because two of them are the same name:

```
$ pnpm why content-type
content-type@1.0.5
└─┬ express@5.2.1                    express declares ^1.0.5
  └── hoistlab@1.0.0 (dependencies)

content-type@2.0.0
├─┬ body-parser@2.3.0                body-parser declares ^2.0.0
│ └─┬ express@5.2.1
└─┬ type-is@2.1.0                    type-is declares ^2.0.0

Found 2 versions of content-type
```

The ranges do not overlap, so both versions are installed. A flat layout can only host one of them
at the root, so it puts 2.0.0 there and nests 1.0.5 inside express, which is why a "flat"
`node_modules` is never quite flat.

This repo shows the other side. `apps/server` declares `@nestjs/platform-express`, which depends on
express, so express 5.2.1 is definitely installed. From `apps/server`:

```
@nestjs/platform-express  ->  node_modules/.pnpm/@nestjs+platform-express@11.1.28_.../…
express                   ->  MODULE_NOT_FOUND
kysely                    ->  MODULE_NOT_FOUND
```

The same rule is load-bearing for workouts. A workout workspace symlinks its `node_modules` straight
at `packages/workouts`, so the thirty dependencies in `packages/workouts/package.json` are exactly
what a workout can import, and `qs`, `body-parser` and `class-validator` all fail to resolve there
even though the first two are sitting inside express. That is why adding a library to a workout is an
edit to that manifest and not something you can arrange from inside the workout.

## Traps

**It runs locally and CI says `Cannot find module`.** A phantom dependency: your code imports
something only reachable because a hoist put it in your walk, and the machine that installed at a
different moment, or with a different package manager, arranged the tree differently. The fix is a
line in `package.json`, not a reinstall. Installing it as a direct dependency is also the correct
fix when it was already there by accident, because you were depending on it either way.

**Two copies of a library, and identity checks stop working.** `instanceof` compares against one
constructor, a registry holds one map, a symbol is unique per module instance. Two versions of the
same package mean two of each, and the error blames whichever line noticed first.
[Values and references](../javascript/values-and-references.md) is the underlying rule;
[Peer dependencies](./peer-dependencies.md) is how a library says it must not be duplicated.

**Removing a dependency broke something that does not use it.** You removed the package that was
hoisting a phantom into place. The tree shrank, the walk stopped finding it, and the failure landed
in unrelated code. This is the same bug as the one above, discovered from the other end.

**The vulnerable package is three levels down and you cannot find who wants it.** That is what
`pnpm why` answers: it "shows all packages that depend on the specified package", printing the
package at the root with its dependents below it. Follow the branches down to the first name you
actually declared, because that is the only one you can move.

**`pnpm why` finds the package and your import cannot.** They answer different questions. Run
`pnpm why kysely` from anywhere in this repo and it reports `@hone/server` among the dependents,
reached through drizzle-orm, which lists kysely as an optional peer. Import it from `apps/server`
anyway and you get `MODULE_NOT_FOUND`, because "who wants this" and "what may this directory
resolve" are two different graphs. The second one is the one your code runs against, so check it the
way your code will: from the directory the file lives in.
