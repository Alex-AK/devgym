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

/** Reports 1 and 2 are alice's, 3 and 4 are bob's, 5 is carol's. */
describe('nobody reads somebody else"s report', () => {
  it('lets an owner read their own', async () => {
    const response = await request(app.getHttpServer()).get('/reports/1').set(as('alice'));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 1, title: 'Q1 revenue' });
  });

  it('turns down someone else on the same report', async () => {
    const response = await request(app.getHttpServer()).get('/reports/1').set(as('bob'));

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain('Q1 revenue');
  });

  it('turns them down on the export as well', async () => {
    const response = await request(app.getHttpServer()).get('/reports/1/export').set(as('bob'));

    expect(response.status, 'the export route hands out the same data').toBe(403);
    expect(response.text ?? '').not.toContain('Q1 revenue');
  });

  it('lets the owner export their own', async () => {
    const response = await request(app.getHttpServer()).get('/reports/1/export').set(as('alice'));

    expect(response.status).toBe(200);
    expect(response.text).toContain('Q1 revenue');
  });

  it('lists only the caller"s own reports', async () => {
    const response = await request(app.getHttpServer()).get('/reports').set(as('bob'));

    expect(response.status).toBe(200);
    const owners = (response.body as { ownerId: string }[]).map((report) => report.ownerId);
    expect([...new Set(owners)], 'the list is handing out everybody"s reports').toEqual(['bob']);
  });

  it('gives each caller a different list', async () => {
    const alice = await request(app.getHttpServer()).get('/reports').set(as('alice'));
    const carol = await request(app.getHttpServer()).get('/reports').set(as('carol'));

    expect((alice.body as unknown[]).length).toBe(2);
    expect((carol.body as unknown[]).length).toBe(1);
  });
});
