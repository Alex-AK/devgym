import { existsSync } from 'node:fs';

import { Global, Inject, Logger, Module, type OnModuleDestroy } from '@nestjs/common';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import { sql } from 'drizzle-orm';

import { CurrentUserService } from '../common/current-user.service';
import { ensureDataDir, PRACTICE_DB_PATH } from '../common/paths';
import { buildPracticeDatabase, openPracticeDatabase } from '../seed/practice-db';
import { seedAll } from '../seed/seed';
import { type AppDatabaseHandle, type AppDb, openAppDatabase, runMigrations } from './client';
import { problems } from './schema';

export const APP_DB_HANDLE = Symbol('APP_DB_HANDLE');
export const APP_DB = Symbol('APP_DB');
export const PRACTICE_DB = Symbol('PRACTICE_DB');

function bootstrapDatabases(db: AppDb): void {
  const logger = new Logger('Database');
  const [row] = db
    .select({ count: sql<number>`count(*)` })
    .from(problems)
    .all();
  const problemCount = row?.count ?? 0;

  if (problemCount === 0) {
    const result = seedAll(db);
    logger.log(`Empty database — seeded ${result.problems} problems and the practice dataset`);
    return;
  }
  if (!existsSync(PRACTICE_DB_PATH)) {
    buildPracticeDatabase(PRACTICE_DB_PATH);
    logger.log('Rebuilt missing practice dataset');
  }
}

@Global()
@Module({
  providers: [
    CurrentUserService,
    {
      provide: APP_DB_HANDLE,
      useFactory: (): AppDatabaseHandle => {
        ensureDataDir();
        const handle = openAppDatabase();
        runMigrations(handle.db);
        bootstrapDatabases(handle.db);
        return handle;
      },
    },
    {
      provide: APP_DB,
      useFactory: (handle: AppDatabaseHandle): AppDb => handle.db,
      inject: [APP_DB_HANDLE],
    },
    {
      // Depends on APP_DB_HANDLE so the file always exists (and is seeded) first.
      provide: PRACTICE_DB,
      useFactory: (): SqliteDatabase => openPracticeDatabase(),
      inject: [APP_DB_HANDLE],
    },
  ],
  exports: [APP_DB, PRACTICE_DB, CurrentUserService],
})
export class DbModule implements OnModuleDestroy {
  constructor(
    @Inject(APP_DB_HANDLE) private readonly appHandle: AppDatabaseHandle,
    @Inject(PRACTICE_DB) private readonly practiceDb: SqliteDatabase
  ) {}

  onModuleDestroy(): void {
    this.practiceDb.close();
    this.appHandle.sqlite.close();
  }
}
