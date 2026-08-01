import { Module } from '@nestjs/common';

import { CurrentUserService } from '../common/current-user.service';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  controllers: [WorkoutsController],
  providers: [WorkoutsService, CurrentUserService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
