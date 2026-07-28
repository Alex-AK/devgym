import type { PracticeSchemaResponse } from '@devgym/shared';
import { Controller, Get } from '@nestjs/common';

import { PracticeService } from './practice.service';

@Controller('practice-schema')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Get()
  schema(): PracticeSchemaResponse {
    return this.practice.schema();
  }
}
