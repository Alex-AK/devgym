import 'reflect-metadata';

import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { expect } from 'vitest';

import { AppModule } from '../../src/server/app.module';

/** Declared here rather than imported: the tests do not read editable files. */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface Harness {
  app: INestApplication;
  server: Server;
}

export const NADIA = { email: 'nadia@example.com', password: 'correct-horse' };
export const RAF = { email: 'raf@example.com', password: 'battery-staple' };

/**
 * A fresh app per test, because sessions are the thing under test and they
 * accumulate. The store keeps its tables in memory, so a new module is a new
 * empty database.
 *
 * One listener for the test rather than one per request: supertest binds a fresh
 * ephemeral port every time it is handed something that is not already listening.
 */
export async function boot(): Promise<Harness> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  const server = (await app.listen(0)) as Server;

  return { app, server };
}

export const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export async function login(server: Server, who = NADIA): Promise<Tokens> {
  const response = await request(server).post('/auth/login').send(who);
  expect(response.status, 'logging in is the half that already works, and it did not').toBe(200);

  return response.body as Tokens;
}

export const refresh = (server: Server, refreshToken: string) =>
  request(server).post('/auth/refresh').send({ refreshToken });

export const logout = (server: Server, refreshToken: string) =>
  request(server).post('/auth/logout').send({ refreshToken });

export const logoutEverywhere = (server: Server, accessToken: string) =>
  request(server).post('/auth/logout-everywhere').set(bearer(accessToken)).send({});

export const me = (server: Server, accessToken: string) =>
  request(server).get('/me').set(bearer(accessToken));
