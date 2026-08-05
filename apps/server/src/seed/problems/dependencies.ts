import { code, codeProblem, md, type ProblemDraft } from './types';

export const dependencyProblems: ProblemDraft[] = [
  {
    slug: 'dep-caret-below-one-zero',
    title: 'The fix that never arrives',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A manifest pins a charting library:',
      '',
      code('json', '"dependencies": {', '  "chart-lib": "^0.2.3"', '}'),
      '',
      'Upstream then publishes 0.2.4, 0.3.0 and 1.0.0. You delete the lockfile and install again.',
      '',
      'Which one of those three do you get? Answer with the version number.'
    ),
    graderConfig: {
      accept: ['0.2.4', 'only 0.2.4', '0.2.4 only', 'just 0.2.4'],
      nearMisses: {
        '0.3.0':
          'Below 1.0.0 the caret treats the minor as the breaking position, so `^0.2.3` stops before 0.3.0.',
        '1.0.0': '`^` never crosses a major. The surprise here is at the other end of the range.',
        'all three': 'A caret has an upper bound. The question is where it sits below 1.0.0.',
        'all of them': 'A caret has an upper bound. The question is where it sits below 1.0.0.',
      },
      closeSubstrings: {
        'and 0.3.0':
          'Below 1.0.0 the caret treats the minor as the breaking position, so `^0.2.3` stops before 0.3.0.',
        '0.3.0 and':
          'Below 1.0.0 the caret treats the minor as the breaking position, so `^0.2.3` stops before 0.3.0.',
      },
      hints: [
        'The caret does not mean the same thing above and below 1.0.0.',
        'It allows changes that do not modify the left-most non-zero part of the version. Find that part here.',
        'The left-most non-zero part of 0.2.3 is the minor, so the range runs `>=0.2.3 <0.3.0`.',
      ],
    },
    canonicalAnswer: '0.2.4',
    solution: md(
      '`0.2.4`, and nothing else.',
      '',
      code(
        'text',
        '^0.2.3  →  >=0.2.3 <0.3.0',
        '^1.2.3  →  >=1.2.3 <2.0.0',
        '^0.0.3  →  >=0.0.3 <0.0.4'
      )
    ),
    explanation:
      'The caret allows changes that do not modify the left-most non-zero part of the version. At 1.2.3 that part is the major, so `^1.2.3` happily takes 1.9.0; at 0.2.3 it is the minor, so the range stops dead at 0.3.0, and at 0.0.3 it is the patch. Reading `^0.2.3` as "0.2.3 and up" costs you a fix you never receive: a 0.x library ships its work in minor bumps, so it looks frozen behind a caret and `pnpm update` reports nothing to do. Checked against semver 7.8.5, which expands `^0.2.3` to `>=0.2.3 <0.3.0-0`.',
  },

  {
    slug: 'dep-tilde-and-caret-agree',
    title: 'Two operators, one range',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'Two dependencies on the same 0.x release, written differently because one of them was meant to be held tighter:',
      '',
      code('json', '"a": "^0.2.3",', '"b": "~0.2.3"'),
      '',
      'Name a version that one of those ranges accepts and the other refuses.'
    ),
    graderConfig: {
      accept: [
        'none',
        'there is none',
        'no version',
        'there is no such version',
        'they are identical',
        'they are the same',
        'the ranges are identical',
        'neither',
      ],
      acceptPatterns: [
        '\\b(none|no such version|no version|identical|equivalent|the same range|same range)\\b',
      ],
      nearMisses: {
        '0.3.0':
          'Both refuse it. Below 1.0.0 the caret already treats the minor as the breaking position, which is exactly what the tilde does.',
        '0.2.9': 'Both accept it. The two ranges have the same floor as well as the same ceiling.',
        '1.0.0': 'Both refuse it, and it is not the boundary worth checking here.',
      },
      hints: [
        'Write out what each operator expands to before comparing them.',
        'The tilde pins the minor. Ask what the caret pins when the major is 0.',
        'Both are `>=0.2.3 <0.3.0`, so there is no version that separates them.',
      ],
    },
    canonicalAnswer: 'There is none: below 1.0.0 the two ranges are identical.',
    solution: md(
      'There is no such version. Both expand to the same range:',
      '',
      code('text', '^0.2.3  →  >=0.2.3 <0.3.0', '~0.2.3  →  >=0.2.3 <0.3.0')
    ),
    explanation:
      'The tilde always pins the minor, and below 1.0.0 the caret pins it too, because the minor is the left-most non-zero part of the version. The two only diverge from 1.0.0 up, where `~1.2.3` still stops at 1.3.0 and `^1.2.3` runs all the way to 2.0.0. Switching a 0.x dependency to a tilde to "be safer" therefore changes nothing, and it costs you the signal: the reader now cannot tell which packages you actually meant to hold still. Checked against semver 7.8.5, where both ranges expand to `>=0.2.3 <0.3.0-0`.',
  },

  {
    slug: 'dep-range-and-a-prerelease',
    title: 'The beta the range will not take',
    category: 'dependencies',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'You are on `"lib": "^1.2.3"`. The maintainer publishes `1.3.0-beta.1` and asks you to try it.',
      '',
      'A fresh install ignores it, even though 1.3.0 itself is inside that caret.',
      '',
      'Write a range that resolves `1.3.0-beta.1` now and still takes 1.3.0 once it ships.'
    ),
    graderConfig: {
      accept: [
        '^1.3.0-beta.1',
        '>=1.3.0-beta.1',
        '~1.3.0-beta.1',
        '>= 1.3.0-beta.1',
        '>=1.3.0-beta.1 <2.0.0',
      ],
      acceptPatterns: ['^\\s*(\\^|~|>=\\s*)1\\.3\\.0-beta\\.1'],
      nearMisses: {
        '1.3.0-beta.1':
          'An exact prerelease matches only itself, so 1.3.0 will need another edit when it ships. Put an operator in front of it.',
        '^1.3.0':
          'The operator is not the problem. A range reaches a prerelease only when the range itself names one at the same major, minor and patch.',
        '>=1.3.0':
          'Still excluded: `1.3.0-beta.1` sorts below `1.3.0`, and a range with no prerelease in it never matches one.',
        '^1.2.3': 'That is what you already have, and it is the range that is ignoring the beta.',
        '*': 'Not even `*` matches a prerelease. The exclusion is a rule about the range, not about how wide it is.',
      },
      hints: [
        'The beta is not being excluded for being too new. Look at what makes it different in shape.',
        'A prerelease is only ever considered when the range mentions a prerelease at the same major, minor and patch.',
        'So the range has to name `1.3.0-beta.1` itself, with an operator in front so later versions still qualify.',
      ],
    },
    canonicalAnswer: '^1.3.0-beta.1',
    solution: md(
      '`^1.3.0-beta.1`, which resolves the beta now and 1.3.0 when it lands.',
      '',
      '`>=1.3.0-beta.1` works too. `1.3.0-beta.1` on its own does not, because an exact prerelease matches only itself.'
    ),
    explanation:
      'A prerelease is opt-in per version, not per range width. `^1.2.3` covers 1.3.0 and refuses `1.3.0-beta.1`, and so does `>=1.2.3` and so does `*`: the rule is that a prerelease qualifies only when the range names a prerelease with the same major, minor and patch. That is what stops a routine `pnpm update` pulling an alpha into production the day it is tagged, and it is why "just widen the range" never gets you the beta. Naming it explicitly is the whole opt-in. Checked against semver 7.8.5.',
  },

  {
    slug: 'dep-frozen-lockfile-on-deploy',
    title: 'The install that rewrote the lockfile',
    category: 'dependencies',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'A deploy script on a VM runs `pnpm install` before starting the app. It is not a CI runner, so pnpm 11.5.0 does not apply its CI default: where `package.json` and `pnpm-lock.yaml` disagree, that install resolves fresh versions and writes the lockfile back inside the box.',
      '',
      'Name the flag that makes it refuse instead.'
    ),
    graderConfig: {
      accept: [
        '--frozen-lockfile',
        'frozen-lockfile',
        'frozen lockfile',
        'pnpm install --frozen-lockfile',
        'pnpm i --frozen-lockfile',
        '--frozen-lockfile=true',
      ],
      acceptPatterns: ['--frozen-?\\s?lockfile'],
      nearMisses: {
        'pnpm ci':
          'That is the command that turns it on, after a `pnpm clean`. The flag underneath it is `--frozen-lockfile`.',
        'npm ci':
          "That is npm's. pnpm 11.5.0 spells the command `pnpm ci` and the flag `--frozen-lockfile`.",
        '--offline':
          'That controls where packages come from, not whether the lockfile may be rewritten.',
        '--prod':
          'That drops devDependencies. The lockfile is still free to be re-resolved and rewritten.',
      },
      hints: [
        'The lockfile is being treated as a suggestion. You want it treated as the input.',
        'pnpm turns this on by itself in CI environments, which is why nobody has had to type it yet.',
        'It fails with `ERR_PNPM_OUTDATED_LOCKFILE` and names both specifiers.',
      ],
    },
    canonicalAnswer: '--frozen-lockfile',
    solution: md(
      code('bash', 'pnpm install --frozen-lockfile'),
      '',
      'It fails rather than re-resolving:',
      '',
      code(
        'text',
        'ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because',
        'pnpm-lock.yaml is not up to date with <ROOT>/packages/lib/package.json',
        '',
        "  specifiers in the lockfile don't match specifiers in package.json:",
        '  - semver (lockfile: ^7.0.0, manifest: ^6.0.0)'
      )
    ),
    explanation:
      '`pnpm install` treats the lockfile as a starting point: where a manifest disagrees with it, pnpm resolves again and writes the result back, which is what you want on your laptop and never want on a deploy. `--frozen-lockfile` makes the disagreement fatal, and the error names the package and both specifiers so the fix is obvious. pnpm 11.5.0 turns it on by default in CI environments and off everywhere else, so the box that most needs it, whatever actually runs your deploy, is the one that does not get it. `pnpm ci` is the same flag with a `pnpm clean` in front, which is the closest thing to `npm ci`.',
  },

  {
    slug: 'dep-who-pulled-it-in',
    title: 'An advisory for something you never installed',
    category: 'dependencies',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'An advisory names `semver@6.3.1`. No `package.json` in this repo mentions `semver` at all, and the tree has both 6.3.1 and 7.8.5 in it.',
      '',
      'Name the pnpm command that tells you which of your own dependencies dragged 6.3.1 in.'
    ),
    graderConfig: {
      accept: ['pnpm why semver', 'pnpm why', 'why semver', 'pnpm why semver@6.3.1', 'pnpm-why'],
      acceptPatterns: ['\\bpnpm\\s+why\\b', '^\\s*why\\s+\\S'],
      nearMisses: {
        'pnpm list':
          '`pnpm list` walks forward from your manifests, so a package four levels down appears only if you already guessed the depth. `pnpm why <pkg>` walks the other way.',
        'pnpm list --depth infinity':
          'It is in there somewhere. `pnpm why semver` prints the chains that reach it and nothing else.',
        'pnpm audit':
          'That tells you which advisories apply. It does not print the chain of dependents that pulled the package in.',
        'pnpm ls':
          'Same command as `pnpm list`, and the same direction: forward, from your own manifests.',
      },
      hints: [
        'The two listing commands answer opposite questions. You want the reverse one.',
        'Not "what do I depend on" but "who depends on this".',
        'The command is `pnpm why`, and it takes the package name.',
      ],
    },
    canonicalAnswer: 'pnpm why semver',
    solution: md(
      code('bash', 'pnpm why semver'),
      '',
      'One block per resolved version, each a tree of dependents:',
      '',
      code(
        'text',
        'semver@6.3.1',
        '├─┬ @babel/core@7.29.7',
        '│ └─┬ eslint-plugin-react-hooks@7.1.1',
        '│   └── hone@1.0.0 (devDependencies)',
        '',
        'semver@7.8.5',
        '├─┬ @typescript-eslint/typescript-estree@8.65.0',
        '│ └── ...'
      )
    ),
    explanation:
      "`pnpm why` answers the reverse of `pnpm list`: not what you depend on, but who depends on this. Each block ends at one of your own packages with `(dependencies)` or `(devDependencies)` beside it, which is what tells you whether the fix is your upgrade or somebody else's release. `pnpm list` cannot get you there, because it walks forward from your manifests and a transitive package means guessing a depth and reading everything at it. The split by resolved version matters as much as the paths: an advisory against 6.3.1 says nothing about the 7.8.5 sitting next to it, and upgrading the wrong dependent changes nothing.",
  },

  {
    slug: 'dep-lockfile-integrity-hash',
    title: 'What the version number does not pin',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      "An entry from this repo's `pnpm-lock.yaml`:",
      '',
      code(
        'yaml',
        'semver@7.8.5:',
        '  resolution: {integrity: sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==}',
        "  engines: {node: '>=10'}"
      ),
      '',
      'The version number already says which release to fetch. Name what the `integrity` hash pins that the version number does not.'
    ),
    graderConfig: {
      accept: [
        'the contents',
        'the tarball contents',
        'the contents of the tarball',
        'the bytes',
        'the exact bytes',
        'the package contents',
        'the tarball',
        'the file contents',
      ],
      acceptPatterns: ['\\b(bytes|contents?|tarball|payload|the code itself|the files)\\b'],
      nearMisses: {
        'the version':
          'That is the part the version number already pins. The hash is about something else.',
        'where it came from':
          'The registry URL is a separate field. The hash is computed over what came back, not over where you asked.',
        'the dependencies':
          'Those are pinned by their own entries. This one line is about the package in front of you.',
      },
      hints: [
        'A version number is a label. Ask who controls what sits behind the label.',
        'The hash is computed over the downloaded tarball, so it changes when anything inside it changes.',
        'It pins the bytes: same version, different contents, and the install stops.',
      ],
    },
    canonicalAnswer: 'The bytes: the exact contents of the tarball published under that version.',
    solution:
      'The contents of the tarball. A version number pins which release you ask for; the integrity hash pins what came back, and an install whose download hashes differently fails rather than proceeding.',
    explanation:
      'A version number is a label the registry controls, and a hash is a claim about the bytes behind the label. If what gets served for 7.8.5 ever differs from what you locked, whether through a mirror, a private registry or a caching proxy, the check fails at install time and nothing of that package runs. That is what makes the lockfile a security artefact rather than a convenience: `pnpm install --frozen-lockfile` on a machine you do not own reproduces the exact tarballs you reviewed, or it stops. Deleting the lockfile to settle a merge conflict throws that away and re-resolves the whole tree against whatever the registry is serving today.',
  },

  {
    slug: 'dep-workspace-protocol-publishes',
    title: 'What workspace:* becomes on the way out',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A package in a pnpm workspace depends on a sibling:',
      '',
      code(
        'json',
        '"name": "@demo/app",',
        '"dependencies": {',
        '  "@demo/lib": "workspace:*"',
        '}'
      ),
      '',
      '`@demo/lib` is at 1.4.2. You run `pnpm pack` on `@demo/app`.',
      '',
      "What does the `@demo/lib` line read as in the tarball's `package.json`?"
    ),
    graderConfig: {
      accept: ['1.4.2', '"1.4.2"', '"@demo/lib": "1.4.2"', '@demo/lib: 1.4.2'],
      nearMisses: {
        'workspace:*':
          'That specifier never leaves the workspace: no registry knows what `workspace:` means, so pnpm rewrites it at pack time.',
        '^1.4.2': 'That is what `workspace:^` becomes. A bare `*` publishes the exact version.',
        '~1.4.2': 'That is what `workspace:~` becomes. A bare `*` publishes the exact version.',
        '*': 'The `*` means "whatever the sibling is at", and pack resolves it to that number rather than publishing it.',
      },
      hints: [
        'A registry has never heard of `workspace:`, so the specifier cannot survive publication as written.',
        "pnpm substitutes the sibling's version at pack time. The operator you wrote decides which form it takes.",
        '`workspace:*` publishes an exact version, `workspace:^` publishes a caret range.',
      ],
    },
    canonicalAnswer: '1.4.2',
    solution: md(
      code('json', '"dependencies": {', '  "@demo/lib": "1.4.2"', '}'),
      '',
      code(
        'text',
        'workspace:*      →  1.4.2',
        'workspace:^      →  ^1.4.2',
        'workspace:~      →  ~1.4.2',
        'workspace:2.0.1  →  2.0.1'
      )
    ),
    explanation:
      '`workspace:` is a pnpm specifier meaning "resolve this from the workspace, never from the registry", and inside the repo it becomes a symlink to the sibling rather than a copy, which is why an edit there is visible immediately. It cannot leave, so `pnpm pack` and `pnpm publish` substitute the sibling\'s version, taking the operator from what you wrote. Choosing `*` therefore ships an exact pin, which is stricter than most consumers want and forces a lockstep upgrade of everything you publish together; `^` is what you write when the published package should accept later siblings. Verified with pnpm 11.5.0 by unpacking the tarball.',
  },

  {
    slug: 'dep-devdependency-at-runtime',
    title: 'Runs everywhere except the container',
    category: 'dependencies',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'The service boots on every laptop and dies in the image:',
      '',
      code('text', "Error: Cannot find module 'zod'"),
      '',
      "`zod` is imported by a request handler. The Dockerfile's install step is `pnpm install --prod --frozen-lockfile`, and `zod` sits in `devDependencies`.",
      '',
      'Name the one-line fix.'
    ),
    graderConfig: {
      accept: [
        'move zod to dependencies',
        'move it to dependencies',
        'move zod into dependencies',
        'put zod in dependencies',
        'zod goes in dependencies',
        'dependencies',
        'pnpm add zod',
      ],
      acceptPatterns: [
        '\\bmove\\b[\\s\\S]{0,40}\\b(to|into|under)\\s+"?dependencies"?',
        '^\\s*"?dependencies"?\\s*$',
        '\\bpnpm\\s+add\\s+zod\\s*$',
      ],
      nearMisses: {
        'drop --prod':
          'That works, and it installs your whole toolchain into the image. The manifest is the thing that is wrong: something imported at runtime is not a dev dependency.',
        'remove --prod':
          'That works, and it installs your whole toolchain into the image. The manifest is the thing that is wrong: something imported at runtime is not a dev dependency.',
        'pnpm add -D zod':
          'That is where it already is. `-D` is the half the production install deletes.',
        'bundle it':
          'A bundler would hide it. The declaration is still wrong, and the next import repeats the bug.',
      },
      hints: [
        'Nothing is wrong with the install command. Ask what `--prod` leaves out.',
        'A production install removes `devDependencies` entirely, and the handler imports this at runtime.',
        'The package is declared in the wrong field.',
      ],
    },
    canonicalAnswer: 'Move zod to dependencies.',
    solution: md(
      'Move `zod` from `devDependencies` to `dependencies`.',
      '',
      code('bash', 'pnpm add zod   # re-declares it in dependencies')
    ),
    explanation:
      'The two fields are indistinguishable on your laptop and different everywhere a production install runs: `pnpm install --prod` deletes the dev half from `node_modules`, and so does every base image that does it for you. The split is not tools against libraries, it is needed after the build against needed during it. Anything the running process imports belongs in `dependencies`, however much it feels like tooling, while `typescript` and `@types/*` stay in `devDependencies` because nothing of them survives compilation. This failure is always the same shape, a `MODULE_NOT_FOUND` no test catches, because no test runs a production install.',
  },

  {
    slug: 'dep-ignored-build-scripts',
    title: 'Three packages on the allowlist',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      "This repo's `pnpm-workspace.yaml` ends with three names out of the several hundred packages in its tree:",
      '',
      code(
        'yaml',
        'allowBuilds:',
        "  '@swc/core': true",
        '  better-sqlite3: true',
        '  esbuild: true'
      ),
      '',
      'Say what those three are allowed to do that the rest are not.'
    ),
    graderConfig: {
      accept: [
        'run install scripts',
        'run their install scripts',
        'run postinstall scripts',
        'run their postinstall scripts',
        'run lifecycle scripts',
        'run build scripts',
        'run code at install time',
      ],
      acceptPatterns: [
        '(post)?install\\s+scripts?',
        'lifecycle\\s+scripts?',
        'build\\s+scripts?',
        '\\brun\\b[\\s\\S]{0,30}\\bat\\s+install',
        '\\brun\\b[\\s\\S]{0,30}\\bduring\\s+(the\\s+)?install',
      ],
      nearMisses: {
        'they have native code':
          'True of these three, and not what the list controls. It names packages permitted to run something.',
        'they are compiled':
          'That is why they need the permission, not what the permission grants. Say what pnpm lets them do.',
        'they are trusted': 'Trusted to do what, specifically? The list gates one thing.',
      },
      hints: [
        'All three ship or compile a native binary. Ask what has to happen for that binary to exist.',
        'pnpm 11 does not let a dependency execute anything at install time unless you say so.',
        'The list names the packages whose `postinstall` and other lifecycle scripts pnpm will run.',
      ],
    },
    canonicalAnswer: 'Run their install scripts.',
    solution: md(
      'Run their lifecycle scripts at install time. Everything else is blocked, and pnpm says so:',
      '',
      code(
        'text',
        '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: better-sqlite3@12.11.1',
        '',
        'Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.'
      )
    ),
    explanation:
      'A `postinstall` script runs arbitrary code on your machine, with your credentials, before a line of your own has executed, which is the shortest path there is from a compromised package to a compromised laptop. pnpm blocks them by default and runs only what the workspace lists, so pulling in a dependency that needs a native build becomes a decision somebody makes rather than something that happens. Skip the entry and the install still succeeds: the failure lands later, at require time, as `Could not locate the bindings file`. `pnpm approve-builds` is the interactive way to write those lines. Verified on pnpm 11.5.0 by installing better-sqlite3 with no allowlist.',
  },

  {
    slug: 'dep-lockfile-two-machines',
    title: 'Same commit, different build',
    category: 'dependencies',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'Two developers clone the same repo at the same commit and run `pnpm install`. One gets a build error the other cannot reproduce.',
      '',
      'There is no `pnpm-lock.yaml` in the repo. Somebody added it to `.gitignore` because it "kept causing merge conflicts".',
      '',
      'Say what the lockfile records that `package.json` cannot, and name the part of the tree that only exists in the lockfile.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'exact version',
            'exact versions',
            'resolved version',
            'resolved versions',
            'which version',
            'the version that was',
            'the version actually',
            'one version',
            'a single version',
            'specific version',
            'a range is not',
            'ranges',
            'range of versions',
            'resolution',
          ],
          missingFeedback:
            '`package.json` holds a range, which is a set of versions rather than one. Say what the lockfile adds to that.',
        },
        {
          synonyms: [
            'transitive',
            'indirect',
            'dependencies of',
            'sub-depend',
            'subdepend',
            'nested',
            'the whole tree',
            'entire tree',
            'every package',
            'deeper',
            'further down',
            'levels down',
            'never declared',
            'you did not choose',
          ],
          missingFeedback:
            'Name the packages that appear in no manifest of yours at all. Where are those recorded?',
        },
      ],
      hints: [
        'A range is not a version. Ask what the two installs were free to disagree about.',
        'The manifests only name the first level. Nothing in them says anything about what those packages depend on.',
        'The lockfile is the record of which member of every range was picked, all the way down.',
      ],
    },
    canonicalAnswer:
      '`package.json` holds ranges, and a range is a set of versions rather than one, so the lockfile is the record of which exact version was resolved for each. It also covers the whole tree: transitive dependencies appear in no manifest of yours, so without a lockfile nothing pins them at all and a patch release four levels down landing between the two installs is enough to give two machines different code.',
    solution: md(
      '- **What it records**: the exact version resolved for every range, plus the integrity hash of each tarball. A manifest can only say `^7.0.0`; the lockfile says `7.8.5`.',
      "- **The part that is only there**: everything transitive. Your manifests name the first level and nothing else, so a lockfile is the only place your dependencies' dependencies are pinned.",
      '',
      code(
        'yaml',
        'packages/lib:',
        '  dependencies:',
        '    semver:',
        '      specifier: ^7.0.0',
        '      version: 7.8.5'
      )
    ),
    explanation:
      'A manifest holds ranges and a lockfile holds decisions, which is why the same commit installs differently on two machines without one. The divergence is almost never in a package you chose: the first level is small and slow-moving, and the tree under it is hundreds of packages on release schedules nobody is watching. Committing the lockfile is what turns "it works on my machine" into a reproducible claim, and the merge conflicts it causes are the honest cost of having recorded something. Regenerate on conflict, do not gitignore.',
  },

  {
    slug: 'dep-one-package-two-versions',
    title: 'The same package, twice',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      '`pnpm why semver` in this repo prints two blocks, not one:',
      '',
      code(
        'text',
        'semver@6.3.1',
        '└─┬ @babel/core@7.29.7',
        '  └── ...',
        '',
        'semver@7.8.5',
        '└─┬ @typescript-eslint/typescript-estree@8.65.0',
        '  └── ...'
      ),
      '',
      'Nothing is broken. Say why resolution allows one package at two versions in the same tree, and name a cost that is real when it happens.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'own copy',
            'its own',
            'each dependent',
            'per dependent',
            'nested',
            'separate copy',
            'different range',
            'incompatible range',
            'ranges disagree',
            'ranges do not overlap',
            "ranges don't overlap",
            'cannot satisfy both',
            'no single version',
            'no one version',
            'nearest node_modules',
          ],
          missingFeedback:
            'Two dependents asked for ranges that no single version satisfies. Say what the resolver does then.',
        },
        {
          synonyms: [
            'bundle',
            'size',
            'disk',
            'install size',
            'instanceof',
            'two instances',
            'separate state',
            'module state',
            'singleton',
            'duplicate code',
            'identity',
            'two copies of react',
            'shipped twice',
            'ships twice',
          ],
          missingFeedback:
            'Name something that goes wrong, or gets bigger, once the same package is present twice.',
        },
      ],
      hints: [
        'Both dependents got what they asked for. Ask how that was possible at all.',
        'Node resolves from the nearest `node_modules` upward, so two dependents can each have their own copy.',
        'It is free for a stateless library and expensive for one that holds state or identity.',
      ],
    },
    canonicalAnswer:
      'The two dependents asked for ranges that no single version satisfies, and Node resolves from the nearest `node_modules` upward, so each one gets its own copy and both are satisfied. For a stateless library like semver the cost is disk and bundle size. It stops being free when the package holds state or identity: two instances mean separate module state and `instanceof` failing across the seam.',
    solution: md(
      '- **Why it is allowed**: Node resolves a package from the nearest `node_modules` on the way up, so two dependents with incompatible ranges each get their own copy. That is what lets independent release schedules coexist at all.',
      '- **What it costs**: bytes, always. Correctness, when the package holds state or identity: two copies of React have separate hook dispatchers, two copies of a class make `instanceof` false across the seam, two copies of a plugin registry each see half the plugins.'
    ),
    explanation:
      'Duplication is the mechanism that keeps the ecosystem from deadlocking: without it, one dependency stuck on an old range would hold back every other package that shares it. For a leaf library the only bill is disk and bundle size, which is why `semver` at two versions here is genuinely nothing to fix. The moment the package carries state or identity the duplicate becomes a bug that reads like magic, because both copies are the right version of the right library and the seam between them is invisible in a stack trace. That case is exactly what `peerDependencies` exists to prevent.',
  },

  {
    slug: 'dep-phantom-import',
    title: 'The import you never declared',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      "A file imports `express` directly. Nothing in that package's `package.json` lists `express`; it arrives underneath `@nestjs/platform-express`.",
      '',
      'Installed with npm 11.12.1 the import resolves. Installed with pnpm 11.5.0 it does not:',
      '',
      code('text', "Error: Cannot find module 'express'"),
      '',
      'Say why it resolved under the first layout, and what the second does instead that makes it fail.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'hoist',
            'flat',
            'top level',
            'top-level',
            'same directory',
            'one directory',
            'alongside',
            'lifted',
            'raised',
            'all in one',
            'everything in node_modules',
          ],
          missingFeedback:
            'The package was in the tree either way. Say where the first layout physically put it, and why Node found it there.',
        },
        {
          synonyms: [
            'symlink',
            'only what you declared',
            'only its declared',
            'only the declared',
            'only declared',
            'what it declares',
            'declared depend',
            'direct depend',
            'own dependencies',
            'not linked',
            'isolated',
            'not on the resolution path',
            '.pnpm',
          ],
          missingFeedback:
            "Say what pnpm puts in a package's own `node_modules`, and where everything else goes.",
        },
      ],
      hints: [
        'The import was never wrong about the package existing. Ask where each layout put it.',
        'Node walks up `node_modules` directories and takes the first match, so a flat install makes every transitive package importable.',
        "pnpm links only a package's declared dependencies into its `node_modules` and keeps the rest out of the resolution path.",
      ],
    },
    canonicalAnswer:
      "A flat install hoists transitive packages into the same top-level `node_modules` as the ones you declared, and Node walks up taking the first match, so it cannot tell the two apart. pnpm symlinks only a package's own declared dependencies into its `node_modules` and keeps everything else in `.pnpm`, which is not on the resolution path, so an undeclared import has nowhere to resolve from.",
    solution: md(
      "- **Why it resolved**: a flat layout hoists the whole tree into one top-level `node_modules`. Node's algorithm walks up and takes the first match, so a transitive package looks exactly like a declared one. `npm install chokidar` on npm 11.12.1 leaves `readdirp` beside it at the top level, and `require.resolve('readdirp')` finds it.",
      "- **Why it fails**: pnpm symlinks only the declared dependencies into each package's own `node_modules` and keeps the real packages in a content-addressed `.pnpm` directory that nothing resolves through. This repo's `apps/server/node_modules` holds 13 entries, one per declared dependency, and `require.resolve('express')` from there throws even though express@5.2.1 is in the tree."
    ),
    explanation:
      'The import worked by accident, and what you had afterwards was a dependency you never declared and cannot pin: it disappears the day the intermediate package drops it or moves it across a major, and no manifest of yours records that you ever cared. pnpm removes the accident by construction rather than by discipline, which is why the same code fails on the first install and not six months later in production. Nothing about it is a pnpm quirk to work around. Declare what you import, which takes a second, and the layout stops having an opinion.',
  },

  {
    slug: 'dep-optional-peer-driver',
    title: 'The library that installed no driver',
    category: 'dependencies',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You install drizzle-orm and nothing can connect. Its manifest declares 28 peer dependencies, every one of them marked optional, including `pg`, `mysql2`, `better-sqlite3` and `@electric-sql/pglite`. pnpm 11.5.0 installed none of them and printed no warning.',
      '',
      'Say what marking a peer optional changes, and why a library with 28 of them wants that.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'not installed',
            'will not install',
            'does not install',
            'no warning',
            'not required',
            'only if',
            'if you have',
            'if present',
            'when present',
            'no complaint',
            'skipped',
          ],
          missingFeedback:
            'An ordinary peer that nobody satisfies gets installed or warned about. Say what changes when it is optional.',
        },
        {
          synonyms: [
            'menu',
            'choose',
            'choice',
            'pick one',
            'one of them',
            'only one',
            'which one',
            'the one you',
            'all of them',
            'every driver',
            'adapts',
            'supports many',
          ],
          missingFeedback:
            'Think about what installing all 28 would mean. Why does the library want you to decide?',
        },
      ],
      hints: [
        'A non-optional peer is something the library needs. All 28 of these cannot be.',
        'Optional turns "must be yours" into "if you have one, it must be yours".',
        'The list is a menu of drivers it can talk to. You install the one you use.',
      ],
    },
    canonicalAnswer:
      'Optional means the package manager will not install the peer for you and will not warn when it is absent, while still constraining the version if you do have one. A library that can talk to 28 different drivers cannot require any of them, because you only use one, so the list is a menu rather than a set of requirements and you install the driver you chose.',
    solution: md(
      code(
        'jsonc',
        '"peerDependencies": { "pg": ">=8", "better-sqlite3": ">=9" },',
        '"peerDependenciesMeta": {',
        '  "pg": { "optional": true },',
        '  "better-sqlite3": { "optional": true }',
        '}'
      ),
      '',
      'npm puts it plainly: this "allows you to integrate and interact with a variety of host packages without requiring all of them to be installed".'
    ),
    explanation:
      "A plain peer says the host has to provide this and the tooling acts on that: pnpm 11.5.0 installs it by default, and a version mismatch is at least a warning. Optional keeps the version constraint and drops the requirement, so nothing is installed and nothing is said, which is exactly what an adapter library needs when its whole point is working against whichever backend you picked. The cost is that a missing optional peer is silent by construction, so the failure surfaces as an import error at runtime rather than anything at install time. That is the trade, and it is why reading a library's peer list is how you find out what it expects you to bring.",
  },

  {
    slug: 'dep-unmet-peer-at-runtime',
    title: 'The install warned and exited zero',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      '`react-dom@19.2.8` declares `peerDependencies: { react: "^19.2.8" }`. A project pins `react` at `18.3.1` and installs with pnpm 11.5.0. The install prints one warning and exits 0:',
      '',
      code(
        'text',
        '[WARN] Issues with peer dependencies found. Run "pnpm peers check" to list them.'
      ),
      '',
      'The app then throws:',
      '',
      code('text', "TypeError: Cannot read properties of undefined (reading 'S')"),
      '',
      'Say what a peer dependency asks of the installer, and why an unmet one surfaces here rather than at install.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'the app',
            'the consumer',
            'the parent',
            'the host',
            'provide',
            'supply',
            'you install it',
            'does not install',
            "doesn't install",
            'will not install',
            'one copy',
            'single copy',
            'same copy',
            'same instance',
            'shared instance',
            'the same one',
          ],
          missingFeedback:
            'A peer is not a dependency it fetches for itself. Say who is expected to supply it, and why that matters.',
        },
        {
          synonyms: [
            'warn',
            'warning',
            'not an error',
            'not fatal',
            'does not fail',
            "doesn't fail",
            'still installs',
            'installs anyway',
            'exits 0',
            'exit code 0',
            'succeeds',
            'nothing enforces',
            'nothing checks',
            'no check',
            'not enforced',
            'only when the code runs',
          ],
          missingFeedback:
            'The install had everything it needed to spot the mismatch. Say what it did with it.',
        },
      ],
      hints: [
        'A peer is the one kind of dependency a package refuses to fetch for itself. Ask why.',
        "It is asking for the consumer's copy specifically, so that both sides hold the same instance.",
        'The range is checked and the result is a warning, so the install exits 0 and the mismatch waits for the first call.',
      ],
    },
    canonicalAnswer:
      'A peer dependency says the package needs something it will not install itself: the consuming app supplies it, so there is one copy and both sides hold the same instance. Nothing enforces the range. pnpm 11.5.0 prints a warning, exits 0, and links react-dom against react 18 anyway, so the mismatch surfaces the first time react-dom reaches for an internals object react 18 does not have.',
    solution: md(
      '- **What it asks**: that the consumer supply the package, so there is exactly one copy and both sides share the same instance. A regular dependency would get react-dom its own React and break the thing it was trying to guarantee.',
      '- **Why it is a runtime failure**: the range is checked at install and the result is a warning. `pnpm install` still exits 0.',
      '',
      code('bash', 'pnpm peers check   # prints the unmet peer, and exits 1')
    ),
    explanation:
      "The point of a peer is identity, not availability. `react-dom` needs the React instance the app rendered with, because hooks live in module state a second copy would not share, and no amount of depending on React itself can express that. What it buys in correctness it gives up in enforcement: pnpm 11.5.0 will auto-install a peer nobody declared, but a declared peer that misses the range is a warning and the install succeeds. `pnpm peers check` reports the same list and exits 1, which is the thing to put in CI, because the alternative is a `TypeError` naming a minified property in someone else's bundle.",
  },

  {
    slug: 'dep-react-in-a-published-library',
    title: "Invalid hook call in somebody else's app",
    category: 'dependencies',
    difficulty: 'hard',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You publish a component library. Its manifest says:',
      '',
      code('json', '"dependencies": {', '  "react": "^19.2.0"', '}'),
      '',
      'Its own tests pass. Consumers report `Invalid hook call`, and a `useContext` from your library returning the default value with a provider mounted directly above it.',
      '',
      "Say what the consumer's tree ended up containing, and name the two fields `react` belongs in instead."
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'two copies',
            'two react',
            'two reacts',
            'second copy',
            'duplicate',
            'its own copy',
            'two instances',
            'more than one',
            'twice',
            'nested copy',
            'separate react',
            'another react',
          ],
          missingFeedback:
            'The consumer already had React. Say what your `dependencies` entry added to their tree.',
        },
        {
          synonyms: [
            'peerdependencies',
            'peer dependencies',
            'peerdeps',
            'peer deps',
            'peer dependency',
          ],
          missingFeedback:
            'Name the field that says "the consumer supplies this", rather than fetching a copy of it.',
        },
        {
          synonyms: ['devdependencies', 'dev dependencies', 'devdeps', 'dev deps', 'devdependency'],
          missingFeedback:
            'A peer is not installed for you, so your own build and tests still need one. Which field gets it?',
        },
      ],
      hints: [
        "Your tests pass because your tree has one React in it. The consumer's does not.",
        'A library that lists React in `dependencies` is asking the installer for its own copy, and hooks are module state.',
        'It goes in `peerDependencies` so the consumer supplies it, and in `devDependencies` so you still have one to build against.',
      ],
    },
    canonicalAnswer:
      'The consumer ended up with two copies of React, theirs and the one your library asked for, so your components call hooks against a dispatcher nobody is rendering with and your contexts are created by a React their provider knows nothing about. React belongs in `peerDependencies`, so the consumer supplies it, and in `devDependencies`, so your own build and tests still have one.',
    solution: md(
      code(
        'json',
        '"peerDependencies": { "react": "^19.0.0" },',
        '"devDependencies": { "react": "^19.2.0" }'
      ),
      '',
      '- **What the consumer got**: a second React, nested under your package. Hooks called from your components register against a dispatcher no renderer is using, which is what `Invalid hook call` reports, and a context object created by one copy is a different object from the one their provider fills.',
      '- **Where it belongs**: `peerDependencies` for the copy the consumer supplies, `devDependencies` for the one you build and test against. Keep the peer range wide and the dev range whatever you develop on.'
    ),
    explanation:
      "A library that lists React in `dependencies` is telling the installer to fetch it one, and the installer obliges whenever the consumer's version does not satisfy your range. Two Reacts means two module-level hook dispatchers and two sets of context objects, and both failures read as bugs in your components rather than as a packaging mistake. The pair of fields is the whole idiom: the peer entry is the contract, and the dev entry is how you satisfy it locally without shipping it. Ship it as a dependency and every consumer pays, including the ones already on exactly the version you wanted.",
  },

  codeProblem({
    slug: 'dep-compare-versions',
    title: 'The release list that puts 1.9 after 1.10',
    category: 'dependencies',
    difficulty: 'easy',
    relevance: 'foundational',
    prompt: md(
      'A release picker sorts version strings and shows 1.9.0 as the newest, above 1.10.0.',
      '',
      'Write `compareVersions(a, b)`, returning `-1`, `0` or `1` so it can be handed straight to `sort`. Every input is three dot-separated integers with no prerelease on it.',
      '',
      code(
        'js',
        "compareVersions('1.10.0', '1.9.0'); // 1",
        "compareVersions('2.0.0', '2.0.0');  // 0"
      )
    ),
    starter: 'function compareVersions(a, b) {\n  \n}',
    tests: [
      {
        name: 'orders 1.10.0 above 1.9.0',
        expression: "compareVersions('1.10.0', '1.9.0')",
        expected: 1,
      },
      {
        name: 'reports equal versions as 0',
        expression: "compareVersions('2.0.0', '2.0.0')",
        expected: 0,
      },
      {
        name: 'compares the patch when major and minor match',
        expression: "compareVersions('1.2.3', '1.2.10')",
        expected: -1,
      },
      {
        name: 'takes the major first, even against a much larger minor',
        expression: "compareVersions('1.99.0', '2.0.0')",
        expected: -1,
      },
      {
        name: 'sorts a release list the way the page should show it',
        expression: "['1.10.0', '1.9.0', '1.2.3', '2.0.0', '1.10.2'].sort(compareVersions)",
        expected: ['1.2.3', '1.9.0', '1.10.0', '1.10.2', '2.0.0'],
      },
    ],
    reference: md(
      'function compareVersions(a, b) {',
      "  const left = a.split('.').map(Number);",
      "  const right = b.split('.').map(Number);",
      '  for (let i = 0; i < 3; i += 1) {',
      '    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;',
      '  }',
      '  return 0;',
      '}'
    ),
    hints: [
      'The bug is in what is being compared, not in the order of the comparison.',
      'String comparison goes character by character, so `1.10.0` loses to `1.9.0` at the third character.',
      'Split on the dot, convert to numbers, and return at the first component that differs.',
    ],
    explanation:
      "A version string sorts by code unit, so `'1.10.0' < '1.9.0'` is true and every list ordered that way is wrong somewhere in the middle. A version is three numbers, so compare them as numbers, most significant first, and stop at the first difference. `Array#sort` with no comparator is exactly this bug with nothing to blame, because its default is a string sort. Real code reaches for `semver.compare`; the shape is worth knowing because the same mistake turns up wherever a dotted or numbered string gets ordered, including migration filenames.",
  }),

  codeProblem({
    slug: 'dep-satisfies-caret',
    title: 'Write the caret rule',
    category: 'dependencies',
    difficulty: 'hard',
    relevance: 'foundational',
    prompt: md(
      'Write `satisfiesCaret(range, version)`. `range` is a caret range like `^1.2.3`, `version` is a plain version like `1.4.0`, and both are three dot-separated integers with no prerelease.',
      '',
      'The rule is one sentence: a caret accepts anything at or above the version written that does not change its left-most non-zero part.',
      '',
      code(
        'js',
        "satisfiesCaret('^1.2.3', '1.4.0'); // true",
        "satisfiesCaret('^0.2.3', '0.3.0'); // false"
      )
    ),
    starter: 'function satisfiesCaret(range, version) {\n  \n}',
    tests: [
      {
        name: 'accepts a minor bump above 1.0.0',
        expression: "satisfiesCaret('^1.2.3', '1.4.0')",
        expected: true,
      },
      {
        name: 'refuses the next major',
        expression: "satisfiesCaret('^1.2.3', '2.0.0')",
        expected: false,
      },
      {
        name: 'refuses anything below the version written',
        expression: "satisfiesCaret('^1.2.3', '1.2.2')",
        expected: false,
      },
      {
        name: 'accepts a patch bump below 1.0.0',
        expression: "satisfiesCaret('^0.2.3', '0.2.9')",
        expected: true,
      },
      {
        name: 'refuses a minor bump below 1.0.0',
        expression: "satisfiesCaret('^0.2.3', '0.3.0')",
        expected: false,
      },
      {
        name: 'pins the patch when both major and minor are 0',
        expression: "['0.0.3', '0.0.4'].map((v) => satisfiesCaret('^0.0.3', v))",
        expected: [true, false],
      },
      {
        name: 'always accepts the version written into the range',
        expression: "['^1.2.3', '^0.2.3', '^0.0.3'].every((r) => satisfiesCaret(r, r.slice(1)))",
        expected: true,
      },
    ],
    reference: md(
      'function satisfiesCaret(range, version) {',
      "  const floor = range.slice(1).split('.').map(Number);",
      "  const parts = version.split('.').map(Number);",
      '  const pin = floor.findIndex((part) => part !== 0);',
      '  const ceiling =',
      '    pin === -1',
      '      ? [0, 0, 1]',
      '      : floor.map((part, i) => (i < pin ? part : i === pin ? part + 1 : 0));',
      '  const cmp = (x, y) => {',
      '    for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;',
      '    return 0;',
      '  };',
      '  return cmp(parts, floor) >= 0 && cmp(parts, ceiling) < 0;',
      '}'
    ),
    hints: [
      'A caret is a floor and a ceiling. The floor is the easy half.',
      'The ceiling is decided by the position of the left-most non-zero part: bump that part by one and zero everything after it.',
      'For `^0.2.3` that position is the minor, giving `>=0.2.3 <0.3.0`; for `^0.0.3` it is the patch, giving `>=0.0.3 <0.0.4`.',
    ],
    explanation:
      'Finding the left-most non-zero part is the whole rule, and it is why `^1.2.3` covers a year of releases while `^0.2.3` covers a handful of patches. Hardcoding the ceiling as "next major" is the version of this everybody writes first, and it silently widens every 0.x range in the manifest to something the maintainer never promised. The reverse mistake is quieter and worse: treat 0.x as "pin everything" and a caret you meant as an upgrade path stops delivering patches. This implementation agrees with semver 7.8.5 on all 7200 range and version pairs it was checked against.',
  }),

  codeProblem({
    slug: 'dep-why-paths',
    title: 'Write pnpm why',
    category: 'dependencies',
    difficulty: 'medium',
    relevance: 'occasional',
    prompt: md(
      '`tree` is a resolved dependency graph: every key is a package at its resolved version, and its value is the ids it depends on.',
      '',
      'Write `whyPaths(tree, root, name)`, returning every path from `root` to any version of `name`, each path an array of ids from the root inwards. Return `[]` when nothing reaches it.',
      '',
      'The graph can contain a cycle, so no path may visit the same id twice.',
      '',
      code(
        'js',
        "whyPaths(tree, 'app@1.0.0', 'router');",
        "// [['app@1.0.0', 'server@2.1.0', 'router@3.0.1']]"
      )
    ),
    setup: md(
      '// A resolved graph, the shape a lockfile describes. Note glob at two',
      '// versions, and the chokidar/readdirp cycle.',
      'const tree = {',
      "  'app@1.0.0': ['bundler@4.2.0', 'server@2.1.0'],",
      "  'bundler@4.2.0': ['glob@10.4.5', 'chokidar@4.0.3'],",
      "  'server@2.1.0': ['router@3.0.1', 'glob@10.4.5'],",
      "  'router@3.0.1': ['glob@7.2.3'],",
      "  'chokidar@4.0.3': ['readdirp@4.0.2'],",
      "  'readdirp@4.0.2': ['chokidar@4.0.3', 'picomatch@4.0.2'],",
      "  'glob@10.4.5': [],",
      "  'glob@7.2.3': [],",
      "  'picomatch@4.0.2': [],",
      '};'
    ),
    starter: 'function whyPaths(tree, root, name) {\n  \n}',
    tests: [
      {
        name: 'finds every path to glob, at both resolved versions',
        expression: "whyPaths(tree, 'app@1.0.0', 'glob').map((path) => path.join(' > ')).sort()",
        expected: [
          'app@1.0.0 > bundler@4.2.0 > glob@10.4.5',
          'app@1.0.0 > server@2.1.0 > glob@10.4.5',
          'app@1.0.0 > server@2.1.0 > router@3.0.1 > glob@7.2.3',
        ],
      },
      {
        name: 'returns each path as an array of ids, root first',
        expression: "whyPaths(tree, 'app@1.0.0', 'router')",
        expected: [['app@1.0.0', 'server@2.1.0', 'router@3.0.1']],
      },
      {
        name: 'terminates on the cycle and still reaches what is past it',
        expression: "whyPaths(tree, 'app@1.0.0', 'picomatch')",
        expected: [
          ['app@1.0.0', 'bundler@4.2.0', 'chokidar@4.0.3', 'readdirp@4.0.2', 'picomatch@4.0.2'],
        ],
      },
      {
        name: 'returns nothing for a package that is not in the tree',
        expression: "whyPaths(tree, 'app@1.0.0', 'lodash')",
        expected: [],
      },
    ],
    reference: md(
      'function whyPaths(tree, root, name) {',
      '  const found = [];',
      '  const walk = (id, path) => {',
      '    if (path.includes(id)) return;',
      '    const next = [...path, id];',
      "    if (id.slice(0, id.lastIndexOf('@')) === name) {",
      '      found.push(next);',
      '      return;',
      '    }',
      '    for (const child of tree[id] ?? []) walk(child, next);',
      '  };',
      '  walk(root, []);',
      '  return found;',
      '}'
    ),
    hints: [
      'Nothing in the graph records who depends on you, so this is a search from the root rather than a lookup.',
      'Carry the path down with the recursion, and push a copy of it whenever the current id is the package you want.',
      'Guard against the cycle with the path itself, not with a set shared across the whole walk.',
    ],
    explanation:
      'This is what `pnpm why` prints, and the reason it is a search is that dependency edges point one way: nothing records who depends on you, so answering "who pulled this in" means walking every route from the root. Two routes reaching the same package is the ordinary case, and two routes reaching different versions of it is the thing worth seeing, because it means the fix is more than one upgrade. The cycle guard is not defensive coding, since real graphs contain cycles and `pnpm why` prints `[circular]` where this returns. Track the ids on the current path rather than a set shared across the walk: a package reached twice by different routes has two answers, and a shared set would throw the second one away.',
  }),
];
