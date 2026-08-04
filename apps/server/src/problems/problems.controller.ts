import type {
  AttemptResponse,
  NextProblem,
  ProblemDetail,
  ProblemSummary,
  QueueMoveResponse,
  RevealSolutionResponse,
} from '@hone/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';

import { CreateAttemptDto, NextProblemQueryDto, QueueScopeQueryDto, toQueueScope } from './dto';
import { ProblemsService } from './problems.service';

@Controller('problems')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get()
  list(): ProblemSummary[] {
    return this.problems.list();
  }

  /** Declared before `:slug` so "next" is not swallowed as a slug. */
  @Get('next')
  next(@Query() query: NextProblemQueryDto): { next: NextProblem | null } {
    return { next: this.problems.next(query.after, query.dir ?? 'next', toQueueScope(query)) };
  }

  @Get(':slug')
  detail(@Param('slug') slug: string): ProblemDetail {
    return this.problems.detail(slug);
  }

  @Post(':slug/attempts')
  @HttpCode(200)
  attempt(@Param('slug') slug: string, @Body() body: CreateAttemptDto): Promise<AttemptResponse> {
    return this.problems.submitAttempt(slug, body.answer);
  }

  @Post(':slug/skip')
  @HttpCode(200)
  skip(@Param('slug') slug: string, @Query() query: QueueScopeQueryDto): QueueMoveResponse {
    return this.problems.skip(slug, toQueueScope(query));
  }

  @Post(':slug/reveal-solution')
  @HttpCode(200)
  revealSolution(@Param('slug') slug: string): RevealSolutionResponse {
    return this.problems.revealSolution(slug);
  }

  @Post(':slug/reset')
  @HttpCode(200)
  reset(@Param('slug') slug: string): QueueMoveResponse {
    return this.problems.reset(slug);
  }
}
