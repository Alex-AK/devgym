import type { PathDetail, PathSummary } from '@devgym/shared';
import { Controller, Get, Param } from '@nestjs/common';

import { PathsService } from './paths.service';

@Controller('paths')
export class PathsController {
  constructor(private readonly paths: PathsService) {}

  @Get()
  list(): PathSummary[] {
    return this.paths.list();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string): PathDetail {
    return this.paths.detail(slug);
  }
}
