import { Module } from '@nestjs/common';

import { DbModule } from './db/db.module';
import { HandbookModule } from './handbook/handbook.module';
import { PracticeModule } from './practice/practice.module';
import { ProblemsModule } from './problems/problems.module';
import { ProgressModule } from './progress/progress.module';
import { SessionsModule } from './sessions/sessions.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [
    DbModule,
    ProblemsModule,
    ProgressModule,
    PracticeModule,
    SessionsModule,
    WorkoutsModule,
    HandbookModule,
  ],
})
export class AppModule {}
