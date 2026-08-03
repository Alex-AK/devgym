import type { PracticeSchemaResponse, PracticeTable } from '@hone/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { Database as SqliteDatabase } from 'better-sqlite3';

import { PRACTICE_DB } from '../db/db.module';
import { PRACTICE_TABLE_ORDER } from '../seed/practice-db';

interface TableInfoRow {
  name: string;
  type: string;
}

@Injectable()
export class PracticeService {
  constructor(@Inject(PRACTICE_DB) private readonly db: SqliteDatabase) {}

  schema(): PracticeSchemaResponse {
    const names = (
      this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all() as { name: string }[]
    ).map((row) => row.name);

    const ordered = [
      ...PRACTICE_TABLE_ORDER.filter((name) => names.includes(name)),
      ...names.filter((name) => !PRACTICE_TABLE_ORDER.includes(name)),
    ];

    const tables: PracticeTable[] = ordered.map((name) => {
      // `name` comes from sqlite_master, so it is a real table in this file.
      const columns = (this.db.prepare(`PRAGMA table_info("${name}")`).all() as TableInfoRow[]).map(
        (column) => ({ name: column.name, type: column.type })
      );
      const [count] = this.db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).all() as {
        n: number;
      }[];
      return { name, columns, rowCount: count?.n ?? 0 };
    });

    return { tables };
  }
}
