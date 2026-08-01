import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ReportsService } from './reports.service';

interface IncomingRequest {
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string | undefined>;
}

/**
 * The one place the ownership question gets answered. Applied to the controller
 * rather than to each route, so a route added tomorrow is covered by default
 * instead of by whoever remembers.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reports: ReportsService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IncomingRequest>();

    const user = request.headers['x-user'];
    if (typeof user !== 'string' || !user.trim()) throw new UnauthorizedException();

    const id = request.params.id;
    // No id in the route: nothing to own yet. The list route narrows by owner.
    if (id === undefined) return true;

    const report = this.reports.findById(Number(id));
    // Leave "no such report" to the handler. A guard that 404s here would be
    // guessing at what the route was looking for.
    if (!report) return true;

    if (report.ownerId !== user) throw new ForbiddenException();
    return true;
  }
}
