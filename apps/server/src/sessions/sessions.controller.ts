import type { SessionResponse } from '@hone/shared';
import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';

import { CreateSessionDto } from './dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() body: CreateSessionDto): SessionResponse {
    return this.sessions.create(body);
  }

  /** Declared before `:id` so "active"/"latest" are not parsed as ids. */
  @Get('active')
  active(): { session: SessionResponse | null } {
    return { session: this.sessions.active() };
  }

  @Get('latest')
  latest(): { session: SessionResponse | null } {
    return { session: this.sessions.latest() };
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number): SessionResponse {
    return this.sessions.detail(id);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(@Param('id', ParseIntPipe) id: number): SessionResponse {
    return this.sessions.finish(id);
  }
}
