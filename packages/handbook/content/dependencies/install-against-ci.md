---
title: install against ci, and what a frozen lockfile costs
question: Nothing in this pull request touches a dependency. Why is the install step failing on CI?
order: 4
practise:
  - dep-frozen-lockfile-on-deploy
  - dep-lockfile-two-machines
sources:
  - author: npm
    title: npm-ci
    url: https://docs.npmjs.com/cli/v11/commands/npm-ci
  - author: npm
    title: package-lock.json
    url: https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json
  - author: pnpm
    title: pnpm install
    url: https://pnpm.io/cli/install
  - author: pnpm
    title: Mitigating supply chain attacks
    url: https://pnpm.io/supply-chain-security
verified: 2026-08-04
---

Every command and every exit code below was run against pnpm 11.5.0 on Node 24.16.0. npm's behaviour
is quoted from the npm v11 documentation, which is a different tool with a different default, and
that difference is most of the page.

## The model

Two commands, two contracts, and they disagree on purpose.

**`install` makes the tree satisfy `package.json`.** If the lockfile already does that, it is used.
If it does not, the resolver runs, the tree moves, and the lockfile is rewritten as a side effect of
a command you thought was read-only.

**`npm ci`, or `pnpm install --frozen-lockfile`, makes the tree equal the lockfile.** If the lockfile
does not already satisfy `package.json`, it stops rather than fixing it. npm's version of the rule:
"If dependencies in the package lock do not match those in `package.json`, `npm ci` will exit with an
error, instead of updating the package lock", and "it will never write to `package.json` or any of
the package-locks: installs are essentially frozen."

```
                       does the lockfile satisfy package.json?

                    yes                                no
                     |                                  |
  install       use the lockfile              re-resolve, rewrite the
                                              lockfile, carry on (exit 0)

  frozen        use the lockfile              stop (exit 1)
```

The two rows agree on everything except the failure case, which is why the disagreement is invisible
until the day it is not.

### How a lockfile goes stale without anybody touching a dependency

This is the part that makes the failure feel unfair. The check is on **specifiers**, not on installed
versions, so it fires on edits nobody thinks of as dependency changes:

- a range edited by hand in `package.json` without running an install afterwards
- a merge that resolved a `package.json` conflict and kept whichever lockfile arrived first
- a new workspace package, or a `workspace:*` link added between two existing ones

A second check runs on the resolver's configuration, and it has its own error. Adding
`overrides: { content-type: 2.0.0 }` to a workspace whose lockfile predates it fails with
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`: "the current `overrides` configuration doesn't match the value
found in the lockfile." The lockfile pins the inputs to the resolution as well as its output, because
one without the other would not be reproducible.

None of these show up as "a dependency changed" in review. All of them make the two files disagree.

### What frozen buys, and what it costs

It buys the thing the lockfile was written for: npm's stated goal is that "teammates, deployments,
and continuous integration are guaranteed to install exactly the same dependencies", plus the
integrity check on every download and a reviewable diff when the tree really does move. pnpm's
supply-chain guidance reduces to the same sentence: "always lock your dependencies with a lockfile.
Commit your lockfile to your repository to avoid unexpected updates."

It costs speed and it costs drift. `npm ci` deletes what is there first: "if a `node_modules` is
already present, it will be automatically removed before `npm ci` begins its install", which is why
it is slower and why it is reliable. And a frozen tree does not pick up patches on its own, so the
tree ages exactly as fast as nobody updates it. Reproducibility and freshness are the same dial,
turned in opposite directions.

## Worked example

One scratch project. The lockfile pins `semver@7.8.3` and somebody has edited the range in
`package.json` to `^6.3.0` without installing. Same command, same files, twice:

```
$ pnpm install
- semver 7.8.3
+ semver 6.3.1 (7.8.5 is available)
Done in 311ms using pnpm v11.5.0
EXIT: 0

$ CI=1 pnpm install
[ERR_PNPM_OUTDATED_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not
up to date with <ROOT>/package.json
EXIT: 1
```

The local run did not report a problem, because from `install`'s point of view there was none: the
range moved, so it re-resolved and rewrote the lockfile. That rewrite is the change CI is refusing.

The failure message names the exact drift, which is the fastest way to tell a stale lockfile from a
real conflict:

```
  Failure reason:
  specifiers in the lockfile don't match specifiers in package.json:
* 1 dependencies are mismatched:
  - semver (lockfile: ^7.8.0, manifest: ^6.3.0)
```

The fix is always the same: run a plain `pnpm install` locally and commit the lockfile it produces.

The two ways of turning frozen on are not identical, and it is worth knowing which one you have.
With the flag, a missing lockfile is a hard failure:

```
$ pnpm install --frozen-lockfile          # no pnpm-lock.yaml in the project
[ERR_PNPM_NO_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
EXIT: 1
```

With the environment heuristic alone, it is not:

```
$ CI=1 pnpm install                       # no pnpm-lock.yaml in the project
EXIT: 0
lockfile written: true
        specifier: ^7.8.0        version: 7.8.5
```

pnpm resolved from scratch, installed today's newest matching version, and wrote a fresh lockfile,
on the machine that was supposed to be frozen.

## Traps

**CI is red on install and your diff has no dependency in it.** Look at `package.json` for an edited
range and at the merge that produced it. The frozen check compares specifiers, so an edit that never
changed an installed version is enough. Run `pnpm install` locally, commit the lockfile, and the
error tells you exactly which line to look at first.

**It passes in CI and fails in the Docker build, or the other way round.** `--frozen-lockfile` "is
`true` by default in CI environments" and false everywhere else, and your container is usually not
detected as one. The same script then means two different things in two places. Pass the flag
explicitly in every non-interactive install and the ambiguity is gone.

**The lockfile is not committed, and CI has been green the whole time.** The environment default does
not save you here: with no lockfile present, `CI=1 pnpm install` resolves from scratch, exits 0, and
writes a lockfile into a container that is about to be thrown away. Every build gets whatever was
published that morning, and nothing reports it. Only the explicit flag turns that into
`ERR_PNPM_NO_LOCKFILE`.

**Somebody regenerated the lockfile to resolve a merge conflict.** Deleting and reinstalling makes
the conflict go away by re-resolving the entire project, so the pull request now contains one
intended upgrade and several hundred unintended ones, in a diff nobody can read. Take one side of the
conflict, run a plain install on top of it, and let the tool produce the minimum change.

**A dependency was added with the frozen command and nothing happened.** `npm ci` "can only install
entire projects at a time: individual dependencies cannot be added with this command". Adding is
`install`'s job by design, because adding means changing the lockfile.
[Updating, and what a version bump carries](./updating-a-dependency.md) is the other half of that
decision.
