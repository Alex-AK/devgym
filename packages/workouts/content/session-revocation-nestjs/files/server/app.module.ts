import { Module } from '@nestjs/common';

import { AuthController, MeController } from './auth.controller';
import { SessionStore } from './session-store';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [AuthController, MeController],
  providers: [SessionStore, SessionsService],
})
export class AppModule {}
