import type { ProgressResponse, ResetAllResponse } from '@devgym/shared';
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';

import { ResetAllDto } from '../problems/dto';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  summary(): ProgressResponse {
    return this.progress.summary();
  }

  @Post('reset')
  @HttpCode(200)
  resetAll(@Body() body: ResetAllDto): ResetAllResponse {
    return this.progress.resetAll(body.clearHistory ?? false);
  }
}
