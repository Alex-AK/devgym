import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { AuthedRequest } from './authed-request';
import { SessionGuard } from './session.guard';
import { SessionsService, type TokenPair } from './sessions.service';
import { findUserByEmail, verifyPassword } from './users';

/** One answer for a wrong password and for an address nobody has registered. */
const BAD_CREDENTIALS = 'Invalid email or password';

interface Credentials {
  email?: unknown;
  password?: unknown;
}

interface RefreshBody {
  refreshToken?: unknown;
}

interface Profile {
  id: number;
  email: string;
  name: string;
}

/**
 * The routes, wired and not part of the exercise. Nest answers a POST with 201
 * unless it is told otherwise, which is what the @HttpCode lines are for.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: Credentials): Promise<TokenPair> {
    const { email, password } = body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }

    return this.sessions.open(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshBody): Promise<TokenPair> {
    const { refreshToken } = body;
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.sessions.rotate(refreshToken);
  }

  /**
   * 204 either way. Whether that token was worth anything is not something a
   * logout route is going to tell whoever is holding it.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() body: RefreshBody): void {
    const { refreshToken } = body;
    if (typeof refreshToken === 'string' && refreshToken) {
      this.sessions.revoke(refreshToken);
    }
  }

  @Post('logout-everywhere')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  logoutEverywhere(@Req() request: AuthedRequest): void {
    const auth = request.auth;
    if (!auth) throw new UnauthorizedException();

    this.sessions.revokeEverythingFor(auth.user.id);
  }
}

@Controller('me')
@UseGuards(SessionGuard)
export class MeController {
  @Get()
  me(@Req() request: AuthedRequest): Profile {
    const auth = request.auth;
    if (!auth) throw new UnauthorizedException();

    // Field by field. Spreading the user would send the password hash with it.
    const { email, id, name } = auth.user;
    return { email, id, name };
  }
}
