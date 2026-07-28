import { Module } from '@nestjs/common';

import { DbModule } from './db/db.module';
import { PracticeModule } from './practice/practice.module';
import { ProblemsModule } from './problems/problems.module';
import { ProgressModule } from './progress/progress.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [DbModule, ProblemsModule, ProgressModule, PracticeModule, SessionsModule],
})
export class AppModule {}
