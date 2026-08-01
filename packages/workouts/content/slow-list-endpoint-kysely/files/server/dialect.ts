import type { PGlite } from '@electric-sql/pglite';
import {
  CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type QueryResult,
} from 'kysely';

/** What the checkpoints see: every statement, and how much it brought back. */
export interface LoggedQuery {
  sql: string;
  parameters: readonly unknown[];
  rowCount: number;
}

/**
 * Plumbing: Kysely talks to Postgres through a dialect, and PGlite is Postgres
 * compiled to WASM rather than a server, so it needs a thin one of its own. The
 * only interesting line is the log call, which is how a checkpoint can tell how
 * many rows a query actually pulled across.
 */
class PGliteConnection implements DatabaseConnection {
  constructor(
    private readonly client: PGlite,
    private readonly onQuery: (query: LoggedQuery) => void
  ) {}

  async executeQuery<R>(compiled: CompiledQuery): Promise<QueryResult<R>> {
    const result = await this.client.query<R>(compiled.sql, [...compiled.parameters]);
    this.onQuery({
      sql: compiled.sql,
      parameters: compiled.parameters,
      rowCount: result.rows.length,
    });
    return { rows: result.rows, numAffectedRows: BigInt(result.affectedRows ?? 0) };
  }

  streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('Streaming is not supported here');
  }
}

class PGliteDriver implements Driver {
  private readonly connection: PGliteConnection;

  constructor(
    private readonly client: PGlite,
    onQuery: (query: LoggedQuery) => void
  ) {
    this.connection = new PGliteConnection(client, onQuery);
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    return this.connection;
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('begin'));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('commit'));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('rollback'));
  }

  async releaseConnection(): Promise<void> {}

  async destroy(): Promise<void> {
    await this.client.close();
  }
}

export function pgliteDialect(client: PGlite, onQuery: (query: LoggedQuery) => void): Dialect {
  return {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new PGliteDriver(client, onQuery),
    createIntrospector: (db: Kysely<unknown>) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  };
}
