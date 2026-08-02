import type { ModuleDetail, ModuleRunResponse, ModuleSummary } from '@devgym/shared';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { RunStepDto } from './dto';
import { ModulesService } from './modules.service';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modules: ModulesService) {}

  @Get()
  list(): ModuleSummary[] {
    return this.modules.list();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string): ModuleDetail {
    return this.modules.detail(slug);
  }

  @Post(':slug/steps/:stepId/run')
  run(
    @Param('slug') slug: string,
    @Param('stepId') stepId: string,
    @Body() body: RunStepDto
  ): Promise<ModuleRunResponse> {
    return this.modules.run(slug, stepId, body.code);
  }
}
