import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/server/app.module';

let app: INestApplication;

beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
}, 60_000);

afterEach(async () => {
  await app?.close();
});

const as = (user: string) => ({ 'X-User': user });

describe('nobody deletes somebody else"s report', () => {
  it('turns down the delete', async () => {
    const response = await request(app.getHttpServer()).delete('/reports/1').set(as('bob'));

    expect(response.status).toBe(403);
  });

  it('and the report is still there afterwards', async () => {
    await request(app.getHttpServer()).delete('/reports/1').set(as('bob'));

    const owner = await request(app.getHttpServer()).get('/reports/1').set(as('alice'));
    expect(owner.status, 'it answered 403 and deleted the report anyway').toBe(200);
  });

  it('still lets the owner delete their own', async () => {
    const response = await request(app.getHttpServer()).delete('/reports/2').set(as('alice'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deleted: true });
  });

  it('and that one is really gone', async () => {
    await request(app.getHttpServer()).delete('/reports/2').set(as('alice'));

    const after = await request(app.getHttpServer()).get('/reports/2').set(as('alice'));
    expect(after.status).toBe(404);
  });

  it('checks before doing anything, not after', async () => {
    // Bob is refused on carol's report, so it is still hers afterwards.
    await request(app.getHttpServer()).delete('/reports/5').set(as('bob'));

    const carol = await request(app.getHttpServer()).get('/reports/5').set(as('carol'));
    expect(carol.status, 'the refusal happened after the row was already gone').toBe(200);
  });
});
