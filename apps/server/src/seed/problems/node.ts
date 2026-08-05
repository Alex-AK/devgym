import { code, codeProblem, md, type ProblemDraft } from './types';

export const nodeProblems: ProblemDraft[] = [
  {
    slug: 'node-nexttick-before-promise',
    title: 'The queue that jumps the promises',
    category: 'node',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'In what order does this log, on every request? Answer with the four words.',
      '',
      code(
        'js',
        "server.on('request', () => {",
        "  setTimeout(() => console.log('timeout'));",
        "  Promise.resolve().then(() => console.log('promise'));",
        "  process.nextTick(() => console.log('tick'));",
        "  console.log('sync');",
        '});'
      )
    ),
    graderConfig: {
      accept: [
        'sync tick promise timeout',
        'sync, tick, promise, timeout',
        'sync -> tick -> promise -> timeout',
      ],
      acceptPatterns: [
        '\\bsync\\b[\\s\\S]{0,12}?\\btick\\b[\\s\\S]{0,12}?\\bpromise\\b[\\s\\S]{0,12}?\\btimeout\\b',
      ],
      nearMisses: {
        'sync promise tick timeout':
          '`process.nextTick` has a queue of its own, and it drains before the promise callbacks rather than after.',
        'sync tick timeout promise':
          'Both of those queues are emptied before the loop moves on to the phase where a timer can fire.',
        'tick sync promise timeout':
          'Nothing scheduled runs until the synchronous script has finished.',
      },
      closeSubstrings: {
        'promise tick':
          '`process.nextTick` has a queue of its own, and it drains before the promise callbacks rather than after.',
        'promise, tick':
          '`process.nextTick` has a queue of its own, and it drains before the promise callbacks rather than after.',
        'timeout promise':
          'Both of those queues are emptied before the loop moves on to the phase where a timer can fire.',
        'timeout, promise':
          'Both of those queues are emptied before the loop moves on to the phase where a timer can fire.',
      },
      hints: [
        'Everything scheduled here waits for the rest of the script first.',
        'Node drains two queues before the loop advances: `process.nextTick` callbacks and promise callbacks. They are not the same queue.',
        'The nextTick queue goes first, then promises, and a timer is a phase of the loop rather than a microtask.',
      ],
    },
    canonicalAnswer: 'sync tick promise timeout',
    solution: md(
      '`sync tick promise timeout`',
      '',
      code(
        'js',
        "console.log('sync');       // 1: the handler runs to completion",
        'process.nextTick(...);     // 2: the nextTick queue drains first',
        'Promise.resolve().then();  // 3: then the promise microtasks',
        'setTimeout(...);           // 4: then the loop reaches the timers phase'
      )
    ),
    explanation:
      "`process.nextTick` is not part of the event loop at all. Its queue is drained the moment the current operation finishes, ahead of the promise microtask queue, and both are emptied before the loop advances to a phase where a timer can fire. That ordering is what makes `nextTick` the wrong tool for 'run this soon': a nextTick callback that queues another nextTick callback keeps the loop from ever reaching the phase that reads sockets. Use `queueMicrotask` when you want promise ordering and `setImmediate` when you want the next turn of the loop. The snippet sits inside a handler for a reason: run those same four lines at the top level of an ES module and the promise logs before the tick, because module evaluation is itself a promise job and the microtask drain is already running.",
  },

  {
    slug: 'node-esm-flips-tick-order',
    title: 'The same four lines, a different order',
    category: 'node',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A file is renamed from `.cjs` to `.mjs` during a move to ES modules. Nothing else changes:',
      '',
      code(
        'js',
        "setTimeout(() => console.log('timeout'));",
        "Promise.resolve().then(() => console.log('promise'));",
        "process.nextTick(() => console.log('tick'));",
        "console.log('sync');"
      ),
      '',
      'On Node 24.16.0 the CommonJS file logs `sync tick promise timeout`. The ES module logs `sync promise tick timeout`.',
      '',
      'Say why the two middle lines swapped, and what that should tell you about relying on the order.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'microtask',
            'microtasks',
            'microtask queue',
            'already draining',
            'already in',
            'part of the microtask',
            'evaluated as a microtask',
            'module evaluation',
            'esm is a microtask',
            'inside the drain',
          ],
          missingFeedback:
            'An ES module is not evaluated the way a CommonJS file is. Ask what queue the evaluation itself is running in.',
        },
        {
          synonyms: [
            'do not rely',
            'not rely',
            'do not depend',
            'not depend',
            'should not depend',
            'rewrite',
            'rewritten',
            'not guaranteed',
            'fragile',
            'avoid depending',
            'stop depending',
          ],
          missingFeedback:
            'The order changed under a rename. Say what that means for code whose correctness rests on it.',
        },
      ],
      hints: [
        'Both queues still drain the same way. What changed is where the four lines are running from.',
        'ESM evaluation is itself processed as part of the microtask queue, so a `.then` scheduled there is already in the queue being drained.',
        'A `nextTick` scheduled during module evaluation lands behind the promise callbacks rather than ahead of them.',
      ],
    },
    canonicalAnswer:
      'An ES module is evaluated as part of the microtask queue, so the promise callback scheduled during evaluation is already in the queue Node is draining and runs before the nextTick queue gets its turn. In CommonJS the module is an ordinary job, so the nextTick queue drains first. Both are correct, which is the point: code should not depend on tick-against-promise order, and anything that does is code to rewrite rather than code to port.',
    solution: md(
      'Node documents it: "in CJS modules `process.nextTick()` callbacks are always run before `queueMicrotask()` ones. However since ESM modules are processed already as part of the microtask queue, there `queueMicrotask()` callbacks are always executed before `process.nextTick()` ones."',
      '',
      'Module evaluation is the only place this happens. Inside a timer or an I/O callback both file types log `tick promise`.'
    ),
    explanation:
      'Nothing about the two queues changed: the nextTick queue still drains before the microtask queue. What changed is that ESM evaluation is itself running inside a microtask drain, so a `.then` registered there joins the drain already in progress while the `nextTick` waits for the next one. It is the sharpest available demonstration that this ordering is a property of where your code was called from rather than a rule about the two functions, which is why the useful lesson is not the new order but that a rename could change it at all. `process.nextTick` has been legacy since Node 22.7.0 and 20.18.0 anyway, with `queueMicrotask()` recommended in its place.',
  },

  {
    slug: 'node-flowing-mode-ignores-async',
    title: 'Fifty chunks, all at once',
    category: 'node',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'An import endpoint writes each chunk to a slow downstream service:',
      '',
      code('js', "readable.on('data', async (chunk) => {", '  await sendDownstream(chunk);', '});'),
      '',
      'The handler is `async` and it is awaited inside, so it looks like one chunk at a time. Measured against a 50-chunk source on Node 24.16.0, the peak number of handlers running at once was 50. Rewritten as `for await (const chunk of readable)`, the peak was 1.',
      '',
      'Say why the `async` handler bought nothing, and what makes the second version wait.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'flowing',
            'flowing mode',
            'does not wait',
            'not wait',
            'ignores the return',
            'ignores what it returns',
            'return value',
            'promise is ignored',
            'nothing awaits',
            'emits regardless',
            'pushes',
            'keeps emitting',
          ],
          missingFeedback: 'The handler returns a promise. Ask what the stream does with it.',
        },
        {
          synonyms: [
            'for await',
            'pulls',
            'pull',
            'asks for the next',
            'waits for the body',
            'awaits the body',
            'one at a time',
            'backpressure',
            'paused',
            'iterator',
          ],
          missingFeedback:
            'Name what the `for await` loop does differently with each chunk before it takes the next one.',
        },
      ],
      hints: [
        'Attaching a `data` listener switches the readable into flowing mode.',
        'A flowing readable emits the next chunk when it has one, and nothing looks at what your handler returned.',
        '`for await` pulls: it does not ask for the next chunk until its own body has finished.',
      ],
    },
    canonicalAnswer:
      'Attaching a data handler puts the readable into flowing mode, where it emits chunks as fast as it can read them and ignores the promise the async handler returns, so all 50 start at once and the source sets the concurrency. for await consumes the stream as an async iterator and does not request the next chunk until its body has finished, so the loop applies real backpressure.',
    solution: md(
      code('js', 'for await (const chunk of readable) {', '  await sendDownstream(chunk);', '}'),
      '',
      'Or `pipeline` into a `Writable` whose callback you call when the send resolves.'
    ),
    explanation:
      'Flowing mode is push, and nothing in the push path has anywhere to put a promise, so marking the handler `async` changes when your own code finishes and nothing about when the next chunk arrives. The concurrency you end up with is the size of the source, which is why this passes every test with a small fixture and takes the downstream service down on a real file. `for await` inverts it into pull: the loop asks for a chunk, runs its body to completion, and only then asks for another. This is the reading-side mirror of ignoring what `write()` returns, and it is harder to spot because nothing returns `false` to tell you.',
  },

  {
    slug: 'node-interface-is-not-a-di-token',
    title: 'The dependency the container could not name',
    category: 'node',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A service is written against an interface so it can be faked in tests:',
      '',
      code(
        'ts',
        'export interface PaymentGateway {',
        '  charge(cents: number): Promise<string>;',
        '}',
        '',
        '@Injectable()',
        'export class CheckoutService {',
        '  constructor(private readonly gateway: PaymentGateway) {}',
        '}'
      ),
      '',
      'It compiles. Nest fails at startup with "Nest can\'t resolve dependencies of the CheckoutService (?)".',
      '',
      'Say why the container cannot find it, and what to register and inject instead.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'erased',
            'erasure',
            'compiled away',
            'does not exist at runtime',
            'no runtime',
            'not a value',
            'only a type',
            'types are gone',
            'nothing to look up',
            'no token',
          ],
          missingFeedback:
            'The container reads the constructor parameter types at runtime. Ask what is left of an interface by then.',
        },
        {
          synonyms: [
            'string',
            'symbol',
            'token',
            'inject',
            '@inject',
            'custom provider',
            'provide',
            'abstract class',
            'class instead',
          ],
          missingFeedback:
            'Something that survives compilation has to stand in for the interface. Name it, and how the constructor asks for it.',
        },
      ],
      hints: [
        'Nest injects by looking each constructor parameter type up as a token.',
        'TypeScript interfaces are erased at compile time, so there is no value left for the container to use as a key.',
        'Register the provider under a string or `Symbol` token and ask for it with `@Inject(TOKEN)`.',
      ],
    },
    canonicalAnswer:
      'An interface is erased at compile time, so nothing about it survives into the emitted metadata and the container has no token to look up, which is what the (?) in the message is. Register the implementation under a string or Symbol token with a custom provider, and ask for it with @Inject(PAYMENT_GATEWAY) in the constructor. An abstract class works too, because a class is still a value at runtime.',
    solution: md(
      code(
        'ts',
        "export const PAYMENT_GATEWAY = Symbol('PaymentGateway');",
        '',
        '// module',
        'providers: [{ provide: PAYMENT_GATEWAY, useClass: StripeGateway }]',
        '',
        '// consumer',
        'constructor(@Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway) {}'
      ),
      '',
      'The interface still types the property. It just is not what the container is looking up.'
    ),
    explanation:
      "Nest injects by reading `design:paramtypes`, the array of constructor parameter classes the compiler emits, and looking each entry up among the module's providers. An interface leaves nothing in that array because it never existed at runtime, so the container reports a parameter it cannot name and prints `(?)` where the token would go. The fix separates the two jobs the type was doing: a `Symbol` or string token identifies the provider, and the interface goes on carrying the shape for the type checker. This is the same erasure that makes the whole DI mechanism depend on `emitDecoratorMetadata` in the first place, so a build that drops that metadata produces a related but quieter failure, where the parameter is simply `undefined`.",
  },

  {
    slug: 'node-await-does-not-yield',
    title: 'It is async and it still blocks',
    category: 'node',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'An endpoint parses a 30 MB CSV. Someone moved the parse into an `async` function and awaited it, and every other request in the process still waits about 400ms for it:',
      '',
      code(
        'js',
        'async function parseRows(text) {',
        '  const rows = [];',
        "  for (const line of text.split('\\n')) rows.push(line.split(','));",
        '  return rows;',
        '}',
        '',
        'const rows = await parseRows(body);'
      ),
      '',
      'Say what `async` changed about where that work runs, and name one thing that would actually free the loop.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'nothing',
            'same thread',
            'one thread',
            'still synchronous',
            'still runs synchronously',
            'still blocks',
            'runs to completion',
            'does not move',
            "doesn't move",
            'did not move',
            "didn't move",
            'no i/o',
            'nothing to await',
            'never suspends',
            'does not suspend',
            'only the return value',
            'wraps the result',
            'returns a promise',
          ],
          missingFeedback:
            'Where does that loop over 30 MB of lines actually run once the function is marked `async`?',
        },
        {
          synonyms: [
            'worker',
            'child process',
            'separate process',
            'chunk',
            'batch',
            'setimmediate',
            'set immediate',
            'break it up',
            'break the work',
            'yield to the loop',
            'stream',
          ],
          missingFeedback:
            'Name one thing that would take the CPU work off this thread, or hand the loop back between pieces of it.',
        },
      ],
      hints: [
        'There is no I/O in that function. Ask what the `await` is waiting for.',
        "`async` changes how the result is delivered, not which thread computes it: the body runs on the caller's stack until it hits an `await` on something that actually suspends.",
        'The work has to move to a worker thread, or be broken into chunks with the loop given a turn between them.',
      ],
    },
    canonicalAnswer:
      '`async` changed nothing about where the work runs. There is nothing to await inside it, so the body runs to completion on the same thread and only the return value is wrapped in a promise. To free the loop the work has to move to a worker thread, or be broken into chunks with a `setImmediate` between them so sockets get read in the gaps.',
    solution: md(
      '- **What `async` changed**: only the shape of the return value. With nothing inside to suspend on, the body runs synchronously on the same thread, exactly as it did before.',
      '- **What would free the loop**: move the parse to a worker thread or a child process, or keep it here and yield deliberately between chunks with `setImmediate`.'
    ),
    explanation:
      '`async` is about how a result is delivered, not about scheduling. The body runs on the caller\'s stack until it reaches an `await` on something that actually suspends, and here there is none, so 30 MB of string splitting happens in one uninterrupted go. Awaiting an already-resolved value does not help either: that is a microtask boundary, not a turn of the loop, so no socket gets read. `fs.readFile` and `zlib.gzip` avoid this because their work happens in C++ on the libuv threadpool rather than in JavaScript, which is the distinction worth carrying: "async" in a Node API means the work left the thread, and `async` on your own function means no such thing.',
  },

  {
    slug: 'node-content-length-bytes',
    title: 'The response that stops mid-word',
    category: 'node',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A handler sets the header itself:',
      '',
      code(
        'js',
        "res.setHeader('Content-Type', 'text/plain; charset=utf-8');",
        "res.setHeader('Content-Length', String(body.length));",
        'res.end(body);'
      ),
      '',
      "Pure ASCII bodies are fine. Any body with an accent or an emoji in it arrives truncated: `'café ☕'` reaches the client as `'café '`.",
      '',
      'What should `Content-Length` be computed from?'
    ),
    graderConfig: {
      accept: [
        'buffer.bytelength(body)',
        'buffer.bytelength',
        'bytelength',
        'buffer.from(body).length',
      ],
      acceptPatterns: [
        'Buffer\\s*\\.\\s*byteLength',
        'Buffer\\s*\\.\\s*from\\([^)]*\\)\\s*\\.\\s*length',
        'TextEncoder',
      ],
      nearMisses: {
        'body.length':
          "`String#length` counts UTF-16 code units, not bytes. `'café'` is 4 of those and 5 bytes in UTF-8.",
        'the length of the body':
          'In which unit? The header is a byte count and the string is measured in UTF-16 code units.',
      },
      hints: [
        'The header is a promise about the response in bytes. `body.length` counts something else.',
        "`String#length` is UTF-16 code units: `'café'` is 4 of those and 5 bytes in UTF-8.",
        'Ask for the byte count of the encoded body: `Buffer.byteLength(body)`.',
      ],
    },
    canonicalAnswer: 'Buffer.byteLength(body)',
    solution: code('js', "res.setHeader('Content-Length', Buffer.byteLength(body));"),
    explanation:
      "`Content-Length` is a byte count and `String#length` is a count of UTF-16 code units. The two agree for ASCII and nowhere else, which is why this ships fine and breaks on the first name with an accent in it. The client stops reading at the byte count it was promised, so the tail is cut silently rather than erroring: `'café ☕'` is 9 bytes and 6 code units, so the client keeps 6 bytes and shows `'café '`. `Buffer.byteLength(str)` gives the real count for an encoding, and it is what Node computes for you when you leave the header alone, so setting it by hand should have a reason behind it.",
  },

  {
    slug: 'node-nexttick-starves-the-loop',
    title: 'The drainer that never lets go',
    category: 'node',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A worker drains a job queue by scheduling its own next iteration:',
      '',
      code(
        'js',
        'function drainNext() {',
        '  const job = queue.shift();',
        '  if (!job) return;',
        '  handle(job);',
        '  process.nextTick(drainNext);',
        '}'
      ),
      '',
      'Each job takes about a millisecond. While the queue has work in it, the HTTP server in the same process answers nothing at all and none of its timers fire.',
      '',
      'Say why the loop never gets back to the sockets, and name the scheduling call that fixes it.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'drain',
            'empt',
            'exhaust',
            'before the loop',
            'before the event loop',
            'never returns',
            'never gets back',
            'never reaches',
            'same turn',
            'not a phase',
            'between phases',
            'starv',
            'never yields',
            'does not yield',
            "doesn't yield",
          ],
          missingFeedback:
            'Say what Node does with the nextTick queue before the loop is allowed to continue: how much of it runs?',
        },
        {
          synonyms: ['setimmediate', 'set immediate'],
          missingFeedback:
            'Name the call that schedules the next iteration for the next turn of the loop instead of the end of this one.',
        },
      ],
      hints: [
        'No single job is slow. Ask when the loop is allowed to move on.',
        'The nextTick queue is drained completely before the loop continues, and every callback puts another entry in it.',
        '`setImmediate` schedules for the next turn of the loop instead, so sockets and timers get served between jobs.',
      ],
    },
    canonicalAnswer:
      'The nextTick queue is drained completely before the event loop continues, so each callback queues another one and the loop never gets back to the phase that reads sockets. Schedule the next iteration with `setImmediate` instead: it runs in the check phase, one iteration per turn of the loop, so I/O and timers are served between jobs.',
    solution: md(
      '- **Why it starves**: the nextTick queue is drained to exhaustion before the loop advances, and every iteration adds another entry to it. The loop never reaches the phase where sockets and timers are handled.',
      '- **The fix**: `process.nextTick(drainNext)` becomes `setImmediate(drainNext)`, which costs one turn of the loop per job and leaves room for everything else.'
    ),
    explanation:
      'This process is not busy in any way a CPU profile makes obvious: it spends its time in a queue Node empties between operations, before the loop is allowed to move on. A callback that adds to that queue while it is being drained keeps the draining going forever, so every socket sits unread while the work looks like it is progressing normally. `setImmediate` is the version that yields, because the check phase it runs in is a phase of the loop rather than something ahead of it. A recursive promise chain has the same shape for the same reason, since promise callbacks are microtasks and microtasks are drained the same way.',
  },

  {
    slug: 'node-write-returned-false',
    title: 'The export that eats the heap',
    category: 'node',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'An endpoint streams a large export to the client a row at a time and never looks at what `write` returns:',
      '',
      code('js', 'for (const row of rows) res.write(toCsvLine(row));', 'res.end();'),
      '',
      'Against a slow client the process grows by gigabytes and is OOM-killed, and nothing is retained after the loop.',
      '',
      'Say what `res.write(...)` returning `false` was telling you, and what ignoring it costs.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'highwatermark',
            'high water mark',
            'high-water mark',
            'internal buffer',
            'buffer is full',
            'is full',
            'slower',
            'cannot keep up',
            "can't keep up",
            'not keeping up',
            'stop writing',
            'back off',
            'drain',
            'pause',
          ],
          missingFeedback:
            'What is `false` a statement about? Not the write, which succeeded. Say what it says about the stream.',
        },
        {
          synonyms: [
            'memory',
            'heap',
            'rss',
            'unbounded',
            'without bound',
            'grows',
            'queues up',
            'queue up',
            'buffers everything',
            'out of memory',
            'oom',
          ],
          missingFeedback: 'Nothing is dropped when you ignore it, so where does the export go?',
        },
      ],
      hints: [
        'Nothing is lost when `write` returns `false`. The question is where the bytes are.',
        "They are queued in the stream's internal buffer, which is past its `highWaterMark` because the client is not taking them fast enough.",
        'It is a request to stop until the `drain` event. Ignoring it queues the whole export in memory instead of on the network.',
      ],
    },
    canonicalAnswer:
      "`false` means the chunk was accepted but is sitting in the stream's internal buffer rather than on the socket, because that buffer is past its highWaterMark and the client cannot keep up. It is a request to stop writing until the `drain` event. Ignoring it costs memory: nothing is dropped, so the loop keeps queueing rows as fast as it can produce them and the heap grows to hold the whole export.",
    solution: md(
      "- **What `false` means**: the chunk was accepted and queued in the stream's internal buffer rather than written out, because the buffer is past its `highWaterMark`. Stop writing and wait for `drain`.",
      '- **What ignoring it costs**: nothing is dropped, so the producer keeps queueing. Memory grows to hold everything the slow consumer has not taken yet.'
    ),
    explanation:
      'Backpressure is the only thing tying the speed of a producer to the speed of a consumer, and this return value is the whole signal. Nothing enforces it: the write succeeds, the data is never lost, and the cost is paid in memory rather than in an error, which is why the bug passes every test against a fast local client and fails against a phone on a train. The loop above has a second problem of the same kind, since it never awaits anything, so the stream gets no turn of the loop in which to flush. `pipeline` handles both for you, and that is the real argument for using it over a hand-written loop.',
  },

  {
    slug: 'node-pipeline-over-pipe',
    title: 'The upload that left the handle open',
    category: 'node',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'An upload handler writes the request body to disk:',
      '',
      code('js', 'req.pipe(zlib.createGzip()).pipe(fs.createWriteStream(path));'),
      '',
      'The disk fills up. The write stream emits `error`, nothing is listening for it, and the process exits. The request socket and the half-written file are left exactly as they were.',
      '',
      'Say what `pipe` does with an error from a stream in the chain, and what `pipeline` does differently.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'does not forward',
            "doesn't forward",
            'not forwarded',
            'does not propagate',
            "doesn't propagate",
            'not propagated',
            'does not pass',
            'nothing',
            'ignores',
            'own handler',
            'own error handler',
            'each stream',
            'every stream',
            'per stream',
            'unhandled',
          ],
          missingFeedback:
            'What does `pipe` do with an error raised by another stream in the chain: pass it along, or nothing at all?',
        },
        {
          synonyms: [
            'destroy',
            'cleans up',
            'clean up',
            'cleanup',
            'closes them',
            'closes the',
            'tears down',
            'one callback',
            'single callback',
            'one place',
            'one error handler',
          ],
          missingFeedback:
            'Say what `pipeline` does with the other streams once one of them fails.',
        },
      ],
      hints: [
        'The `error` event went somewhere. Ask which streams heard about it.',
        '`pipe` connects data, not errors: the source is never told the destination failed, and keeps what it had open.',
        '`pipeline` gives the whole chain one error callback and destroys every stream in it when any one fails.',
      ],
    },
    canonicalAnswer:
      '`pipe` does not forward errors at all. An error reaches only the stream that raised it, so every stream in the chain needs its own `error` handler, and an unhandled `error` event takes the process down. `pipeline` forwards the failure to a single callback and destroys every stream in the chain, so the socket and the file handle are closed instead of left open.',
    solution: md(
      '- **What `pipe` does**: nothing. Errors are not forwarded in either direction, so each of the three streams needs its own `error` listener, and the one that has none exits the process.',
      '- **What `pipeline` does**: one callback for the whole chain, and every stream destroyed when any of them fails or the client hangs up.',
      '',
      code(
        'js',
        "import { pipeline } from 'node:stream/promises';",
        '',
        'await pipeline(req, zlib.createGzip(), fs.createWriteStream(path));'
      )
    ),
    explanation:
      'A `.pipe()` chain wires up data and end-of-stream and stops there, which is why three pipes are three streams each needing an `error` listener, and why the one you forget is a process exit rather than a caught failure. It also has no notion of cleanup: the source keeps reading, the destination stays open, and a leaked file descriptor per failed upload shows up in production long before anyone reads this line. `pipeline` exists for exactly that, with a promise form in `node:stream/promises`, and it destroys the whole chain on failure including the case that actually happens most, a client that hangs up mid-upload.',
  },

  {
    slug: 'node-chunk-splits-a-character',
    title: 'Two question marks in the middle of a name',
    category: 'node',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'A worker reads a UTF-8 file in chunks and decodes each one as it arrives:',
      '',
      code('js', "stream.on('data', (chunk) => {", "  handleText(chunk.toString('utf8'));", '});'),
      '',
      'Almost every line is fine. Occasionally a name arrives as `Zo` followed by two replacement characters, and changing the chunk size moves the problem to a different line.',
      '',
      'Name what to decode the chunks with instead.'
    ),
    graderConfig: {
      accept: [
        'stringdecoder',
        'string_decoder',
        'new stringdecoder()',
        "new stringdecoder('utf8')",
        'setencoding',
        "setencoding('utf8')",
        "stream.setencoding('utf8')",
      ],
      acceptPatterns: [
        'string\\s*_?\\s*decoder',
        'setEncoding',
        'TextDecoder[\\s\\S]*stream\\s*:\\s*true',
      ],
      closeSubstrings: {
        concat:
          'That works, and it holds the whole file in memory, which is what reading it in chunks was avoiding. There is a decoder that keeps only the incomplete bytes.',
        textdecoder:
          'Only with `{ stream: true }`. A plain `decode(chunk)` per chunk has exactly the same bug.',
        latin1:
          'That stops the replacement characters by decoding every byte as its own character, so `ë` comes out as two wrong ones instead.',
      },
      hints: [
        'The chunk boundary is a byte boundary. It knows nothing about where a character ends.',
        'A character outside ASCII is two to four bytes in UTF-8, and a chunk can end in the middle of one, so each half decodes to a replacement character.',
        "You need a decoder that holds incomplete bytes back for the next chunk: `StringDecoder`, or `stream.setEncoding('utf8')`, which uses one internally.",
      ],
    },
    canonicalAnswer: 'StringDecoder',
    solution: md(
      code(
        'js',
        "import { StringDecoder } from 'node:string_decoder';",
        '',
        "const decoder = new StringDecoder('utf8');",
        "stream.on('data', (chunk) => handleText(decoder.write(chunk)));",
        "stream.on('end', () => handleText(decoder.end()));"
      ),
      '',
      "Or `stream.setEncoding('utf8')`, which puts a `StringDecoder` in front of the `data` events for you."
    ),
    explanation:
      "A `Buffer` holds bytes, and a chunk ends wherever the read happened to stop, so a character that takes more than one byte in UTF-8 can be split across two of them. `toString` decodes each incomplete sequence to U+FFFD, which is the pair of replacement characters: `'Zoë'` is four bytes, and a chunk ending after three takes half the `ë` with it. `StringDecoder` holds the trailing incomplete bytes back and prepends them to the next chunk, which is exactly what `setEncoding` does for you. The same trap exists on `Response.body` in the browser, and it is what `TextDecoder`'s `{ stream: true }` option is for.",
  },

  {
    slug: 'node-worker-vs-child-process',
    title: 'Three jobs, one process',
    category: 'node',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'explain',
    prompt: md(
      'One service does three things:',
      '',
      '- resizes uploaded images with a pure-JS library, about 300ms of CPU each',
      '- runs `ffmpeg` over a video file',
      '- fetches 40 URLs and merges the responses',
      '',
      'Say which one belongs on a worker thread, which belongs in a child process, and which needs neither. One line each.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: ['worker'],
          missingFeedback:
            'Which of the three is JavaScript burning CPU on the same thread that serves requests, and what runs JavaScript on another thread?',
        },
        {
          synonyms: ['child process', 'child_process', 'spawn', 'subprocess', 'separate process'],
          missingFeedback:
            'One of these is not JavaScript at all. What runs a program that is not your process?',
        },
        {
          synonyms: [
            'neither',
            'nothing',
            'no extra',
            'already',
            'i/o',
            'io bound',
            'io-bound',
            'non-blocking',
            'promise.all',
            'as is',
            'are fine',
            'is fine',
            'leave it',
          ],
          missingFeedback:
            'One of the three costs the event loop nothing while it waits. Which, and what does it need?',
        },
      ],
      hints: [
        'Two of the three are fine on one thread, and only one of them is fine for the reason you might expect.',
        'A worker thread runs JavaScript on another thread in the same process. A child process runs a program.',
        'Waiting on the network never occupied the thread, so concurrency there is `Promise.all` and nothing else.',
      ],
    },
    canonicalAnswer:
      'The image resize goes on a worker thread: it is JavaScript burning CPU, and a worker runs it on another thread in the same process so the event loop keeps serving requests. `ffmpeg` is a separate program, so it goes in a child process with `spawn`, which also contains a crash or a hang. The 40 fetches need neither, because they are I/O and never occupied the thread; `Promise.all` is the whole answer.',
    solution: md(
      '- **Image resize**: worker thread. CPU-bound JavaScript is the case `worker_threads` exists for. It gets its own thread in the same process, and you pass data to it as a message.',
      '- **`ffmpeg`**: child process, `spawn` with the output streamed. It is not your JavaScript, and a crash stays in the child.',
      '- **40 fetches**: neither. Network waits cost the loop nothing, so `Promise.all` over the 40 already runs them concurrently.'
    ),
    explanation:
      'What decides it is what the work actually is. CPU-bound JavaScript is the only case a worker thread helps: it gets its own thread and its own V8 heap in the same process, and the loop stays free for requests. A child process is for running something that is not your JavaScript, plus the isolation that comes with it, since a segfault in `ffmpeg` takes the child down instead of the service. I/O needs neither, because the loop handed the socket to the kernel and moved on, which is why 40 concurrent fetches were never a threading question. The failure worth naming is a worker per request: starting one here took about 12ms and a fresh heap each time, so a small pool that outlives the request is the shape that pays.',
  },

  {
    slug: 'node-immediate-before-timeout-in-io',
    title: 'Which one fires first inside the callback',
    category: 'node',
    difficulty: 'hard',
    relevance: 'foundational',
    type: 'short-text',
    prompt: md(
      'Both of these are scheduled from inside an `fs.readFile` callback:',
      '',
      code(
        'js',
        'fs.readFile(path, () => {',
        "  setTimeout(() => console.log('timeout'), 0);",
        "  setImmediate(() => console.log('immediate'));",
        '});'
      ),
      '',
      'Which one logs first? Name it.'
    ),
    graderConfig: {
      accept: [
        'setimmediate',
        'setimmediate()',
        'immediate',
        'the setimmediate callback',
        'the immediate',
      ],
      acceptPatterns: ['\\bset\\s*immediate\\b'],
      nearMisses: {
        settimeout:
          'The timers phase does come first in a turn of the loop, but this callback is already running in the poll phase, so check is the next phase reached.',
        timeout:
          'The timers phase does come first in a turn of the loop, but this callback is already running in the poll phase, so check is the next phase reached.',
        'it depends':
          'Not here. That is the answer when both are scheduled from the main module, where the order is not guaranteed.',
        nondeterministic:
          'That holds at the top of the main module. Inside an I/O callback the order is fixed.',
      },
      hints: [
        'The callback is already running inside one of the phases. Ask which phase comes next.',
        'Timers are checked at the top of a turn; `setImmediate` runs in the check phase, right after the poll phase where I/O callbacks run.',
        'From inside an I/O callback the loop reaches check before it comes back round to timers.',
      ],
    },
    canonicalAnswer: 'setImmediate',
    solution: md(
      '`setImmediate`, and inside an I/O callback that is guaranteed.',
      '',
      'Scheduled from the main module instead, the same two are not ordered: which one wins depends on how long process startup took relative to the timer, and Node documents it as non-deterministic.'
    ),
    explanation:
      'An I/O callback runs in the poll phase, and the phase straight after poll is check, which is where `setImmediate` callbacks are held. A timer cannot fire until the loop comes back round to the timers phase at the top of the next turn, so from inside an I/O callback the immediate always wins, 200 runs out of 200 here. The practical rule falls out of that: `setImmediate` is how you say "after this I/O work, before any timer", and `setTimeout(fn, 0)` never means that, even where it happens to behave that way today.',
  },

  codeProblem({
    slug: 'node-backpressure-drain-loop',
    title: 'Write the loop that waits',
    category: 'node',
    difficulty: 'hard',
    relevance: 'occasional',
    prompt: md(
      "A `sink` behaves like a writable stream. `sink.write(chunk)` returns `false` when its buffer is full, and after a write that returned `false` it emits `drain` once it has flushed. Subscribe with `sink.once('drain', callback)`.",
      '',
      'Write `writeAll(sink, chunks)`, which writes every chunk in order and resolves once the last one is written, without ever writing again while the sink is full.',
      '',
      code(
        'js',
        'const sink = createSink(2); // full after 2 unflushed chunks',
        "await writeAll(sink, ['a', 'b', 'c']);",
        "sink.written; // ['a', 'b', 'c']"
      ),
      '',
      '`createSink` is a stand-in written for this exercise, since the grader has no Node streams in it. It exposes `write`, `once`, `written` and `peakQueued`.'
    ),
    setup: md(
      '// A stand-in for a writable stream: it takes chunks, reports when its buffer',
      '// is full, and emits "drain" after a write that returned false.',
      'function createSink(capacity) {',
      '  const waiting = [];',
      '  let needsDrain = false;',
      '  const sink = {',
      '    written: [],',
      '    queued: 0,',
      '    peakQueued: 0,',
      '    write(chunk) {',
      '      sink.written.push(chunk);',
      '      sink.queued += 1;',
      '      sink.peakQueued = Math.max(sink.peakQueued, sink.queued);',
      '      if (sink.queued === 1) setTimeout(flush, 0);',
      '      const ok = sink.queued < capacity;',
      '      if (!ok) needsDrain = true;',
      '      return ok;',
      '    },',
      "    once(event, listener) { if (event === 'drain') waiting.push(listener); },",
      '  };',
      '  function flush() {',
      '    sink.queued = 0;',
      '    if (!needsDrain) return;',
      '    needsDrain = false;',
      '    for (const listener of waiting.splice(0)) listener();',
      '  }',
      '  return sink;',
      '}'
    ),
    starter: 'async function writeAll(sink, chunks) {\n  \n}',
    tests: [
      {
        name: 'writes every chunk, in order',
        expression:
          "(async () => { const s = createSink(2); await writeAll(s, ['a', 'b', 'c', 'd', 'e']); return s.written; })()",
        expected: ['a', 'b', 'c', 'd', 'e'],
      },
      {
        name: 'never writes again while the sink is full',
        expression:
          "(async () => { const s = createSink(2); await writeAll(s, ['a', 'b', 'c', 'd', 'e']); return s.peakQueued <= 2; })()",
        expected: true,
      },
      {
        name: 'copes with a sink that is full after every write',
        expression:
          "(async () => { const s = createSink(1); await writeAll(s, ['a', 'b', 'c']); return [s.written.join(''), s.peakQueued]; })()",
        expected: ['abc', 1],
      },
      {
        name: 'resolves on an empty list without writing anything',
        expression:
          '(async () => { const s = createSink(2); await writeAll(s, []); return s.written; })()',
        expected: [],
      },
    ],
    reference: md(
      'async function writeAll(sink, chunks) {',
      '  for (const chunk of chunks) {',
      '    if (!sink.write(chunk)) {',
      "      await new Promise((resolve) => sink.once('drain', resolve));",
      '    }',
      '  }',
      '}'
    ),
    hints: [
      'The return value of `write` is the only signal you get. Use it.',
      'When `write` returns `false`, stop the loop until the sink says it has flushed.',
      "Turn the subscription into something you can await: `await new Promise((resolve) => sink.once('drain', resolve))`.",
    ],
    explanation:
      "A loop that writes without checking is a producer with no brake: every write succeeds, the data queues in memory, and the only symptom is the resident size of the process. Awaiting `drain` couples the loop to the consumer, so what bounds the amount in flight is the sink's buffer rather than the heap. Wait only when `write` returned `false`, because a stream emits `drain` only after such a write: awaiting it after every chunk hangs on the first one that had room. Real code reaches for `pipeline`, which does all of this; writing it by hand is for a source that is not already a stream.",
  }),
];
