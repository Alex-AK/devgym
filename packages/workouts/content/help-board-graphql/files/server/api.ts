import { graphql } from 'graphql';

import type { Workspace } from './db';
import { createContext, schema } from './graph';

/**
 * One GraphQL request, start to finish. The web handler is a thin wrapper
 * around this: read the document off the POST body, hand it to here, send the
 * result back as JSON.
 *
 * `createContext` is called once here, per request, and whatever it returns is
 * the `context` argument every resolver in `graph.ts` is given.
 */
export async function runQuery(
  workspace: Workspace,
  source: string,
  variables: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const result = await graphql({
    schema,
    source,
    contextValue: createContext(workspace),
    variableValues: variables,
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }

  return (result.data ?? {}) as Record<string, unknown>;
}
