import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

import { ReportsService } from './reports.service';

/**
 * Nobody uses this yet.
 *
 * TODO: make it the one place the ownership question gets answered.
 *
 * - No `x-user` header at all: 401.
 * - A report id that belongs to somebody else: 403.
 * - A report id that does not exist: let it past and leave the 404 to the
 *   handler, which is the only thing that knows what it was looking for.
 * - A route with no report id: let it past. The list route narrows by owner
 *   itself.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reports: ReportsService) {}

  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
