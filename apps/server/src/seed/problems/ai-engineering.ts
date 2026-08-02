import { code, codeProblem, md, type ProblemDraft } from './types';

/**
 * The code around a generative dependency, which is the part that fails in
 * production and the only part that can be graded deterministically offline.
 * No model runs anywhere in here, and nothing in this file is about training,
 * architectures or the statistics underneath them.
 */
export const aiEngineeringProblems: ProblemDraft[] = [
  {
    slug: 'ai-context-window-budget',
    title: 'Room for the answer',
    category: 'ai-engineering',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    prompt: md(
      'The model has a context window of 8,192 tokens, counted across the prompt and the completion together. Your prompt comes to 7,800 tokens.',
      '',
      'How many tokens are left for the completion?'
    ),
    graderConfig: {
      accept: ['392', '392 tokens'],
      acceptPatterns: ['\\b392\\b'],
      nearMisses: {
        '8192': 'That is the whole window. The prompt is already sitting in it.',
        '7800': 'That is the prompt. The question is what it left behind.',
        '0': 'The prompt fits, with room to spare. Subtract it.',
      },
      hints: [
        'The window is one budget, not two.',
        'Whatever the prompt does not use is what the answer gets.',
      ],
    },
    canonicalAnswer: '392',
    solution: md('392 tokens. `8192 - 7800`, because the window is shared by both halves.'),
    explanation:
      'The context window covers the prompt and the completion together, so every token you add to the prompt is a token the answer cannot use. This is the arithmetic behind the most common report on a generative endpoint: the response stops mid-sentence, or mid-JSON. Nothing errored; the window filled up. Conversation history is where it usually goes wrong, because the prompt grows with every turn while the code asking for 500 tokens of output stays the same.',
  },

  {
    slug: 'ai-time-to-first-token',
    title: 'One number hiding two',
    category: 'ai-engineering',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'Your completion endpoint streams, and its p99 latency is 12 seconds. The team wants that under 2, and nobody can find anything slow.',
      '',
      'Name the two measurements that one number is hiding, and say which of them a waiting user actually feels.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'time to first token',
            'first token',
            'ttft',
            'first byte',
            'first chunk',
            'time to first',
          ],
          missingFeedback: 'Name the part of the wait where the user is looking at a blank screen.',
        },
        {
          synonyms: [
            'total',
            'whole response',
            'full response',
            'end to end',
            'generation time',
            'how long the answer is',
            'how many tokens',
            'length of the answer',
            'output length',
            'number of tokens',
            'tokens per second',
          ],
          missingFeedback: 'What is the rest of the twelve seconds made of?',
        },
      ],
      hints: [
        'A streaming response has a beginning and an end, and they are not the same event.',
        'One of the two is mostly decided by how long the answer turned out to be.',
      ],
    },
    canonicalAnswer:
      'It hides time to first token and total time. Time to first token is what the user feels, because that is how long they stare at a blank screen before anything appears. The total is mostly a function of output length, so a long answer looks identical to a slow service.',
    solution: md(
      '- **Time to first token**: queueing, prompt size and the provider. This is the wait the user experiences.',
      '- **Total time**: first token plus output length divided by tokens per second. Mostly a property of the answer, not of your service.',
      '',
      'Alert on the first. Track the second, because it decides cost and connection budget.'
    ),
    explanation:
      'A p99 on total latency for a streaming endpoint pages you when someone asks a question with a long answer, which is not an incident. Time to first token is the half you control and the half the user experiences: it moves when the provider is degraded, when your prompt grew, or when you queued behind your own rate limit. Splitting the two is usually the whole fix for a generative endpoint that "feels slow" and has no slow code in it.',
  },

  {
    slug: 'ai-embedding-model-mismatch',
    title: 'New model, same index',
    category: 'ai-engineering',
    difficulty: 'easy',
    relevance: 'occasional',
    type: 'short-text',
    prompt: md(
      'You upgraded the embedding model used for queries and left the stored document vectors as they were. Both models output 1,536 dimensions, so nothing errors, and the results are now nonsense.',
      '',
      'What has to happen to the stored vectors?'
    ),
    graderConfig: {
      accept: [
        're-embed',
        'reembed',
        're-embed everything',
        're-embed the corpus',
        'rebuild the index',
        'reindex',
        're-index',
        'regenerate the embeddings',
      ],
      acceptPatterns: [
        're-?embed',
        're-?index',
        '(rebuild|regenerate|recompute).{0,20}(index|embedding|vector)',
      ],
      nearMisses: {
        'normalise the vectors':
          'Normalising makes distances comparable within one model, not across two.',
        'normalize the vectors':
          'Normalising makes distances comparable within one model, not across two.',
        nothing: 'The arithmetic still runs, which is the problem. The numbers no longer agree.',
        'retrain the model': 'Nothing here is trained. The fix is to the stored vectors.',
      },
      hints: [
        'The dimensions match, so the maths is valid. The meaning of each coordinate is not.',
        'The embedding model is part of the index, the way a column type is part of a table.',
      ],
    },
    canonicalAnswer: 'Re-embed the whole corpus with the new model.',
    solution: md(
      'Re-embed every stored document with the new model, then switch the query side over.',
      '',
      'Two models produce coordinates that mean different things, so a distance between them is arithmetic without a meaning.'
    ),
    explanation:
      'Vectors from two different models are not comparable even when the dimensionality matches, because the axes are not the same axes. Nothing throws, which is what makes this a silent bug rather than an outage: cosine similarity is happy to compare any two float arrays of the same length. Treat the embedding model as part of the index schema. Changing it is a migration, the corpus is re-embedded first, and query and index switch together.',
  },

  {
    slug: 'ai-idle-timeout-streaming',
    title: 'The timeout that kills a good answer',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You put a 30-second request timeout on a streaming completion. Long answers now die at exactly 30 seconds, mid-sentence, and a provider that hangs before sending anything still takes the full 30 seconds to notice.',
      '',
      'Name the kind of timeout that fixes both, and say what you keep alongside it so a stream cannot run forever.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'idle timeout',
            'inactivity',
            'between chunks',
            'since the last chunk',
            'since the last token',
            'inter-token',
            'between tokens',
            'stall',
            'read timeout',
          ],
          missingFeedback: 'What would you measure between one chunk arriving and the next?',
        },
        {
          synonyms: [
            'overall cap',
            'total cap',
            'absolute',
            'hard limit',
            'ceiling',
            'maximum duration',
            'overall budget',
            'total budget',
            'still cap the total',
            'wall clock limit',
          ],
          missingFeedback:
            'An idle timeout alone lets a stream dribbling one token a second run all day. What else stays?',
        },
      ],
      hints: [
        'The problem is that one number is being asked to describe both a healthy long answer and a dead connection.',
        'Measure the gap between chunks rather than the elapsed total.',
        'Keep a second, much larger number so a slow drip still ends.',
      ],
    },
    canonicalAnswer:
      'Use an idle timeout that measures the gap since the last chunk arrived and resets on every chunk, so a healthy long answer stays alive and a silent provider fails in seconds. Keep an overall cap as well, a much larger absolute ceiling on total duration, so a stream that dribbles one token at a time still ends.',
    solution: md(
      '- **Idle timeout**, a few seconds: time since the last chunk, reset on every chunk. A healthy long answer keeps resetting it; a dead connection trips it almost immediately.',
      '- **Overall cap**, minutes: an absolute ceiling on the whole request, so a slow drip cannot hold a connection open forever.',
      '',
      'Both, not either. The idle timeout catches the failure fast, the cap bounds the resource.'
    ),
    explanation:
      'A single request timeout cannot tell "still generating" from "died quietly", because both look like a connection that is open and not finished. An idle timeout can: healthy generation produces chunks continuously, so the gap between them is small and predictable, while a stalled upstream produces nothing at all. Keep the overall cap anyway, because an idle timeout has no opinion about a stream that never stalls and never ends, and that connection is holding a socket, a worker and whatever you allocated per request.',
  },

  {
    slug: 'ai-retry-double-charge',
    title: 'The retry that pays twice',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'A completion request times out after 40 seconds. Your HTTP client is configured to retry on timeouts, so it sends it twice more.',
      '',
      'Say what the provider was most likely doing while your client gave up, and name two things the extra calls just spent.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'still generating',
            'still running',
            'completed',
            'finished',
            'generated',
            'kept going',
            'did the work',
            'succeeded',
            'server does not stop',
            'carried on',
          ],
          missingFeedback:
            'A timeout is your client giving up. What was the other end doing at that moment?',
        },
        {
          synonyms: ['bill', 'charge', 'cost', 'money', 'paid', 'spend', 'token cost', 'invoice'],
          missingFeedback: 'What are you charged for whether or not you ever read the response?',
        },
        {
          synonyms: [
            'rate limit',
            'quota',
            'capacity',
            'concurrency',
            'throughput',
            'queue',
            'headroom',
            'slot',
            'tokens per minute',
          ],
          missingFeedback: 'What else does an extra call consume, that your other requests wanted?',
        },
      ],
      hints: [
        'A timeout tells you nothing about what happened on the server.',
        'Generation is billed by tokens produced, not by responses you managed to read.',
        'The third attempt is also competing with your own traffic for the same limit.',
      ],
    },
    canonicalAnswer:
      'The provider was almost certainly still generating, and probably completed the request: a timeout is the client giving up, not the server stopping. So the two extra calls spent real money, because you are billed for the tokens generated whether or not you read them, and they spent rate limit and concurrency headroom that your other requests needed.',
    solution: md(
      'The first request most likely finished. A client timeout stops your side of the connection; it does not cancel the work.',
      '',
      'The retries spent:',
      '',
      '- **Money**: tokens are billed as they are generated, read or not.',
      '- **Capacity**: rate limit, quota and concurrency that your other traffic was queueing for.',
      '',
      'Retry on connection errors and on 429 and 5xx. A timeout on an expensive, slow call is the case for an idempotency key rather than a blind retry.'
    ),
    explanation:
      'Retrying a GET is nearly free, which is where the habit comes from. Retrying a generation is not: the work is expensive, it is billed on production rather than on delivery, and a timeout is the one failure mode that tells you nothing about whether it succeeded. Worse, retries arrive when the dependency is already struggling, so they are exactly the traffic that turns a slow provider into a rate-limited one. Carry an idempotency key so a retry can be answered from the first result, and give up honestly rather than paying three times for one answer.',
  },

  {
    slug: 'ai-idempotency-key-choice',
    title: 'Keying the expensive call',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'You want a retried completion to return the first result instead of generating a second one. Two candidates for the idempotency key:',
      '',
      '1. A hash of the prompt.',
      '2. A key the caller generates once per user action and reuses across retries.',
      '',
      'Pick one, and say what goes wrong with the other.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'caller',
            'client generates',
            'per user action',
            'per action',
            'per intent',
            'uuid',
            'the second',
            'option 2',
            'generated once',
          ],
          missingFeedback: 'Which of the two knows when a new attempt is a new intent?',
        },
        {
          synonyms: [
            'ask again',
            'asked twice',
            'same prompt',
            'same question',
            'regenerate',
            'try again',
            'deliberately',
            'legitimate repeat',
            'identical prompt',
            'second answer',
          ],
          missingFeedback:
            'What does a prompt hash do to a user who sends the same prompt again on purpose?',
        },
      ],
      hints: [
        'Both keys deduplicate. The question is what each one thinks "the same request" means.',
        'Users press "try again" on purpose, with the identical prompt.',
      ],
    },
    canonicalAnswer:
      'Use the caller-generated key, created once per user action and reused across retries. Hashing the prompt breaks the case where someone deliberately asks the same question again: an identical prompt is a legitimate repeat, and a prompt hash would serve them the cached first answer instead of regenerating.',
    solution: md(
      'The caller-generated key. It identifies the *intent*, and only the caller knows when a new intent started.',
      '',
      'A prompt hash treats "the user asked the same thing again" as a duplicate, which it is not. It also ignores everything else that makes a request different: temperature, the seed, the tool set, the model.'
    ),
    explanation:
      'Idempotency keys identify an operation, not a payload, and this is the case that makes the difference obvious. Pressing "regenerate" sends a byte-identical prompt and means the opposite of a retry. The rule is the same one that applies to a payments endpoint: the key is minted where the intent is formed, travels unchanged through every retry of that intent, and a new intent gets a new key. The server then stores the completed result under the key and replays it, which also caps the damage when a client retries a call that had already succeeded.',
  },

  {
    slug: 'ai-stream-error-after-200',
    title: 'Failing after you have already said 200',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Your endpoint proxies a streaming completion to the browser. Two hundred tokens in, the upstream provider drops the connection.',
      '',
      'The status line went out with the first chunk. Say what that rules out, and how the client is supposed to find out that the answer it is holding is not the whole answer.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'cannot change the status',
            'cannot send a 500',
            'already sent',
            'headers are gone',
            'too late',
            'status is committed',
            'no longer set',
            'already committed',
          ],
          missingFeedback:
            'The status line is the first thing on the wire. What can you no longer do with it?',
        },
        {
          synonyms: [
            'error event',
            'in the stream',
            'in-band',
            'in band',
            'a message in the body',
            'sentinel',
            'terminal event',
            'error message in the stream',
            'event in the body',
            'send an error chunk',
          ],
          missingFeedback: 'If the status cannot carry the failure, what part of the response can?',
        },
        {
          synonyms: [
            'incomplete',
            'partial',
            'truncated',
            'not final',
            'unfinished',
            'discard',
            'do not treat it as complete',
            'not the whole answer',
          ],
          missingFeedback:
            'The client has 200 tokens in hand. What does it need to know about them?',
        },
      ],
      hints: [
        'The response started successfully. That decision has already been transmitted.',
        'Every streaming protocol worth using has a way to say "this is the end" and a way to say "this went wrong".',
        'A client that cannot tell a finished answer from a severed one will show the severed one as final.',
      ],
    },
    canonicalAnswer:
      'It rules out changing the status: the 200 is already committed, so you cannot send a 500 and there are no headers left to set. The failure has to travel in-band, as an error event in the stream itself, and the client has to treat what it holds as partial and incomplete rather than as the finished answer.',
    solution: md(
      'The status is committed the moment the first chunk leaves, so:',
      '',
      '- **Ruled out**: a 500, an error body, any header. All of those went out already, saying 200.',
      '- **In-band instead**: an explicit error event in the stream, and a distinct completion event on the happy path so the two are distinguishable.',
      '- **On the client**: what arrived is partial. Mark it, do not present it as the final answer, and do not cache it.'
    ),
    explanation:
      'Streaming trades the ability to fail cleanly for the ability to start early, and every streaming protocol pays for it the same way: success and failure both become messages inside the body. This is why a stream needs an explicit terminal event rather than relying on the connection closing, because a closed connection is exactly what a network failure also looks like. A client that infers "done" from "the socket ended" cannot tell a complete answer from a truncated one, and it will show a half-sentence as if you meant it.',
  },

  {
    slug: 'ai-nearest-neighbour-always-returns',
    title: 'Five results for a question about nothing',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'foundational',
    type: 'explain',
    prompt: md(
      'Your vector search returns the top 5 chunks for every query. Someone asks about a subject the corpus never mentions, gets 5 chunks anyway, and the model answers confidently from them.',
      '',
      'Say what a nearest-neighbour search actually promises, and name what you have to add to be able to answer "nothing found".'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'nearest',
            'closest',
            'ranking',
            'ranks',
            'relative',
            'sorted',
            'always returns',
            'no notion of relevance',
            'not relevance',
            'order not relevance',
          ],
          missingFeedback:
            'What does "top 5" mean to the index: that they are relevant, or something weaker?',
        },
        {
          synonyms: [
            'threshold',
            'cutoff',
            'cut-off',
            'minimum score',
            'minimum similarity',
            'distance limit',
            'score filter',
            'rerank',
            're-rank',
            'filter by score',
          ],
          missingFeedback: 'What turns "the closest five" into "nothing close enough"?',
        },
      ],
      hints: [
        'k-nearest-neighbour is a sort, and a sort of anything is never empty.',
        'The index has no opinion about whether the closest thing is close.',
        'You need a number the score has to beat, and that number has to be measured against real queries rather than guessed.',
      ],
    },
    canonicalAnswer:
      'It promises the nearest k vectors and nothing more: it ranks, it does not judge relevance, so it always returns 5 as long as the corpus has 5 chunks. To answer "nothing found" you have to add a score threshold, a distance cutoff below which a result is discarded, usually with a reranking step over the survivors.',
    solution: md(
      'A k-NN query is a **sort**, not a filter. It returns the closest k vectors in the corpus, and "closest" carries no promise of "close".',
      '',
      'To get an empty result you add a **score threshold**: a minimum similarity a chunk must clear to be passed on, often with a reranker over what survives. The number is corpus-specific and model-specific, so it is measured against real queries rather than picked.'
    ),
    explanation:
      'This is the failure that makes a retrieval system look like a hallucination problem. The model was handed five chunks about something else and did what it was asked with them. Nothing in the index was broken; it answered the question it was asked, which was "what are the five nearest vectors", not "what is relevant here". The threshold is the part that has to be built and measured, and it is why an eval set comes before tuning: without one, you are choosing a cutoff by feel and finding out in production.',
  },

  {
    slug: 'ai-chunk-overlap-boundary',
    title: 'The answer nobody retrieved',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'occasional',
    type: 'explain',
    prompt: md(
      'Documents are split into 500-token chunks with no overlap. The sentence that answers a question spans the end of chunk 7 and the start of chunk 8, and retrieval returns neither: both halves are about half a topic.',
      '',
      'Name the two changes to the chunking that make this rarer, and say what each one costs.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'overlap',
            'sliding window',
            'stride',
            'repeat the end',
            'repeat the tail',
            'shared tokens',
            'overlapping chunks',
          ],
          missingFeedback: 'What would let chunk 8 contain the end of chunk 7?',
        },
        {
          synonyms: [
            'structure',
            'sentence',
            'paragraph',
            'heading',
            'section',
            'semantic',
            'natural boundaries',
            'do not split mid-sentence',
            'split on boundaries',
          ],
          missingFeedback:
            'A fixed token count cuts wherever it lands. What should decide where a chunk ends instead?',
        },
        {
          synonyms: [
            'index size',
            'index bigger',
            'bigger index',
            'bigger',
            'more chunks',
            'storage',
            'duplicat',
            'cost',
            'uneven',
            'uniform',
            'variable size',
            'more expensive',
          ],
          missingFeedback: 'Both changes make the index bigger or messier. Say how.',
        },
      ],
      hints: [
        'A fixed size is a guess about where meaning ends.',
        'One fix makes the cut survivable; the other makes it land in a better place.',
        'Neither is free: say what you pay in index size or in chunk uniformity.',
      ],
    },
    canonicalAnswer:
      'Add overlap, so each chunk repeats the tail of the one before and a sentence cut in half survives in the neighbour; that duplicates tokens and makes the index bigger. And split on structure, at sentence, paragraph or heading boundaries rather than at a fixed token count, so a cut is less likely to land mid-sentence; that costs you uniform chunk size, which makes chunks variable and harder to budget for.',
    solution: md(
      '- **Overlap**: each chunk repeats the last n tokens of the previous one, so a sentence cut in half still appears whole in the neighbour. Cost: duplicated tokens, a bigger index, and near-duplicate hits to deduplicate.',
      '- **Split on structure**: sentence, paragraph or heading boundaries instead of a fixed count. Cost: chunk sizes stop being uniform, so the prompt budget has to cope with variable ones.',
      '',
      'Neither eliminates the problem. They make the cut survivable and make it land somewhere sensible.'
    ),
    explanation:
      'Fixed-size chunking is a guess about where meaning ends, and at scale a fixed count will eventually cut through the one sentence that answers the question. This is worth knowing because the retrieval step is usually where a RAG system is wrong: the model can only be as right as the chunks it was handed, so a confident wrong answer is far more often a chunking or ranking bug than a model failure. Debug retrieval first, by reading what was actually retrieved.',
  },

  {
    slug: 'ai-tool-schema-is-the-contract',
    title: 'A tool that returns everything',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'An MCP server exposes a `search_orders` tool. Its description reads "search orders", it takes a single `query` string, and it returns every matching row in one response. A test against real data returned 4,000 orders and the call failed.',
      '',
      'Name the two things this tool is missing, both of which you would have caught reviewing an HTTP endpoint.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'pagination',
            'paginate',
            'limit',
            'page size',
            'bounded',
            'cap the results',
            'cursor',
            'top n',
            'max results',
          ],
          missingFeedback:
            '4,000 rows in one response is a problem you have already solved on an HTTP endpoint. What did you add there?',
        },
        {
          synonyms: [
            'description',
            'documented',
            'schema',
            'parameters',
            'arguments',
            'input schema',
            'json schema',
            'types',
            'what it does',
            'contract',
          ],
          missingFeedback:
            'The caller cannot read your source or ask you a question. What is the entire contract it has to work from?',
        },
      ],
      hints: [
        'Read the tool as an endpoint. What would a reviewer say about a route that returns every row?',
        'The second problem is not the response at all: it is what the caller had to work from before calling.',
      ],
    },
    canonicalAnswer:
      'It is missing a bound on the result: pagination, or at least a limit and a cursor, so one call cannot return 4,000 rows. And it is missing a real contract: the description says nothing about what it searches or what it returns, and a single untyped `query` string is not an input schema a caller can use correctly.',
    solution: md(
      '- **A bounded result**: a `limit`, a cursor or a page, and a documented maximum. An unbounded list is an outage waiting for a big customer.',
      '- **A usable contract**: a description that says what is searched and what comes back, and a typed input schema with named parameters instead of one free-text `query`.',
      '',
      'The description and the schema are the whole of the documentation. There is no other page to read.'
    ),
    explanation:
      'A tool definition is an API whose client cannot read your source, your changelog or your mind, and whose only documentation is the description and the JSON Schema you shipped with it. Everything you already know applies: bound the response, name the parameters, return structured errors rather than prose. The one genuinely new part is the audience, because a caller that finds the description vague will not file a ticket. It will guess, and it will guess plausibly.',
  },

  {
    slug: 'ai-tool-authorization-boundary',
    title: 'The tool that trusted its caller',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'daily',
    type: 'explain',
    prompt: md(
      'A `delete_invoice` tool takes `invoice_id` and `user_id`. Its description says to pass the id of the current user, and the handler deletes any invoice whose id matches.',
      '',
      'Say where the permission check belongs, and why the description is not one.'
    ),
    graderConfig: {
      groups: [
        {
          synonyms: [
            'server',
            'handler',
            'inside the tool',
            'the boundary',
            'session',
            'from the connection',
            'server side',
            'not the argument',
            'authenticated context',
          ],
          missingFeedback: 'Which side of the boundary can be trusted to have actually checked?',
        },
        {
          synonyms: [
            'not enforcement',
            'instruction',
            'just text',
            'advisory',
            'can pass anything',
            'untrusted input',
            'attacker',
            'injection',
            'ignore it',
            'no guarantee',
            'suggestion',
          ],
          missingFeedback:
            'What can a caller do with a parameter you politely asked it to fill in honestly?',
        },
      ],
      hints: [
        'A tool call is input that arrived over the network, like any other.',
        'Ask who gets to decide the value of `user_id`.',
      ],
    },
    canonicalAnswer:
      'The check belongs on the server, in the tool handler, against the identity the session already carries: the invoice is deleted only if it belongs to the authenticated user. The description is not enforcement, it is an instruction, and a caller can pass anything it likes in `user_id`. Treating it as untrusted input is the only safe reading.',
    solution: md(
      'In the handler, against the identity the server already holds.',
      '',
      '- Drop `user_id` from the schema. Identity comes from the authenticated session, never from an argument.',
      '- Load the invoice, check ownership, then delete. Same check you would write behind an HTTP route.',
      '',
      'A description is a request. It is read by something that can decline.'
    ),
    explanation:
      'A tool call is untrusted input that arrived over the network, exactly like a query parameter, and the same rule applies: anything the caller supplies is a claim, not a fact. A model can be talked into passing a different id, and a client that is not a model can simply do it. The instruction in the description is not a control, because controls are things the server enforces. If the answer to "what stops this being abused?" is a sentence of English, there is no answer.',
  },

  codeProblem({
    slug: 'ai-stream-partial-chunk',
    title: 'The last word goes missing',
    category: 'ai-engineering',
    difficulty: 'hard',
    relevance: 'daily',
    prompt: md(
      'A completion stream arrives as bytes, not as messages. Each event is a line of the form `data: <text>\\n`, but a chunk from the network can end anywhere, including halfway through a line.',
      '',
      'Write `readEvents(buffer, chunk)`, which takes whatever was left over from last time plus the new chunk, and returns the complete events it can now produce along with what is still incomplete:',
      '',
      code(
        'js',
        "readEvents('', 'data: hello\\ndata: wor')",
        "// { events: ['hello'], buffer: 'data: wor' }"
      ),
      '',
      'Return the text after `data: ` for every complete line, ignore lines that are blank or do not start with `data: `, and put the unterminated remainder in `buffer`.'
    ),
    starter: 'function readEvents(buffer, chunk) {\n  \n}',
    tests: [
      {
        name: 'holds back a line the chunk did not finish',
        expression: "readEvents('', 'data: hello\\ndata: wor')",
        expected: { events: ['hello'], buffer: 'data: wor' },
      },
      {
        name: 'completes a line split across two chunks',
        expression:
          "(() => { const first = readEvents('', 'data: hel'); return readEvents(first.buffer, 'lo\\n'); })()",
        expected: { events: ['hello'], buffer: '' },
      },
      {
        name: 'ignores blank lines between events',
        expression: "readEvents('', 'data: a\\n\\ndata: b\\n')",
        expected: { events: ['a', 'b'], buffer: '' },
      },
      {
        name: 'returns no events when nothing is terminated yet',
        expression: "readEvents('', 'da')",
        expected: { events: [], buffer: 'da' },
      },
      {
        name: 'keeps an empty payload rather than dropping it',
        expression: "readEvents('', 'data: \\n')",
        expected: { events: [''], buffer: '' },
      },
    ],
    reference: md(
      'function readEvents(buffer, chunk) {',
      "  const lines = (buffer + chunk).split('\\n');",
      "  const rest = lines.pop() ?? '';",
      '  const events = [];',
      '  for (const line of lines) {',
      "    if (line.startsWith('data: ')) events.push(line.slice(6));",
      '  }',
      '  return { events, buffer: rest };',
      '}'
    ),
    hints: [
      'Work on `buffer + chunk`, not on `chunk` alone.',
      'Split on the newline. The last piece is the only one that might be unfinished.',
      '`split` on a string ending in a newline leaves an empty final piece, which is exactly the empty buffer you want.',
    ],
    explanation:
      'A network chunk is a chunk of bytes, and it has no relationship to your message boundaries: it ends where the socket said so. Any parser that reads a chunk in isolation loses whatever was straddling the edge, which shows up as the last word of a response going missing, or a JSON payload that fails to parse once in a hundred requests. The fix is the same for any framed stream: keep a buffer, take only the complete frames out of it, and carry the remainder into the next read. `TextDecoder` has the same problem one level down, which is what its `{ stream: true }` option is for.',
  }),

  codeProblem({
    slug: 'ai-eval-assert-invariants',
    title: 'Asserting on an answer you cannot predict',
    category: 'ai-engineering',
    difficulty: 'medium',
    relevance: 'daily',
    prompt: md(
      'A model is asked to answer from a set of documents and reply as JSON: an `answer` string, and a `sources` array of document ids it used. The wording changes every run, so an exact-match assertion is useless.',
      '',
      'Write `gradeCitation(raw, allowedIds)`, which grades one output on the properties that do not vary. It returns `{ pass: true, reason: null }` when the output is usable, or `{ pass: false, reason }` with the first failure, using exactly these reasons:',
      '',
      '- `not-json` — `raw` does not parse as JSON',
      '- `no-answer` — `answer` is missing, not a string, or blank',
      '- `no-sources` — `sources` is missing, not an array, or empty',
      '- `unknown-source` — a source is not in `allowedIds`',
      '',
      'Check them in that order.'
    ),
    starter: 'function gradeCitation(raw, allowedIds) {\n  \n}',
    tests: [
      {
        name: 'passes a well-formed answer',
        expression:
          'gradeCitation(\'{"answer":"Ship it on Friday.","sources":["doc-2"]}\', [\'doc-1\', \'doc-2\'])',
        expected: { pass: true, reason: null },
      },
      {
        name: 'passes different wording with the same shape',
        expression:
          'gradeCitation(\'{"answer":"Friday, per the release note.","sources":["doc-1","doc-2"]}\', [\'doc-1\', \'doc-2\'])',
        expected: { pass: true, reason: null },
      },
      {
        name: 'fails prose that is not JSON',
        expression: "gradeCitation('Sure! Here is the answer:', ['doc-1'])",
        expected: { pass: false, reason: 'not-json' },
      },
      {
        name: 'fails a blank answer',
        expression: 'gradeCitation(\'{"answer":"  ","sources":["doc-1"]}\', [\'doc-1\'])',
        expected: { pass: false, reason: 'no-answer' },
      },
      {
        name: 'fails an empty source list',
        expression: 'gradeCitation(\'{"answer":"Friday.","sources":[]}\', [\'doc-1\'])',
        expected: { pass: false, reason: 'no-sources' },
      },
      {
        name: 'fails a source nobody supplied',
        expression:
          'gradeCitation(\'{"answer":"Friday.","sources":["doc-9"]}\', [\'doc-1\', \'doc-2\'])',
        expected: { pass: false, reason: 'unknown-source' },
      },
    ],
    reference: md(
      'function gradeCitation(raw, allowedIds) {',
      '  let parsed;',
      '  try {',
      '    parsed = JSON.parse(raw);',
      '  } catch {',
      "    return { pass: false, reason: 'not-json' };",
      '  }',
      '',
      "  if (typeof parsed?.answer !== 'string' || parsed.answer.trim() === '') {",
      "    return { pass: false, reason: 'no-answer' };",
      '  }',
      '  if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {',
      "    return { pass: false, reason: 'no-sources' };",
      '  }',
      '  if (!parsed.sources.every((id) => allowedIds.includes(id))) {',
      "    return { pass: false, reason: 'unknown-source' };",
      '  }',
      '',
      '  return { pass: true, reason: null };',
      '}'
    ),
    hints: [
      '`JSON.parse` throws on prose, so the first check is a try/catch.',
      'Every other check is about shape: a non-blank string, a non-empty array, and membership.',
      'Nothing here looks at the wording of the answer, which is the point.',
    ],
    explanation:
      'You cannot assert on text a model generates, but almost everything you actually need from it is structural: it parsed, it filled the fields, it cited something, and everything it cited exists. Those hold on every run, so they make a test rather than a vibe. This is what turns "the output looked fine" into a suite you can run on every prompt change, and the invariant that catches the most real bugs is the last one: a citation to a document that was never in the context is the cleanest signal you have that the answer was invented.',
  }),
];
