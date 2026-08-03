import { APP_DB_PATH, ensureDataDir, PRACTICE_DB_PATH } from '../common/paths';
import { openAppDatabase, runMigrations } from '../db/client';
import { seedAll } from './seed';

function main(): void {
  ensureDataDir();
  const { db, sqlite } = openAppDatabase(APP_DB_PATH);
  try {
    runMigrations(db);
    const result = seedAll(db, PRACTICE_DB_PATH);
    console.log(`hone: seeded ${result.problems} problems into ${APP_DB_PATH}`);
    console.log(`hone: rebuilt practice dataset at ${result.practiceDbPath}`);
  } finally {
    sqlite.close();
  }
}

main();
