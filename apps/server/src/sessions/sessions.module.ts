import { Module } from '@nestjs/common';

import { ProblemsModule } from '../problems/problems.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ProblemsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
