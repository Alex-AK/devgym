import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { ReportsController } from '../../src/server/reports.controller';

/**
 * The only checkpoint here that reads the code rather than the behaviour, and
 * deliberately so: the point of the exercise is where the check lives, not just
 * that it runs today. A guard on the class covers the route somebody adds next
 * month. Four copies of the same `if` do not.
 */
const guardsOn = (target: object): unknown[] =>
  (Reflect.getMetadata('__guards__', target) as unknown[] | undefined) ?? [];

describe('the check lives in one place', () => {
  it('puts a guard on the controller', () => {
    expect(
      guardsOn(ReportsController).length,
      'no guard is applied to the controller as a whole'
    ).toBeGreaterThan(0);
  });

  it('covers routes without each one asking for it', () => {
    const perRoute = ['list', 'get', 'export', 'remove'].filter(
      (route) =>
        guardsOn((ReportsController.prototype as unknown as Record<string, object>)[route] ?? {})
          .length > 0
    );

    expect(
      perRoute,
      'these routes carry their own guard, so a new route would not be covered'
    ).toEqual([]);
  });

  it('leaves the ownership rule out of the handlers', () => {
    const source = ReportsController.prototype.constructor.toString();

    expect(
      /ownerId\s*!==|ownerId\s*!=/.test(source),
      'the controller is still comparing ownerId itself'
    ).toBe(false);
  });
});
