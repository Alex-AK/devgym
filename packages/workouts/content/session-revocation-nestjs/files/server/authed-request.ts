import type { User } from './users';

/**
 * The request as the guard and the handlers behind it see it. `auth` is empty
 * until something puts it there.
 */
export interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  auth?: {
    user: User;
    sessionId: string;
  };
}
