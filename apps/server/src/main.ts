import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const PORT = Number(process.env.PORT ?? 3001);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  // Vite proxies /api, but allow direct calls during debugging.
  app.enableCors({ origin: true });
  app.enableShutdownHooks();

  await app.listen(PORT);
  new Logger('Bootstrap').log(`Hone API listening on http://localhost:${PORT}/api`);
}

void bootstrap();
