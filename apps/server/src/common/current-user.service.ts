import { Injectable } from '@nestjs/common';

import { LOCAL_USER_ID } from '../seed/seed';

/**
 * v1 has no auth: every request is the single local user. The schema is
 * auth-ready, so adding real auth means replacing only this service.
 */
@Injectable()
export class CurrentUserService {
  getUserId(): number {
    return LOCAL_USER_ID;
  }
}
