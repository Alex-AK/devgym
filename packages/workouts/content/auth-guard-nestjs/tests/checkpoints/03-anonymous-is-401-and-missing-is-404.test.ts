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

const ROUTES: [string, string][] = [
  ['get', '/reports'],
  ['get', '/reports/1'],
  ['get', '/reports/1/export'],
  ['delete', '/reports/1'],
];

describe('anonymous is 401, missing is 404', () => {
  it('refuses every route when nobody says who they are', async () => {
    for (const [method, path] of ROUTES) {
      const response = await (method === 'delete'
        ? request(app.getHttpServer()).delete(path)
        : request(app.getHttpServer()).get(path));

      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  it('refuses a blank user just as firmly', async () => {
    const response = await request(app.getHttpServer()).get('/reports/1').set('X-User', '   ');

    expect(response.status).toBe(401);
  });

  it('answers 404 for a report that does not exist', async () => {
    const response = await request(app.getHttpServer()).get('/reports/999').set('X-User', 'alice');

    expect(response.status).toBe(404);
  });

  it('asks who you are before it looks anything up', async () => {
    const response = await request(app.getHttpServer()).get('/reports/999');

    expect(response.status, 'a stranger should not learn which ids exist').toBe(401);
  });

  it('does not delete anything for an anonymous caller', async () => {
    await request(app.getHttpServer()).delete('/reports/1');

    const owner = await request(app.getHttpServer()).get('/reports/1').set('X-User', 'alice');
    expect(owner.status).toBe(200);
  });
});
