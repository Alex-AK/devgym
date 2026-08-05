---
title: Updating, and what a version bump carries
question: The advisory says fixed in 7.18.0 and my range stops below 7. What am I actually being asked to do?
order: 5
practise:
  - dep-ignored-build-scripts
  - dep-lockfile-integrity-hash
  - dep-who-pulled-it-in
  - security-sri
sources:
  - author: pnpm
    title: Mitigating supply chain attacks
    url: https://pnpm.io/supply-chain-security
  - author: pnpm
    title: Build Settings
    url: https://pnpm.io/settings/build
  - author: pnpm
    title: pnpm update
    url: https://pnpm.io/cli/update
  - author: npm
    title: npm-audit
    url: https://docs.npmjs.com/cli/v11/commands/npm-audit
  - author: npm
    title: Generating provenance statements
    url: https://docs.npmjs.com/generating-provenance-statements
  - author: GitHub Advisory Database
    title: 'GHSA-337j-9hxr-rhxg: React Router arbitrary constructor injection via deserializeErrors()'
    url: https://github.com/advisories/GHSA-337j-9hxr-rhxg
verified: 2026-08-04
---

The audit output, the version arithmetic and the blocked build below were all run against this
repository on 2026-08-04, with pnpm 11.5.0 on Node 24.16.0. Advisory data moves, so treat the numbers
as a worked example of the reasoning rather than as the current state of anything.

## The model

Three different operations get called "updating", and they cost different amounts.

**Move inside the range.** `pnpm update` "updates all dependencies, adhering to ranges specified in
`package.json`". Only the lockfile changes. This is the cheap one, and it is the only one a patch
advisory can be fixed by without a decision.

**Move the range.** Editing `^6.29.0` to `^7.0.0` is a change to what you accept, which means reading
a changelog, and `pnpm update --latest` does it for everything at once by going "to their latest
stable version as determined by their `latest` tags (potentially upgrading the packages across major
versions)".

**Move something you never declared.** A transitive is chosen by whoever depends on it, so you move
it by moving them, by waiting for them, or by forcing it with an override and owning the mismatch.

Which one an advisory needs is arithmetic you can do in your head, and it is the arithmetic people
skip:

```
  declared        ^6.29.0   ->   >=6.29.0 <7.0.0-0
  installed       6.30.4
  patched in      >=7.18.0
                  ^^^^^^^^ outside the range. No update command reaches this.
```

A fix is reachable only if a version satisfying your range is also patched. When it is not, the
remediation is a range edit or nothing, and no amount of re-running the updater will produce it.

### What a version bump actually carries

Three things, and only the first is the one you read the changelog for.

**Code**, which is the part semver is a promise about, and only a promise.
[Version ranges](./ranges-and-the-lockfile.md) has why that promise is weaker than it looks.

**A new transitive closure.** The package you bumped brings its own dependencies, so a one-line
change to `package.json` can move hundreds of lines of lockfile. That diff is the change, and it is
the part worth reading in review.

**Permission to run code on your machine, at install time.** `preinstall`, `install` and
`postinstall` scripts run with your user's privileges, before you have executed a single line of
your own program, on every machine that installs. pnpm 11 blocks them by default: packages not
listed in `allowBuilds` "are disallowed by default and are treated as unreviewed", and the
recommendation is to list "only trusted dependencies … this way, if a dependency did not require a
build in the past, it won't suddenly run a malicious script."

### The lockfile as a security artefact

It is doing two jobs, and the second one is easy to miss. Alongside the version it records an
integrity hash of the tarball, so a republished or tampered package fails the check instead of
installing. It is also the input to every scanner you run: `npm audit` "submits a description of the
dependencies configured in your project to your default registry and asks for a report of known
vulnerabilities". No lockfile means no stable list to scan, which is why npm warns that with
`--no-package-lock` "the results may be different with every run".

pnpm 11 adds a delay on top. `minimumReleaseAge` "defines the minimum number of minutes that must
pass after a version is published before pnpm will install it. In pnpm v11, this defaults to `1440`
(1 day)", on the reasoning that malware is usually found fast and the dangerous window is the first
few hours. Provenance is the other direction, attesting "where a package was built and who published
a package", verified with `npm audit signatures`, with the limit stated in the same document: it
"does not guarantee the package has no malicious code."

## Worked example

`apps/web/package.json` declares one router:

```json
"react-router-dom": "^6.29.0"
```

`pnpm audit` returns two advisories against that chain, and they fail differently.

The first is against `react-router-dom` itself, GHSA-jjmj-jmhj-qwj2: vulnerable `>=6.30.2 <=6.30.4`,
patched `>=6.30.5`. That looks reachable, because `^6.29.0` expands to `>=6.29.0 <7.0.0-0` and
6.30.5 sits inside it. It is not, because 6.30.5 does not exist. Running
`pnpm view react-router-dom versions` and filtering the list through the range gives:

```
  published, satisfying ^6.29.0    6.29.0 6.30.0 6.30.1 6.30.2 6.30.3 6.30.4
  highest of those                 6.30.4      the installed one, and the vulnerable one
  anything >=6.30.5 below 7.0.0    none        the patch was never released on the 6 line
```

The second is against `react-router`, GHSA-337j-9hxr-rhxg, "arbitrary constructor injection via
`deserializeErrors()`", vulnerable `>=6.4.0 <7.18.0`, patched `>=7.18.0`. `apps/web` has never heard
of that package:

```
$ pnpm why react-router
react-router@6.30.4
└─┬ react-router-dom@6.30.4
  └── @hone/web@1.0.0 (dependencies)
```

It is not in `apps/web/node_modules` at all, and resolving it from `apps/web` gives
`MODULE_NOT_FOUND`. You cannot bump it, because you never chose it. The only lever is the package
above it, and the fix in the package above it lives across a major boundary. Two advisories, two
reasons, one remediation: `react-router-dom@^7`, and the migration that comes with it. That is the
useful output of the exercise, and it arrives before anyone has run a fixer.

Now the install-time half, on the package this repo cannot run without. A scratch project with
`better-sqlite3@12.11.1` and no build allowlist:

```
$ pnpm install
+ better-sqlite3 12.11.1
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: better-sqlite3@12.11.1
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
EXIT: 0
```

Exit 0, and `require('better-sqlite3')` succeeds. The failure arrives later, from a package two
levels down that the error message is the first mention of:

```
$ node -e "new (require('better-sqlite3'))(':memory:')"
node_modules/.pnpm/bindings@1.5.0/node_modules/bindings/bindings.js:135
Error: Could not locate the bindings file. Tried:
 → …/better-sqlite3/build/better_sqlite3.node
 → …/better-sqlite3/build/Debug/better_sqlite3.node
 → …/better-sqlite3/build/Release/better_sqlite3.node
```

The same call inside this repo opens a database, because `pnpm-workspace.yaml` allows exactly three
builds and this is one of them:

```yaml
allowBuilds:
  '@swc/core': true
  better-sqlite3: true
  esbuild: true
```

Three lines is the entire audit surface for install-time code execution in this workspace. That is
the point of the allowlist: not that these three are safe forever, but that a fourth cannot appear
without somebody adding a line.

## Traps

**The scanner says a fix is available and no update command applies it.** Do the arithmetic before
you argue with the tool: expand your range, find the highest published version inside it, and check
whether that version is patched. If it is not, you are being asked for a major upgrade, and the
honest options are to do it, to override the transitive and test what breaks, or to write down why
you are accepting the risk.

**The advisory names a package you have never installed on purpose.** It is transitive.
`pnpm why <package>` prints the path back to the workspace, and the first name on that path you
actually declared is the only one you can move. Everything above it is somebody else's release
schedule.

**One line changed in `package.json` and the lockfile diff is unreadable.** That is the bump carrying
its own dependency tree, and it is the part of the diff that decides whether the upgrade is safe.
Skim it for names you have never seen, and check whether anything new gained the ability to run
install scripts.

**The install succeeded and a native module cannot find its bindings.** A blocked build script, and
the install reported it as a notice rather than an error. The fix is to review the package and
allowlist it, not to disable the protection: pnpm's own warning against allowing everything is that
"existing packages may add scripts in later versions" and "packages can be hijacked or compromised
and begin executing malicious code."

**The tarball changed and the install refused to proceed.** That is the lockfile's second job doing
exactly what it is for. pnpm 11.5.0 fails with `ERR_PNPM_TARBALL_INTEGRITY`, prints the hash it
wanted beside the hash it got, and says why it will not paper over the difference: "pnpm will not
silently overwrite the locked integrity", because that would "defeat the lockfile's protection if a
registry or proxy is serving tampered content." A legitimate republish is refreshed with
`--update-checksums`, after you have looked at what changed, and not before.

**Freezing everything is not the safe option.** A tree that never moves accumulates every advisory
published against it, and the eventual upgrade is a year of majors at once.
[install against ci](./install-against-ci.md) has the other side of that dial: reproducibility and
freshness are the same setting.
